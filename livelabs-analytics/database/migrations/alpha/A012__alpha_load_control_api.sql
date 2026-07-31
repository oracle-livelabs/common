-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-012
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: add a small load-control API for future WMS jobs and approved manual changes.

whenever sqlerror exit sql.sqlcode rollback

create or replace package CODEX_STAGE.PKG_ALPHA_LOAD_CONTROL authid definer as
  procedure start_batch(
    p_loader_version in varchar2,
    p_source_root in varchar2,
    p_load_mode in varchar2,
    p_source_manifest_json in clob default null,
    p_notes in clob default null,
    p_batch_id out number
  );

  procedure set_batch_status(
    p_batch_id in number,
    p_load_status in varchar2,
    p_notes in clob default null
  );

  procedure start_integration_run(
    p_batch_id in number,
    p_source_system_code in varchar2,
    p_trigger_type in varchar2,
    p_load_mode in varchar2,
    p_source_watermark in varchar2 default null,
    p_source_object_uri in varchar2 default null,
    p_run_manifest_json in clob default null,
    p_integration_run_id out number
  );

  procedure finish_integration_run(
    p_integration_run_id in number,
    p_run_status in varchar2,
    p_rows_read in number default null,
    p_rows_staged in number default null,
    p_rows_rejected in number default null,
    p_rows_merged in number default null,
    p_error_message in varchar2 default null
  );

  procedure advance_watermark(
    p_source_system_code in varchar2,
    p_watermark_name in varchar2,
    p_watermark_value in varchar2,
    p_batch_id in number,
    p_integration_run_id in number,
    p_notes in clob default null
  );

  procedure submit_manual_change(
    p_target_entity in varchar2,
    p_natural_key_json in clob,
    p_patch_json in clob,
    p_overwrite_policy in varchar2 default 'REVIEW_REQUIRED',
    p_request_note in clob default null,
    p_manual_request_id out number
  );
end PKG_ALPHA_LOAD_CONTROL;
/

create or replace package body CODEX_STAGE.PKG_ALPHA_LOAD_CONTROL as
  procedure start_batch(
    p_loader_version in varchar2,
    p_source_root in varchar2,
    p_load_mode in varchar2,
    p_source_manifest_json in clob default null,
    p_notes in clob default null,
    p_batch_id out number
  ) is
  begin
    insert into CODEX_STAGE.LOAD_BATCH (
      loader_version,
      source_root,
      load_mode,
      load_status,
      source_manifest_json,
      notes
    ) values (
      p_loader_version,
      p_source_root,
      p_load_mode,
      'REQUESTED',
      p_source_manifest_json,
      p_notes
    )
    returning batch_id into p_batch_id;
  end start_batch;

  procedure set_batch_status(
    p_batch_id in number,
    p_load_status in varchar2,
    p_notes in clob default null
  ) is
  begin
    update CODEX_STAGE.LOAD_BATCH
    set load_status = p_load_status,
        completed_at = case when p_load_status in ('COMPLETED', 'FAILED', 'SUPERSEDED') then systimestamp else completed_at end,
        notes = case when p_notes is not null then p_notes else notes end
    where batch_id = p_batch_id;

    if sql%rowcount = 0 then
      raise_application_error(-20082, 'Unknown alpha load batch.');
    end if;
  end set_batch_status;

  procedure start_integration_run(
    p_batch_id in number,
    p_source_system_code in varchar2,
    p_trigger_type in varchar2,
    p_load_mode in varchar2,
    p_source_watermark in varchar2 default null,
    p_source_object_uri in varchar2 default null,
    p_run_manifest_json in clob default null,
    p_integration_run_id out number
  ) is
  begin
    insert into CODEX_STAGE.INTEGRATION_RUN (
      batch_id,
      source_system_code,
      trigger_type,
      load_mode,
      run_status,
      source_watermark,
      source_object_uri,
      run_manifest_json
    ) values (
      p_batch_id,
      p_source_system_code,
      p_trigger_type,
      p_load_mode,
      'RUNNING',
      p_source_watermark,
      p_source_object_uri,
      p_run_manifest_json
    )
    returning integration_run_id into p_integration_run_id;

    update CODEX_STAGE.LOAD_BATCH
    set load_status = 'RUNNING'
    where batch_id = p_batch_id;
  end start_integration_run;

  procedure finish_integration_run(
    p_integration_run_id in number,
    p_run_status in varchar2,
    p_rows_read in number default null,
    p_rows_staged in number default null,
    p_rows_rejected in number default null,
    p_rows_merged in number default null,
    p_error_message in varchar2 default null
  ) is
    v_batch_id number;
  begin
    update CODEX_STAGE.INTEGRATION_RUN
    set run_status = p_run_status,
        rows_read = p_rows_read,
        rows_staged = p_rows_staged,
        rows_rejected = p_rows_rejected,
        rows_merged = p_rows_merged,
        error_message = p_error_message,
        ended_at = systimestamp
    where integration_run_id = p_integration_run_id
    returning batch_id into v_batch_id;

    if sql%rowcount = 0 then
      raise_application_error(-20083, 'Unknown alpha integration run.');
    end if;

    if p_run_status = 'COMPLETED' then
      set_batch_status(v_batch_id, 'COMPLETED');
    elsif p_run_status = 'FAILED' then
      set_batch_status(v_batch_id, 'FAILED', p_error_message);
    end if;
  end finish_integration_run;

  procedure advance_watermark(
    p_source_system_code in varchar2,
    p_watermark_name in varchar2,
    p_watermark_value in varchar2,
    p_batch_id in number,
    p_integration_run_id in number,
    p_notes in clob default null
  ) is
  begin
    merge into CODEX_STAGE.INTEGRATION_WATERMARK t
    using (
      select p_source_system_code source_system_code,
             p_watermark_name watermark_name,
             p_watermark_value watermark_value,
             p_batch_id batch_id,
             p_integration_run_id integration_run_id,
             p_notes notes
      from dual
    ) s
    on (
      t.source_system_code = s.source_system_code
      and t.watermark_name = s.watermark_name
    )
    when matched then
      update set t.watermark_value = s.watermark_value,
                 t.last_success_batch_id = s.batch_id,
                 t.last_success_run_id = s.integration_run_id,
                 t.last_success_at = systimestamp,
                 t.updated_at = systimestamp,
                 t.notes = s.notes
    when not matched then
      insert (
        source_system_code,
        watermark_name,
        watermark_value,
        last_success_batch_id,
        last_success_run_id,
        last_success_at,
        notes
      )
      values (
        s.source_system_code,
        s.watermark_name,
        s.watermark_value,
        s.batch_id,
        s.integration_run_id,
        systimestamp,
        s.notes
      );
  end advance_watermark;

  procedure submit_manual_change(
    p_target_entity in varchar2,
    p_natural_key_json in clob,
    p_patch_json in clob,
    p_overwrite_policy in varchar2 default 'REVIEW_REQUIRED',
    p_request_note in clob default null,
    p_manual_request_id out number
  ) is
    v_request_hash varchar2(64);
  begin
    v_request_hash := rawtohex(standard_hash(
      p_target_entity
      || ':'
      || dbms_lob.substr(p_natural_key_json, 4000, 1)
      || ':'
      || dbms_lob.substr(p_patch_json, 4000, 1),
      'SHA256'
    ));

    insert into CODEX_STAGE.MANUAL_CHANGE_REQUEST (
      target_entity,
      natural_key_json,
      patch_json,
      request_hash_sha256,
      overwrite_policy,
      request_status,
      request_note
    ) values (
      p_target_entity,
      p_natural_key_json,
      p_patch_json,
      v_request_hash,
      p_overwrite_policy,
      'SUBMITTED',
      p_request_note
    )
    returning manual_request_id into p_manual_request_id;
  end submit_manual_change;
end PKG_ALPHA_LOAD_CONTROL;
/

grant execute on CODEX_STAGE.PKG_ALPHA_LOAD_CONTROL to CODEX_ETL_RUNNER;

merge into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG t
using (
  select 'ALPHA-012' alpha_change_id,
         'ALPHA' release_channel,
         'load control API' change_name,
         'ALPHA_APPLIED' change_state,
         'Adds package entry points to create load batches, track WMS/manual integration runs, advance watermarks, and submit manual changes.' notes
  from dual
) s
on (t.alpha_change_id = s.alpha_change_id)
when matched then
  update set t.change_name = s.change_name,
             t.change_state = s.change_state,
             t.notes = s.notes
when not matched then
  insert (
    alpha_change_id,
    release_channel,
    change_name,
    change_state,
    notes
  )
  values (
    s.alpha_change_id,
    s.release_channel,
    s.change_name,
    s.change_state,
    s.notes
  );

commit;

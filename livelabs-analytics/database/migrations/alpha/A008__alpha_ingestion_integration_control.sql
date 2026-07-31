-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-008
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: add manual-load, WMS-integration, overwrite, and merge-control metadata.

whenever sqlerror exit sql.sqlcode rollback

declare
  procedure exec_ddl(p_sql in varchar2, p_ignore_code in number default null) is
  begin
    execute immediate p_sql;
  exception
    when others then
      if p_ignore_code is null or sqlcode != p_ignore_code then
        raise;
      end if;
  end;
begin
  exec_ddl(q'[
    create table CODEX_STAGE.SOURCE_SYSTEM (
      source_system_code varchar2(80) not null,
      source_system_name varchar2(200) not null,
      source_category varchar2(40) not null,
      default_precedence number(4) not null,
      is_authoritative char(1) default 'N' not null,
      is_enabled char(1) default 'Y' not null,
      owner_notes clob,
      created_at timestamp default systimestamp not null,
      updated_at timestamp default systimestamp not null,
      constraint pk_source_system primary key (source_system_code),
      constraint ck_source_system_category check (
        source_category in ('MANUAL', 'WMS', 'DASHBOARD', 'REPO', 'CONFLUENCE', 'CHAT', 'EXPORT', 'SYSTEM')
      ),
      constraint ck_source_system_auth check (is_authoritative in ('Y', 'N')),
      constraint ck_source_system_enabled check (is_enabled in ('Y', 'N'))
    )
  ]', -955);

  exec_ddl(q'[
    create table CODEX_STAGE.SOURCE_PRIORITY_RULE (
      priority_rule_id number generated always as identity,
      target_entity varchar2(80) not null,
      source_system_code varchar2(80) not null,
      precedence_rank number(4) not null,
      overwrite_policy varchar2(40) not null,
      conflict_policy varchar2(40) default 'REVIEW_REQUIRED' not null,
      is_enabled char(1) default 'Y' not null,
      effective_from_at timestamp default systimestamp not null,
      effective_to_at timestamp,
      rule_notes clob,
      constraint pk_source_priority_rule primary key (priority_rule_id),
      constraint fk_priority_source_system foreign key (source_system_code)
        references CODEX_STAGE.SOURCE_SYSTEM (source_system_code),
      constraint ck_priority_entity check (
        target_entity in (
          'CONTENT_IDENTITY',
          'WORKSHOP_METADATA',
          'DEMAND_METRIC',
          'REPO_EVIDENCE',
          'REPLACEMENT_CANDIDATE',
          'GOVERNANCE_DECISION',
          'SEARCH_DOCUMENT',
          'EXPORT_METADATA'
        )
      ),
      constraint ck_priority_overwrite check (
        overwrite_policy in ('SOURCE_WINS', 'MANUAL_WINS', 'NEWER_SNAPSHOT_WINS', 'NO_OVERWRITE', 'REVIEW_REQUIRED')
      ),
      constraint ck_priority_conflict check (
        conflict_policy in ('AUTO_APPLY', 'REVIEW_REQUIRED', 'REJECT_ON_CONFLICT')
      ),
      constraint ck_priority_enabled check (is_enabled in ('Y', 'N'))
    )
  ]', -955);

  exec_ddl(q'[
    create table CODEX_STAGE.INTEGRATION_RUN (
      integration_run_id number generated always as identity,
      batch_id number not null,
      source_system_code varchar2(80) not null,
      trigger_type varchar2(40) not null,
      load_mode varchar2(50) not null,
      run_status varchar2(40) default 'REQUESTED' not null,
      source_watermark varchar2(500),
      source_cursor varchar2(1000),
      source_etag varchar2(500),
      source_object_uri varchar2(1500),
      rows_read number,
      rows_staged number,
      rows_rejected number,
      rows_merged number,
      started_at timestamp default systimestamp not null,
      ended_at timestamp,
      requested_by varchar2(128) default sys_context('USERENV', 'SESSION_USER') not null,
      run_manifest_json clob,
      error_message varchar2(2000),
      constraint pk_integration_run primary key (integration_run_id),
      constraint fk_integration_run_batch foreign key (batch_id)
        references CODEX_STAGE.LOAD_BATCH (batch_id),
      constraint fk_integration_run_source foreign key (source_system_code)
        references CODEX_STAGE.SOURCE_SYSTEM (source_system_code),
      constraint ck_integration_trigger check (
        trigger_type in ('MANUAL_UPLOAD', 'MANUAL_PATCH', 'WMS_SCHEDULED', 'WMS_ON_DEMAND', 'SCRIPTED_BACKFILL', 'VALIDATION_ONLY')
      ),
      constraint ck_integration_load_mode check (
        load_mode in ('FULL_SNAPSHOT', 'DELTA', 'MANUAL_PATCH', 'REPLAY', 'VALIDATION_ONLY')
      ),
      constraint ck_integration_status check (
        run_status in ('REQUESTED', 'RUNNING', 'STAGED', 'MERGING', 'COMPLETED', 'FAILED', 'CANCELLED')
      ),
      constraint ck_integration_manifest_json check (run_manifest_json is json)
    )
  ]', -955);

  exec_ddl(q'[
    create table CODEX_STAGE.INTEGRATION_WATERMARK (
      watermark_id number generated always as identity,
      source_system_code varchar2(80) not null,
      watermark_name varchar2(120) not null,
      watermark_value varchar2(1000),
      last_success_batch_id number,
      last_success_run_id number,
      last_success_at timestamp,
      updated_at timestamp default systimestamp not null,
      notes clob,
      constraint pk_integration_watermark primary key (watermark_id),
      constraint uq_integration_watermark unique (source_system_code, watermark_name),
      constraint fk_watermark_source foreign key (source_system_code)
        references CODEX_STAGE.SOURCE_SYSTEM (source_system_code),
      constraint fk_watermark_batch foreign key (last_success_batch_id)
        references CODEX_STAGE.LOAD_BATCH (batch_id),
      constraint fk_watermark_run foreign key (last_success_run_id)
        references CODEX_STAGE.INTEGRATION_RUN (integration_run_id)
    )
  ]', -955);

  exec_ddl(q'[
    create table CODEX_STAGE.MANUAL_CHANGE_REQUEST (
      manual_request_id number generated always as identity,
      batch_id number,
      source_system_code varchar2(80) default 'MANUAL_ADMIN' not null,
      target_entity varchar2(80) not null,
      natural_key_json clob not null,
      patch_json clob not null,
      request_hash_sha256 varchar2(64) not null,
      overwrite_policy varchar2(40) default 'REVIEW_REQUIRED' not null,
      request_status varchar2(40) default 'DRAFT' not null,
      requested_by varchar2(128) default sys_context('USERENV', 'SESSION_USER') not null,
      requested_at timestamp default systimestamp not null,
      approved_by varchar2(128),
      approved_at timestamp,
      applied_by varchar2(128),
      applied_at timestamp,
      superseded_by_request_id number,
      request_note clob,
      constraint pk_manual_change_request primary key (manual_request_id),
      constraint uq_manual_change_hash unique (request_hash_sha256),
      constraint fk_manual_change_batch foreign key (batch_id)
        references CODEX_STAGE.LOAD_BATCH (batch_id),
      constraint fk_manual_change_source foreign key (source_system_code)
        references CODEX_STAGE.SOURCE_SYSTEM (source_system_code),
      constraint fk_manual_change_superseded foreign key (superseded_by_request_id)
        references CODEX_STAGE.MANUAL_CHANGE_REQUEST (manual_request_id),
      constraint ck_manual_change_entity check (
        target_entity in (
          'CONTENT_IDENTITY',
          'WORKSHOP_METADATA',
          'DEMAND_METRIC',
          'REPO_EVIDENCE',
          'REPLACEMENT_CANDIDATE',
          'GOVERNANCE_DECISION',
          'SEARCH_DOCUMENT'
        )
      ),
      constraint ck_manual_change_policy check (
        overwrite_policy in ('MANUAL_WINS', 'NEWER_SNAPSHOT_WINS', 'NO_OVERWRITE', 'REVIEW_REQUIRED')
      ),
      constraint ck_manual_change_status check (
        request_status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'APPLIED', 'SUPERSEDED', 'FAILED')
      ),
      constraint ck_manual_change_key_json check (natural_key_json is json),
      constraint ck_manual_change_patch_json check (patch_json is json),
      constraint ck_manual_change_hash_len check (length(request_hash_sha256) = 64)
    )
  ]', -955);

  exec_ddl(q'[
    create table CODEX_ANALYTICS.CURATED_MERGE_ACTION (
      merge_action_id number generated always as identity,
      batch_id number not null,
      integration_run_id number,
      manual_request_id number,
      target_entity varchar2(80) not null,
      target_object_name varchar2(128) not null,
      natural_key varchar2(500) not null,
      content_key number,
      source_system_code varchar2(80) not null,
      merge_action varchar2(40) not null,
      overwrite_policy varchar2(40) not null,
      conflict_status varchar2(40) default 'NO_CONFLICT' not null,
      source_hash_sha256 varchar2(64),
      target_hash_before_sha256 varchar2(64),
      target_hash_after_sha256 varchar2(64),
      changed_columns_json clob,
      action_note clob,
      applied_at timestamp default systimestamp not null,
      constraint pk_curated_merge_action primary key (merge_action_id),
      constraint fk_merge_action_batch foreign key (batch_id)
        references CODEX_STAGE.LOAD_BATCH (batch_id),
      constraint fk_merge_action_run foreign key (integration_run_id)
        references CODEX_STAGE.INTEGRATION_RUN (integration_run_id),
      constraint fk_merge_action_manual foreign key (manual_request_id)
        references CODEX_STAGE.MANUAL_CHANGE_REQUEST (manual_request_id),
      constraint fk_merge_action_content foreign key (content_key)
        references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
      constraint fk_merge_action_source foreign key (source_system_code)
        references CODEX_STAGE.SOURCE_SYSTEM (source_system_code),
      constraint ck_merge_action_target check (
        target_entity in (
          'CONTENT_IDENTITY',
          'WORKSHOP_METADATA',
          'DEMAND_METRIC',
          'REPO_EVIDENCE',
          'REPLACEMENT_CANDIDATE',
          'GOVERNANCE_DECISION',
          'SEARCH_DOCUMENT',
          'EXPORT_METADATA'
        )
      ),
      constraint ck_merge_action_kind check (
        merge_action in ('INSERT', 'UPDATE', 'NO_CHANGE', 'SUPERSEDE', 'REJECT', 'DELETE_CANDIDATE')
      ),
      constraint ck_merge_action_policy check (
        overwrite_policy in ('SOURCE_WINS', 'MANUAL_WINS', 'NEWER_SNAPSHOT_WINS', 'NO_OVERWRITE', 'REVIEW_REQUIRED')
      ),
      constraint ck_merge_conflict_status check (
        conflict_status in ('NO_CONFLICT', 'OPEN', 'REVIEW_REQUIRED', 'RESOLVED', 'REJECTED')
      ),
      constraint ck_merge_changed_json check (changed_columns_json is json)
    )
  ]', -955);

  exec_ddl(q'[
    create table CODEX_ANALYTICS.CONTENT_CHANGE_HISTORY (
      content_change_id number generated always as identity,
      batch_id number not null,
      integration_run_id number,
      manual_request_id number,
      content_key number,
      target_entity varchar2(80) not null,
      natural_key varchar2(500) not null,
      change_kind varchar2(40) not null,
      source_system_code varchar2(80) not null,
      payload_before_json clob,
      payload_after_json clob,
      payload_before_hash_sha256 varchar2(64),
      payload_after_hash_sha256 varchar2(64),
      valid_from_at timestamp default systimestamp not null,
      valid_to_at timestamp,
      is_current char(1) default 'Y' not null,
      created_at timestamp default systimestamp not null,
      constraint pk_content_change_history primary key (content_change_id),
      constraint fk_content_change_batch foreign key (batch_id)
        references CODEX_STAGE.LOAD_BATCH (batch_id),
      constraint fk_content_change_run foreign key (integration_run_id)
        references CODEX_STAGE.INTEGRATION_RUN (integration_run_id),
      constraint fk_content_change_manual foreign key (manual_request_id)
        references CODEX_STAGE.MANUAL_CHANGE_REQUEST (manual_request_id),
      constraint fk_content_change_content foreign key (content_key)
        references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
      constraint fk_content_change_source foreign key (source_system_code)
        references CODEX_STAGE.SOURCE_SYSTEM (source_system_code),
      constraint ck_content_change_entity check (
        target_entity in (
          'CONTENT_IDENTITY',
          'WORKSHOP_METADATA',
          'DEMAND_METRIC',
          'REPO_EVIDENCE',
          'REPLACEMENT_CANDIDATE',
          'GOVERNANCE_DECISION',
          'SEARCH_DOCUMENT',
          'EXPORT_METADATA'
        )
      ),
      constraint ck_content_change_kind check (
        change_kind in ('INSERT', 'UPDATE', 'MANUAL_OVERRIDE', 'WMS_UPDATE', 'SUPERSEDE', 'NO_CHANGE')
      ),
      constraint ck_content_change_current check (is_current in ('Y', 'N')),
      constraint ck_content_before_json check (payload_before_json is json),
      constraint ck_content_after_json check (payload_after_json is json)
    )
  ]', -955);

  exec_ddl('create index CODEX_STAGE.IX_SOURCE_PRIORITY_ENTITY on CODEX_STAGE.SOURCE_PRIORITY_RULE (target_entity, is_enabled, precedence_rank)', -955);
  exec_ddl(q'[
    create unique index CODEX_STAGE.UQ_SOURCE_PRIORITY_CURRENT
      on CODEX_STAGE.SOURCE_PRIORITY_RULE (
        target_entity,
        source_system_code,
        case when effective_to_at is null then 'Y' end
      )
  ]', -955);
  exec_ddl('create index CODEX_STAGE.IX_INTEGRATION_RUN_BATCH on CODEX_STAGE.INTEGRATION_RUN (batch_id, run_status)', -955);
  exec_ddl('create index CODEX_STAGE.IX_INTEGRATION_RUN_SOURCE on CODEX_STAGE.INTEGRATION_RUN (source_system_code, run_status, started_at)', -955);
  exec_ddl('create index CODEX_STAGE.IX_MANUAL_CHANGE_STATUS on CODEX_STAGE.MANUAL_CHANGE_REQUEST (request_status, target_entity, requested_at)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_MERGE_ACTION_BATCH on CODEX_ANALYTICS.CURATED_MERGE_ACTION (batch_id, target_entity, conflict_status)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_MERGE_ACTION_NKEY on CODEX_ANALYTICS.CURATED_MERGE_ACTION (target_entity, natural_key)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_CONTENT_CHANGE_CURRENT on CODEX_ANALYTICS.CONTENT_CHANGE_HISTORY (target_entity, natural_key, is_current)', -955);
  exec_ddl(q'[
    create unique index CODEX_ANALYTICS.UQ_CONTENT_CHANGE_CURRENT
      on CODEX_ANALYTICS.CONTENT_CHANGE_HISTORY (
        target_entity,
        natural_key,
        case when is_current = 'Y' then 'Y' end
      )
  ]', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_CONTENT_CHANGE_CONTENT on CODEX_ANALYTICS.CONTENT_CHANGE_HISTORY (content_key, valid_from_at)', -955);
end;
/

merge into CODEX_STAGE.SOURCE_SYSTEM t
using (
  select 'MANUAL_ADMIN' source_system_code, 'Approved manual administrator changes' source_system_name, 'MANUAL' source_category, 100 default_precedence, 'Y' is_authoritative from dual union all
  select 'WMS_SANDBOX_REPORT', 'WMS LiveLabs Sandbox Report', 'WMS', 90, 'Y' from dual union all
  select 'WMS_ALL_WORKSHOPS', 'WMS All Workshops Report backfill', 'WMS', 80, 'Y' from dual union all
  select 'DASHBOARD_VIEWS', 'LiveLabs dashboard view exports', 'DASHBOARD', 70, 'Y' from dual union all
  select 'LOCAL_REPO_EVIDENCE', 'Local or live repository update evidence', 'REPO', 50, 'N' from dual union all
  select 'CONFLUENCE_GOVERNANCE', 'Confluence governance rule source', 'CONFLUENCE', 40, 'N' from dual union all
  select 'ORACLE_CHAT_EXPORT', 'Oracle chat rationale export', 'CHAT', 20, 'N' from dual
) s
on (t.source_system_code = s.source_system_code)
when matched then
  update set t.source_system_name = s.source_system_name,
             t.source_category = s.source_category,
             t.default_precedence = s.default_precedence,
             t.is_authoritative = s.is_authoritative,
             t.is_enabled = 'Y',
             t.updated_at = systimestamp
when not matched then
  insert (
    source_system_code,
    source_system_name,
    source_category,
    default_precedence,
    is_authoritative
  )
  values (
    s.source_system_code,
    s.source_system_name,
    s.source_category,
    s.default_precedence,
    s.is_authoritative
  );

merge into CODEX_STAGE.SOURCE_PRIORITY_RULE t
using (
  select 'WORKSHOP_METADATA' target_entity, 'MANUAL_ADMIN' source_system_code, 100 precedence_rank, 'MANUAL_WINS' overwrite_policy, 'REVIEW_REQUIRED' conflict_policy from dual union all
  select 'WORKSHOP_METADATA', 'WMS_SANDBOX_REPORT', 90, 'NEWER_SNAPSHOT_WINS', 'REVIEW_REQUIRED' from dual union all
  select 'WORKSHOP_METADATA', 'WMS_ALL_WORKSHOPS', 80, 'NEWER_SNAPSHOT_WINS', 'REVIEW_REQUIRED' from dual union all
  select 'CONTENT_IDENTITY', 'MANUAL_ADMIN', 100, 'MANUAL_WINS', 'REVIEW_REQUIRED' from dual union all
  select 'CONTENT_IDENTITY', 'WMS_SANDBOX_REPORT', 90, 'NEWER_SNAPSHOT_WINS', 'REVIEW_REQUIRED' from dual union all
  select 'DEMAND_METRIC', 'DASHBOARD_VIEWS', 90, 'NEWER_SNAPSHOT_WINS', 'AUTO_APPLY' from dual union all
  select 'REPO_EVIDENCE', 'LOCAL_REPO_EVIDENCE', 70, 'NEWER_SNAPSHOT_WINS', 'AUTO_APPLY' from dual union all
  select 'GOVERNANCE_DECISION', 'CONFLUENCE_GOVERNANCE', 70, 'REVIEW_REQUIRED', 'REVIEW_REQUIRED' from dual union all
  select 'SEARCH_DOCUMENT', 'MANUAL_ADMIN', 100, 'MANUAL_WINS', 'REVIEW_REQUIRED' from dual
) s
on (
  t.target_entity = s.target_entity
  and t.source_system_code = s.source_system_code
  and t.effective_to_at is null
)
when matched then
  update set t.precedence_rank = s.precedence_rank,
             t.overwrite_policy = s.overwrite_policy,
             t.conflict_policy = s.conflict_policy,
             t.is_enabled = 'Y'
when not matched then
  insert (
    target_entity,
    source_system_code,
    precedence_rank,
    overwrite_policy,
    conflict_policy
  )
  values (
    s.target_entity,
    s.source_system_code,
    s.precedence_rank,
    s.overwrite_policy,
    s.conflict_policy
  );

merge into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG t
using (
  select 'ALPHA-008' alpha_change_id,
         'ALPHA' release_channel,
         'ingestion integration control' change_name,
         'ALPHA_APPLIED' change_state,
         'Adds source registry, WMS/manual integration runs, watermarks, manual change queue, merge actions, and curated change history.' notes
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

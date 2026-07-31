-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-010
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: add Oracle Text search index and targeted ADB reporting indexes.

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
    create index CODEX_ANALYTICS.IX_SEARCH_DOC_TEXT_CTX
      on CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT (search_text)
      indextype is CTXSYS.CONTEXT
      parameters ('sync (on commit)')
  ]', -955);

  exec_ddl('create index CODEX_ANALYTICS.IX_DIM_CONTENT_CURRENT_KIND on CODEX_ANALYTICS.DIM_CONTENT_ITEM (is_current, content_kind, wms_id, livelabs_id)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_FACT_SNAPSHOT_BATCH_DATE on CODEX_ANALYTICS.FACT_WORKSHOP_SNAPSHOT (batch_id, snapshot_date, publish_status, publish_type)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_FACT_DEMAND_DATE_WINDOW on CODEX_ANALYTICS.FACT_DEMAND_METRIC (snapshot_date, time_window, rank_position)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_FACT_REPL_REVIEW_SCORE on CODEX_ANALYTICS.FACT_REPLACEMENT_CANDIDATE (content_key, review_status, replacement_similarity_score)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_FACT_GOV_CONTENT_RULE on CODEX_ANALYTICS.FACT_GOVERNANCE_DECISION (content_key, rule_version, created_at)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_SEARCH_DOC_SCOPE_TYPE on CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT (visibility_scope, doc_type, content_key)', -955);
  exec_ddl('create index CODEX_ANALYTICS.IX_EXPORT_OBJECT_CURRENT on CODEX_ANALYTICS.EXPORT_OBJECT (is_current_candidate, validation_status, generated_at)', -955);
end;
/

merge into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG t
using (
  select 'ALPHA-010' alpha_change_id,
         'ALPHA' release_channel,
         'search and performance indexes' change_name,
         'ALPHA_APPLIED' change_state,
         'Adds Oracle Text support for approved search documents and targeted B-tree indexes for current snapshots, demand ranking, governance, and exports.' notes
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


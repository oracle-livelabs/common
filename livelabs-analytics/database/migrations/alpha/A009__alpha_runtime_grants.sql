-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-009
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: add direct runtime grants for ETL, Object Storage export, and optional ORDS reads.

whenever sqlerror exit sql.sqlcode rollback

grant select on CODEX_STAGE.SOURCE_SYSTEM to CODEX_ANALYTICS_READ;
grant select on CODEX_STAGE.SOURCE_PRIORITY_RULE to CODEX_ANALYTICS_READ;
grant select on CODEX_STAGE.INTEGRATION_RUN to CODEX_ANALYTICS_READ;
grant select on CODEX_STAGE.INTEGRATION_WATERMARK to CODEX_ANALYTICS_READ;
grant select on CODEX_STAGE.MANUAL_CHANGE_REQUEST to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.CURATED_MERGE_ACTION to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.CONTENT_CHANGE_HISTORY to CODEX_ANALYTICS_READ;

grant select, insert, update on CODEX_STAGE.LOAD_BATCH to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_STAGE.DATASET_FILE to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_STAGE.LOAD_REJECT to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_STAGE.SOURCE_SYSTEM to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_STAGE.SOURCE_PRIORITY_RULE to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_STAGE.INTEGRATION_RUN to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_STAGE.INTEGRATION_WATERMARK to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_STAGE.MANUAL_CHANGE_REQUEST to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.CURATED_MERGE_ACTION to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.CONTENT_CHANGE_HISTORY to CODEX_ETL_RUNNER;

grant select on CODEX_ANALYTICS.V_WORKSHOP_CURRENT to CODEX_APP;
grant select on CODEX_ANALYTICS.V_DEMAND_RANKING to CODEX_APP;
grant select on CODEX_ANALYTICS.V_PORTFOLIO_INVENTORY_EXPORT to CODEX_APP;
grant select on CODEX_ANALYTICS.V_FULL_CONTENT_SEARCH_EXPORT to CODEX_APP;
grant select on CODEX_ANALYTICS.V_GOVERNANCE_DECISION_EXPORT to CODEX_APP;
grant select on CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT to CODEX_APP;
grant select on CODEX_ANALYTICS.DIM_CONTENT_ITEM to CODEX_APP;
grant CODEX_ORDS_READ to CODEX_APP;

grant select on CODEX_ANALYTICS.EXPORT_BATCH to CODEX_EXPORT_RUNNER;
grant select on CODEX_ANALYTICS.EXPORT_OBJECT to CODEX_EXPORT_RUNNER;
grant select on CODEX_ANALYTICS.V_WORKSHOP_CURRENT to CODEX_EXPORT_RUNNER;
grant select on CODEX_ANALYTICS.V_DEMAND_RANKING to CODEX_EXPORT_RUNNER;
grant select on CODEX_ANALYTICS.V_PORTFOLIO_INVENTORY_EXPORT to CODEX_EXPORT_RUNNER;
grant select on CODEX_ANALYTICS.V_FULL_CONTENT_SEARCH_EXPORT to CODEX_EXPORT_RUNNER;
grant select on CODEX_ANALYTICS.V_GOVERNANCE_DECISION_EXPORT to CODEX_EXPORT_RUNNER;

merge into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG t
using (
  select 'ALPHA-009' alpha_change_id,
         'ALPHA' release_channel,
         'runtime grants' change_name,
         'ALPHA_APPLIED' change_state,
         'Adds direct least-privilege grants for ETL, export, and optional ORDS read paths.' notes
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


-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-011
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: add DBA validation views and replacement-family guardrails.

whenever sqlerror exit sql.sqlcode rollback

create or replace view CODEX_ANALYTICS.V_LOAD_BATCH_RECONCILIATION as
select b.batch_id,
       b.release_channel,
       b.loader_version,
       b.load_mode,
       b.load_status,
       b.started_at,
       b.completed_at,
       (select count(*) from CODEX_STAGE.DATASET_FILE f where f.batch_id = b.batch_id) as dataset_file_count,
       (select count(*) from CODEX_STAGE.STG_SANDBOX_REPORT s where s.batch_id = b.batch_id) as stg_sandbox_rows,
       (select count(*) from CODEX_STAGE.STG_WORKSHOP_REPORT w where w.batch_id = b.batch_id) as stg_workshop_rows,
       (select count(*) from CODEX_STAGE.STG_RANK_SECTION r where r.batch_id = b.batch_id) as stg_rank_rows,
       (select count(*) from CODEX_ANALYTICS.FACT_WORKSHOP_SNAPSHOT s where s.batch_id = b.batch_id) as fact_snapshot_rows,
       (select count(*) from CODEX_ANALYTICS.FACT_DEMAND_METRIC d where d.batch_id = b.batch_id) as fact_demand_rows,
       (select count(*) from CODEX_ANALYTICS.CURATED_MERGE_ACTION m where m.batch_id = b.batch_id) as merge_action_rows,
       (select count(*) from CODEX_STAGE.LOAD_REJECT r where r.batch_id = b.batch_id and r.reject_status = 'OPEN') as open_rejects,
       (select count(*) from CODEX_ANALYTICS.CURATED_MERGE_ACTION m where m.batch_id = b.batch_id and m.conflict_status in ('OPEN', 'REVIEW_REQUIRED')) as open_merge_conflicts
from CODEX_STAGE.LOAD_BATCH b;

create or replace view CODEX_ANALYTICS.V_MANUAL_CHANGE_QUEUE as
select m.manual_request_id,
       m.batch_id,
       m.target_entity,
       m.overwrite_policy,
       m.request_status,
       m.requested_by,
       m.requested_at,
       m.approved_by,
       m.approved_at,
       m.applied_by,
       m.applied_at,
       m.superseded_by_request_id
from CODEX_STAGE.MANUAL_CHANGE_REQUEST m
where m.request_status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'FAILED');

create or replace view CODEX_ANALYTICS.V_WMS_INTEGRATION_STATUS as
select s.source_system_code,
       s.source_system_name,
       s.is_enabled,
       w.watermark_name,
       w.watermark_value,
       w.last_success_batch_id,
       w.last_success_run_id,
       w.last_success_at,
       (
         select max(r.started_at)
         from CODEX_STAGE.INTEGRATION_RUN r
         where r.source_system_code = s.source_system_code
       ) as latest_run_started_at,
       (
         select max(r.run_status) keep (dense_rank last order by r.started_at)
         from CODEX_STAGE.INTEGRATION_RUN r
         where r.source_system_code = s.source_system_code
       ) as latest_run_status
from CODEX_STAGE.SOURCE_SYSTEM s
left join CODEX_STAGE.INTEGRATION_WATERMARK w
  on w.source_system_code = s.source_system_code
where s.source_category = 'WMS';

create or replace view CODEX_ANALYTICS.V_MERGE_CONFLICT_QUEUE as
select m.merge_action_id,
       m.batch_id,
       m.integration_run_id,
       m.manual_request_id,
       m.target_entity,
       m.target_object_name,
       m.natural_key,
       m.content_key,
       m.source_system_code,
       m.merge_action,
       m.overwrite_policy,
       m.conflict_status,
       m.applied_at,
       m.action_note
from CODEX_ANALYTICS.CURATED_MERGE_ACTION m
where m.conflict_status in ('OPEN', 'REVIEW_REQUIRED', 'REJECTED');

create or replace view CODEX_ANALYTICS.V_IDENTITY_DUPLICATE_LIVELABS_ID as
select livelabs_id,
       count(*) as current_content_count,
       listagg(identity_key, ', ') within group (order by identity_key) as identity_keys
from CODEX_ANALYTICS.DIM_CONTENT_ITEM
where livelabs_id is not null
  and is_current = 'Y'
group by livelabs_id
having count(*) > 1;

create or replace view CODEX_ANALYTICS.V_IDENTITY_WMS_FAMILY_REVIEW as
select wms_id,
       count(*) as current_content_count,
       count(distinct livelabs_id) as distinct_livelabs_id_count,
       listagg(identity_key, ', ') within group (order by identity_key) as identity_keys
from CODEX_ANALYTICS.DIM_CONTENT_ITEM
where wms_id is not null
  and is_current = 'Y'
group by wms_id
having count(*) > 1;

create or replace view CODEX_ANALYTICS.V_REPLACEMENT_SAME_FAMILY_REVIEW as
select r.replacement_candidate_id,
       r.batch_id,
       r.content_key,
       c.identity_key as source_identity_key,
       c.wms_id as source_wms_id,
       r.candidate_content_key,
       cc.identity_key as candidate_identity_key,
       cc.wms_id as candidate_wms_id,
       r.replacement_similarity_score,
       r.review_status
from CODEX_ANALYTICS.FACT_REPLACEMENT_CANDIDATE r
join CODEX_ANALYTICS.DIM_CONTENT_ITEM c
  on c.content_key = r.content_key
join CODEX_ANALYTICS.DIM_CONTENT_ITEM cc
  on cc.content_key = r.candidate_content_key
where c.wms_id is not null
  and cc.wms_id is not null
  and c.wms_id = cc.wms_id;

create or replace trigger CODEX_ANALYTICS.TRG_REPLACEMENT_NO_SAME_WMS
before insert or update of content_key, candidate_content_key
on CODEX_ANALYTICS.FACT_REPLACEMENT_CANDIDATE
for each row
declare
  v_source_wms number;
  v_candidate_wms number;
begin
  select wms_id
  into v_source_wms
  from CODEX_ANALYTICS.DIM_CONTENT_ITEM
  where content_key = :new.content_key;

  select wms_id
  into v_candidate_wms
  from CODEX_ANALYTICS.DIM_CONTENT_ITEM
  where content_key = :new.candidate_content_key;

  if v_source_wms is not null
     and v_candidate_wms is not null
     and v_source_wms = v_candidate_wms then
    raise_application_error(-20081, 'Alpha replacement candidate cannot use the same WMS family.');
  end if;
exception
  when no_data_found then
    null;
end;
/

grant select on CODEX_ANALYTICS.V_LOAD_BATCH_RECONCILIATION to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_MANUAL_CHANGE_QUEUE to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_WMS_INTEGRATION_STATUS to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_MERGE_CONFLICT_QUEUE to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_IDENTITY_DUPLICATE_LIVELABS_ID to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_IDENTITY_WMS_FAMILY_REVIEW to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_REPLACEMENT_SAME_FAMILY_REVIEW to CODEX_ANALYTICS_READ;

grant select on CODEX_ANALYTICS.V_LOAD_BATCH_RECONCILIATION to CODEX_APP;
grant select on CODEX_ANALYTICS.V_MANUAL_CHANGE_QUEUE to CODEX_APP;
grant select on CODEX_ANALYTICS.V_WMS_INTEGRATION_STATUS to CODEX_APP;
grant select on CODEX_ANALYTICS.V_MERGE_CONFLICT_QUEUE to CODEX_APP;

merge into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG t
using (
  select 'ALPHA-011' alpha_change_id,
         'ALPHA' release_channel,
         'quality validation views' change_name,
         'ALPHA_APPLIED' change_state,
         'Adds DBA review views for batch reconciliation, manual queues, WMS status, merge conflicts, identity duplicates, and same-family replacement guardrails.' notes
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


-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-005
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: create Object Storage JSON export metadata and approved read views.

whenever sqlerror exit sql.sqlcode rollback

create table CODEX_ANALYTICS.EXPORT_BATCH (
  export_batch_id number generated always as identity,
  batch_id number not null,
  release_channel varchar2(20) default 'ALPHA' not null,
  contract_version varchar2(40) not null,
  export_status varchar2(40) default 'ALPHA_REQUESTED' not null,
  object_prefix varchar2(1000),
  generated_at timestamp,
  validated_at timestamp,
  promoted_static_at timestamp,
  validation_report_uri varchar2(1500),
  notes clob,
  created_at timestamp default systimestamp not null,
  constraint pk_export_batch primary key (export_batch_id),
  constraint fk_export_batch_load foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint ck_export_batch_release check (release_channel = 'ALPHA'),
  constraint ck_export_batch_status check (
    export_status in ('ALPHA_REQUESTED', 'ALPHA_GENERATING', 'ALPHA_GENERATED', 'ALPHA_VALIDATED', 'ALPHA_READY_FOR_REVIEW', 'ALPHA_STATIC_PROMOTED', 'ALPHA_FAILED')
  )
);

create table CODEX_ANALYTICS.EXPORT_OBJECT (
  export_object_id number generated always as identity,
  export_batch_id number not null,
  object_key varchar2(1000) not null,
  source_view_name varchar2(128),
  content_type varchar2(120) default 'application/json' not null,
  row_count number,
  byte_size number,
  checksum_sha256 varchar2(64),
  generated_at timestamp default systimestamp not null,
  validation_status varchar2(40) default 'ALPHA_PENDING' not null,
  is_current_candidate char(1) default 'N' not null,
  constraint pk_export_object primary key (export_object_id),
  constraint fk_export_object_batch foreign key (export_batch_id) references CODEX_ANALYTICS.EXPORT_BATCH (export_batch_id),
  constraint uq_export_object_key unique (export_batch_id, object_key),
  constraint ck_export_object_hash check (checksum_sha256 is null or length(checksum_sha256) = 64),
  constraint ck_export_object_validation check (
    validation_status in ('ALPHA_PENDING', 'ALPHA_VALID', 'ALPHA_INVALID', 'ALPHA_SKIPPED')
  ),
  constraint ck_export_object_current check (is_current_candidate in ('Y', 'N'))
);

create or replace view CODEX_ANALYTICS.V_WORKSHOP_CURRENT as
select *
from (
  select c.content_key,
         c.identity_key,
         c.livelabs_id,
         c.wms_id,
         c.workshop_id,
         c.content_kind,
         c.canonical_title,
         c.publish_title,
         c.category,
         c.council,
         c.owner_group,
         c.owner_email,
         c.manager_email,
         s.snapshot_date,
         s.workshop_status,
         s.publish_status,
         s.publish_type,
         s.publish_state_active,
         s.page_views,
         s.page_views_year,
         s.has_tenancy,
         s.has_sandbox,
         s.has_sprint,
         s.has_freesql,
         s.has_production_url,
         row_number() over (
           partition by c.content_key
           order by s.snapshot_date desc nulls last, s.loaded_at desc
         ) as rn
  from CODEX_ANALYTICS.DIM_CONTENT_ITEM c
  left join CODEX_ANALYTICS.FACT_WORKSHOP_SNAPSHOT s
    on s.content_key = c.content_key
)
where rn = 1;

create or replace view CODEX_ANALYTICS.V_DEMAND_RANKING as
select d.fact_demand_id,
       d.content_key,
       c.livelabs_id,
       c.wms_id,
       c.content_kind,
       c.canonical_title,
       d.snapshot_date,
       d.time_window,
       d.views,
       d.rank_position,
       d.file_id
from CODEX_ANALYTICS.FACT_DEMAND_METRIC d
left join CODEX_ANALYTICS.DIM_CONTENT_ITEM c
  on c.content_key = d.content_key;

create or replace view CODEX_ANALYTICS.V_PORTFOLIO_INVENTORY_EXPORT as
select c.content_key,
       c.identity_key as workshop_key,
       c.wms_id,
       c.livelabs_id,
       c.workshop_id,
       c.canonical_title as title,
       c.category,
       c.council,
       c.owner_group,
       c.owner_email,
       c.manager_email,
       c.repo_slug,
       c.workshop_path,
       c.manifest_path,
       v.publish_status,
       v.publish_type,
       v.workshop_status,
       v.snapshot_date
from CODEX_ANALYTICS.DIM_CONTENT_ITEM c
left join CODEX_ANALYTICS.V_WORKSHOP_CURRENT v
  on v.content_key = c.content_key;

create or replace view CODEX_ANALYTICS.V_FULL_CONTENT_SEARCH_EXPORT as
select d.doc_unique_key,
       c.identity_key as workshop_key,
       c.wms_id,
       c.livelabs_id,
       c.content_kind,
       d.doc_type,
       d.title,
       d.search_text,
       d.search_text_hash_sha256,
       d.content_version,
       d.visibility_scope
from CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT d
left join CODEX_ANALYTICS.DIM_CONTENT_ITEM c
  on c.content_key = d.content_key
where d.visibility_scope in ('STATIC_EXPORT_APPROVED', 'EMBEDDING_APPROVED');

create or replace view CODEX_ANALYTICS.V_GOVERNANCE_DECISION_EXPORT as
select g.governance_decision_id,
       c.identity_key as workshop_key,
       c.wms_id,
       c.livelabs_id,
       c.content_kind,
       c.canonical_title as title,
       g.rule_version,
       g.governance_mode,
       g.lifecycle_state,
       g.suggested_action,
       g.retire_score,
       g.best_performer_score,
       g.action_readiness
from CODEX_ANALYTICS.FACT_GOVERNANCE_DECISION g
join CODEX_ANALYTICS.DIM_CONTENT_ITEM c
  on c.content_key = g.content_key;

create index CODEX_ANALYTICS.IX_EXPORT_BATCH_STATUS on CODEX_ANALYTICS.EXPORT_BATCH (release_channel, export_status, created_at);
create index CODEX_ANALYTICS.IX_EXPORT_OBJECT_BATCH on CODEX_ANALYTICS.EXPORT_OBJECT (export_batch_id, validation_status);

grant select on CODEX_ANALYTICS.V_WORKSHOP_CURRENT to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_DEMAND_RANKING to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_PORTFOLIO_INVENTORY_EXPORT to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_FULL_CONTENT_SEARCH_EXPORT to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.V_GOVERNANCE_DECISION_EXPORT to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.EXPORT_BATCH to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.EXPORT_OBJECT to CODEX_ANALYTICS_READ;
grant select, insert, update on CODEX_ANALYTICS.EXPORT_BATCH to CODEX_EXPORT_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.EXPORT_OBJECT to CODEX_EXPORT_RUNNER;

insert into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id,
  release_channel,
  change_name,
  change_state,
  notes
) values (
  'ALPHA-005',
  'ALPHA',
  'export contract and read views',
  'ALPHA_APPLIED',
  'Adds alpha Object Storage export metadata and approved read views for JSON generation.'
);

commit;


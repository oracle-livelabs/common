-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-004
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: create curated warehouse dimensions, facts, and search-document boundary.

whenever sqlerror exit sql.sqlcode rollback

create table CODEX_ANALYTICS.DIM_CONTENT_ITEM (
  content_key number generated always as identity,
  identity_key varchar2(250) not null,
  livelabs_id number,
  wms_id number,
  workshop_id number,
  content_kind varchar2(30) default 'WORKSHOP' not null,
  canonical_title varchar2(600),
  publish_title varchar2(600),
  normalized_title varchar2(800),
  category varchar2(300),
  council varchar2(300),
  stakeholder varchar2(300),
  owner_group varchar2(300),
  owner_email varchar2(300),
  manager_email varchar2(300),
  repo_slug varchar2(300),
  workshop_path varchar2(1200),
  manifest_path varchar2(1200),
  source_confidence varchar2(40),
  first_seen_snapshot date,
  last_seen_snapshot date,
  is_current char(1) default 'Y' not null,
  created_at timestamp default systimestamp not null,
  updated_at timestamp default systimestamp not null,
  constraint pk_dim_content_item primary key (content_key),
  constraint uq_dim_content_identity unique (identity_key),
  constraint ck_dim_content_kind check (content_kind in ('WORKSHOP', 'SPRINT', 'EVENT', 'UNKNOWN')),
  constraint ck_dim_content_current check (is_current in ('Y', 'N'))
);

create table CODEX_ANALYTICS.IDENTITY_REVIEW_EXCEPTION (
  exception_id number generated always as identity,
  batch_id number,
  content_key number,
  exception_type varchar2(80) not null,
  exception_status varchar2(30) default 'OPEN' not null,
  source_value varchar2(1000),
  review_note clob,
  created_at timestamp default systimestamp not null,
  reviewed_at timestamp,
  reviewed_by varchar2(128),
  constraint pk_identity_review_exception primary key (exception_id),
  constraint fk_identity_exception_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_identity_exception_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint ck_identity_exception_status check (exception_status in ('OPEN', 'ACCEPTED', 'FIXED', 'IGNORED'))
);

create table CODEX_ANALYTICS.FACT_WORKSHOP_SNAPSHOT (
  fact_snapshot_id number generated always as identity,
  source_row_hash varchar2(64) not null,
  batch_id number not null,
  file_id number not null,
  source_row_number number,
  content_key number,
  snapshot_date date,
  title varchar2(600),
  workshop_status varchar2(120),
  publish_status varchar2(120),
  publish_type varchar2(120),
  publish_state_active char(1),
  council_area varchar2(300),
  owner_group varchar2(300),
  page_views number,
  page_views_year number,
  completion_date date,
  workshop_time varchar2(120),
  has_tenancy char(1),
  has_sandbox char(1),
  has_sprint char(1),
  has_freesql char(1),
  has_production_url char(1),
  loaded_at timestamp default systimestamp not null,
  constraint pk_fact_workshop_snapshot primary key (fact_snapshot_id),
  constraint uq_fact_snapshot_source_hash unique (source_row_hash),
  constraint fk_fact_snapshot_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_fact_snapshot_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint fk_fact_snapshot_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint ck_fact_snapshot_active check (publish_state_active in ('Y', 'N') or publish_state_active is null),
  constraint ck_fact_snapshot_flags check (
    (has_tenancy in ('Y', 'N') or has_tenancy is null)
    and (has_sandbox in ('Y', 'N') or has_sandbox is null)
    and (has_sprint in ('Y', 'N') or has_sprint is null)
    and (has_freesql in ('Y', 'N') or has_freesql is null)
    and (has_production_url in ('Y', 'N') or has_production_url is null)
  )
);

create table CODEX_ANALYTICS.FACT_DEMAND_METRIC (
  fact_demand_id number generated always as identity,
  source_row_hash varchar2(64) not null,
  batch_id number not null,
  file_id number not null,
  source_row_number number,
  content_key number,
  snapshot_date date,
  time_window varchar2(80) not null,
  workshop_name_raw varchar2(800),
  views number,
  rank_position number,
  loaded_at timestamp default systimestamp not null,
  constraint pk_fact_demand_metric primary key (fact_demand_id),
  constraint uq_fact_demand_source_hash unique (source_row_hash),
  constraint fk_fact_demand_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_fact_demand_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint fk_fact_demand_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint ck_fact_demand_window check (
    time_window in ('recent_views_7d', 'recent_views_14d', 'recent_views_30d', 'recent_views_90d', 'recent_views_180d', 'recent_views_12m', 'all_data')
  )
);

create table CODEX_ANALYTICS.FACT_REPO_EVIDENCE (
  fact_repo_id number generated always as identity,
  batch_id number not null,
  content_key number,
  evidence_source varchar2(60) not null,
  evidence_confidence varchar2(30) not null,
  repo_slug varchar2(300),
  workshop_path varchar2(1200),
  latest_workshop_commit_date date,
  latest_markdown_commit_date date,
  latest_repo_commit_date date,
  first_workshop_file_commit_date date,
  markdown_files_in_manifest number,
  markdown_files_inside_workshop number,
  evidence_json clob,
  created_at timestamp default systimestamp not null,
  constraint pk_fact_repo_evidence primary key (fact_repo_id),
  constraint fk_fact_repo_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_fact_repo_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint ck_fact_repo_confidence check (evidence_confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
  constraint ck_fact_repo_json check (evidence_json is json)
);

create table CODEX_ANALYTICS.FACT_REPLACEMENT_CANDIDATE (
  replacement_candidate_id number generated always as identity,
  batch_id number not null,
  content_key number not null,
  candidate_content_key number not null,
  matching_basis varchar2(120),
  compared_against varchar2(120),
  title_similarity number,
  content_similarity number,
  category_similarity number,
  recency_similarity number,
  level_similarity number,
  replacement_similarity_score number,
  replacement_status varchar2(80),
  review_status varchar2(30) default 'OPEN' not null,
  created_at timestamp default systimestamp not null,
  constraint pk_fact_replacement_candidate primary key (replacement_candidate_id),
  constraint fk_fact_repl_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_fact_repl_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint fk_fact_repl_candidate foreign key (candidate_content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint ck_fact_repl_not_self check (content_key != candidate_content_key),
  constraint ck_fact_repl_review_status check (review_status in ('OPEN', 'CONFIRMED', 'REJECTED', 'NEEDS_OWNER_REVIEW'))
);

create table CODEX_ANALYTICS.FACT_GOVERNANCE_DECISION (
  governance_decision_id number generated always as identity,
  batch_id number not null,
  content_key number not null,
  rule_version varchar2(80) not null,
  governance_mode varchar2(40) not null,
  lifecycle_state varchar2(80),
  suggested_action varchar2(200),
  retire_score number,
  best_performer_score number,
  action_readiness varchar2(80),
  decision_reason clob,
  created_at timestamp default systimestamp not null,
  constraint pk_fact_governance_decision primary key (governance_decision_id),
  constraint fk_fact_gov_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_fact_gov_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint ck_fact_gov_mode check (governance_mode in ('FULL_GOVERNANCE', 'PROVISIONAL', 'DATA_MISSING'))
);

create table CODEX_ANALYTICS.FACT_VIEW_OUTLIER (
  fact_outlier_id number generated always as identity,
  source_row_hash varchar2(64) not null,
  batch_id number not null,
  file_id number not null,
  source_row_number number,
  content_key number,
  snapshot_date date,
  source_file_name varchar2(300),
  workshop_name_raw varchar2(800),
  views number,
  rank_position number,
  outlier_type varchar2(120),
  lower_bound number,
  upper_bound number,
  loaded_at timestamp default systimestamp not null,
  constraint pk_fact_view_outlier primary key (fact_outlier_id),
  constraint uq_fact_outlier_source_hash unique (source_row_hash),
  constraint fk_fact_outlier_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_fact_outlier_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint fk_fact_outlier_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key)
);

create table CODEX_ANALYTICS.FACT_VIEW_STAT (
  fact_stat_id number generated always as identity,
  source_row_hash varchar2(64) not null,
  batch_id number not null,
  file_id number not null,
  source_row_number number,
  snapshot_date date,
  source_file_name varchar2(300),
  records number,
  mean_average number,
  median number,
  variance number,
  standard_deviation number,
  q1 number,
  q3 number,
  iqr number,
  skewness number,
  lower_outlier_bound number,
  upper_outlier_bound number,
  low_outlier_count number,
  high_outlier_count number,
  total_outlier_count number,
  min_value number,
  max_value number,
  loaded_at timestamp default systimestamp not null,
  constraint pk_fact_view_stat primary key (fact_stat_id),
  constraint uq_fact_stat_source_hash unique (source_row_hash),
  constraint fk_fact_stat_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_fact_stat_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id)
);

create table CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT (
  search_doc_id number generated always as identity,
  doc_unique_key varchar2(250) not null,
  content_key number,
  doc_type varchar2(60) not null,
  snapshot_date date,
  source_file_id number,
  title varchar2(600),
  search_text clob,
  search_text_hash_sha256 varchar2(64),
  content_version varchar2(40),
  visibility_scope varchar2(40) default 'INTERNAL_REVIEW' not null,
  created_at timestamp default systimestamp not null,
  updated_at timestamp default systimestamp not null,
  constraint pk_workshop_search_document primary key (search_doc_id),
  constraint uq_workshop_search_doc_key unique (doc_unique_key),
  constraint fk_search_doc_content foreign key (content_key) references CODEX_ANALYTICS.DIM_CONTENT_ITEM (content_key),
  constraint fk_search_doc_file foreign key (source_file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint ck_search_doc_type check (doc_type in ('WORKSHOP_SUMMARY', 'GOVERNANCE_REASON', 'REPLACEMENT_REASON', 'FULL_CONTENT_INDEX')),
  constraint ck_search_doc_visibility check (visibility_scope in ('INTERNAL_REVIEW', 'STATIC_EXPORT_APPROVED', 'EMBEDDING_APPROVED'))
);

create index CODEX_ANALYTICS.IX_DIM_CONTENT_LLID on CODEX_ANALYTICS.DIM_CONTENT_ITEM (livelabs_id);
create index CODEX_ANALYTICS.IX_DIM_CONTENT_WMS on CODEX_ANALYTICS.DIM_CONTENT_ITEM (wms_id);
create index CODEX_ANALYTICS.IX_DIM_CONTENT_NTITLE on CODEX_ANALYTICS.DIM_CONTENT_ITEM (normalized_title);
create index CODEX_ANALYTICS.IX_FACT_SNAPSHOT_CONTENT on CODEX_ANALYTICS.FACT_WORKSHOP_SNAPSHOT (content_key, snapshot_date);
create index CODEX_ANALYTICS.IX_FACT_DEMAND_WINDOW on CODEX_ANALYTICS.FACT_DEMAND_METRIC (time_window, rank_position);
create index CODEX_ANALYTICS.IX_FACT_DEMAND_CONTENT on CODEX_ANALYTICS.FACT_DEMAND_METRIC (content_key, time_window, snapshot_date);
create index CODEX_ANALYTICS.IX_FACT_GOV_ACTION on CODEX_ANALYTICS.FACT_GOVERNANCE_DECISION (lifecycle_state, suggested_action);
create index CODEX_ANALYTICS.IX_SEARCH_DOC_CONTENT on CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT (content_key, doc_type);

grant select, insert, update on CODEX_ANALYTICS.DIM_CONTENT_ITEM to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.IDENTITY_REVIEW_EXCEPTION to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.FACT_WORKSHOP_SNAPSHOT to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.FACT_DEMAND_METRIC to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.FACT_REPO_EVIDENCE to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.FACT_REPLACEMENT_CANDIDATE to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.FACT_GOVERNANCE_DECISION to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.FACT_VIEW_OUTLIER to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.FACT_VIEW_STAT to CODEX_ETL_RUNNER;
grant select, insert, update on CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT to CODEX_ETL_RUNNER;

insert into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id,
  release_channel,
  change_name,
  change_state,
  notes
) values (
  'ALPHA-004',
  'ALPHA',
  'curated warehouse model',
  'ALPHA_APPLIED',
  'Adds dimensional core, governance facts, replacement facts, repo evidence, and search document boundary.'
);

commit;


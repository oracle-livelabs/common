-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-003
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: create typed staging tables for current source families.

whenever sqlerror exit sql.sqlcode rollback

create table CODEX_STAGE.STG_SANDBOX_REPORT (
  stg_id number generated always as identity,
  batch_id number not null,
  file_id number not null,
  source_row_number number not null,
  row_hash_sha256 varchar2(64) not null,
  snapshot_date date,
  is_curated_candidate char(1),
  wms_id number,
  livelabs_id number,
  title varchar2(600),
  workshop_status varchar2(120),
  publish_status varchar2(120),
  publish_type varchar2(120),
  stakeholder varchar2(300),
  council varchar2(300),
  owner_group varchar2(300),
  workshop_team varchar2(600),
  tenancy_url varchar2(1200),
  tenancy_flag varchar2(30),
  sandbox_url varchar2(1200),
  sandbox_flag varchar2(30),
  sprint_url varchar2(1200),
  sprint_flag varchar2(30),
  freesql_url varchar2(1200),
  freesql_flag varchar2(30),
  row_json clob,
  loaded_at timestamp default systimestamp not null,
  constraint pk_stg_sandbox_report primary key (stg_id),
  constraint fk_stg_sandbox_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_stg_sandbox_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint uq_stg_sandbox_row_hash unique (file_id, row_hash_sha256),
  constraint ck_stg_sandbox_candidate check (is_curated_candidate in ('Y', 'N') or is_curated_candidate is null),
  constraint ck_stg_sandbox_json check (row_json is json)
);

create table CODEX_STAGE.STG_WORKSHOP_REPORT (
  stg_id number generated always as identity,
  batch_id number not null,
  file_id number not null,
  source_row_number number not null,
  row_hash_sha256 varchar2(64) not null,
  snapshot_date date,
  page_views number,
  livelabs_id number,
  workshop_id number,
  title varchar2(600),
  publish_title varchar2(600),
  council_area varchar2(300),
  production_url varchar2(1200),
  completion_date date,
  workshop_owner_email varchar2(300),
  support_contact_email varchar2(300),
  alwaysfree_flg varchar2(30),
  freetier_flg varchar2(30),
  greenbutton_flg varchar2(30),
  novnc_enabled_flg varchar2(30),
  oci_login_flg varchar2(30),
  paid_flg varchar2(30),
  publish_status varchar2(120),
  sprint_flg varchar2(30),
  support_level_1 varchar2(120),
  workshop_level varchar2(120),
  workshop_owner_group varchar2(300),
  workshop_status varchar2(120),
  workshop_time varchar2(120),
  youtube_link varchar2(1200),
  last_qa_date date,
  manager_email varchar2(300),
  page_views_year number,
  publish_type varchar2(120),
  short_desc varchar2(1000),
  row_json clob,
  loaded_at timestamp default systimestamp not null,
  constraint pk_stg_workshop_report primary key (stg_id),
  constraint fk_stg_workshop_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_stg_workshop_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint uq_stg_workshop_row_hash unique (file_id, row_hash_sha256),
  constraint ck_stg_workshop_json check (row_json is json)
);

create table CODEX_STAGE.STG_RANK_SECTION (
  stg_id number generated always as identity,
  batch_id number not null,
  file_id number not null,
  source_row_number number not null,
  row_hash_sha256 varchar2(64) not null,
  snapshot_date date,
  source_report_name varchar2(300),
  section_name varchar2(200),
  time_window varchar2(80),
  workshop_name_raw varchar2(800),
  normalized_name varchar2(800),
  views number,
  rank_position number,
  row_json clob,
  loaded_at timestamp default systimestamp not null,
  constraint pk_stg_rank_section primary key (stg_id),
  constraint fk_stg_rank_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_stg_rank_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint uq_stg_rank_row_hash unique (file_id, row_hash_sha256),
  constraint ck_stg_rank_window check (
    time_window in ('recent_views_7d', 'recent_views_14d', 'recent_views_30d', 'recent_views_90d', 'recent_views_180d', 'recent_views_12m', 'all_data')
  ),
  constraint ck_stg_rank_json check (row_json is json)
);

create table CODEX_STAGE.STG_VIEW_OUTLIER (
  stg_id number generated always as identity,
  batch_id number not null,
  file_id number not null,
  source_row_number number not null,
  row_hash_sha256 varchar2(64) not null,
  snapshot_date date,
  source_file_name varchar2(300),
  workshop_name_raw varchar2(800),
  normalized_name varchar2(800),
  views number,
  rank_position number,
  outlier_type varchar2(120),
  lower_bound number,
  upper_bound number,
  row_json clob,
  loaded_at timestamp default systimestamp not null,
  constraint pk_stg_view_outlier primary key (stg_id),
  constraint fk_stg_outlier_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_stg_outlier_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint uq_stg_outlier_row_hash unique (file_id, row_hash_sha256),
  constraint ck_stg_outlier_json check (row_json is json)
);

create table CODEX_STAGE.STG_VIEW_STAT (
  stg_id number generated always as identity,
  batch_id number not null,
  file_id number not null,
  source_row_number number not null,
  row_hash_sha256 varchar2(64) not null,
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
  row_json clob,
  loaded_at timestamp default systimestamp not null,
  constraint pk_stg_view_stat primary key (stg_id),
  constraint fk_stg_stat_batch foreign key (batch_id) references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_stg_stat_file foreign key (file_id) references CODEX_STAGE.DATASET_FILE (file_id),
  constraint uq_stg_stat_row_hash unique (file_id, row_hash_sha256),
  constraint ck_stg_stat_json check (row_json is json)
);

create index CODEX_STAGE.IX_STG_SANDBOX_IDS on CODEX_STAGE.STG_SANDBOX_REPORT (batch_id, livelabs_id, wms_id);
create index CODEX_STAGE.IX_STG_WORKSHOP_IDS on CODEX_STAGE.STG_WORKSHOP_REPORT (batch_id, livelabs_id, workshop_id);
create index CODEX_STAGE.IX_STG_RANK_WINDOW on CODEX_STAGE.STG_RANK_SECTION (batch_id, time_window, rank_position);
create index CODEX_STAGE.IX_STG_OUTLIER_BATCH on CODEX_STAGE.STG_VIEW_OUTLIER (batch_id, outlier_type);

insert into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id,
  release_channel,
  change_name,
  change_state,
  notes
) values (
  'ALPHA-003',
  'ALPHA',
  'typed staging tables',
  'ALPHA_APPLIED',
  'Adds typed staging objects with source-file and batch lineage.'
);

commit;


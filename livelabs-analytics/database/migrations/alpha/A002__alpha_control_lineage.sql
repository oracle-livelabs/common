-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-002
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: create batch, source-file, and reject lineage tables.

whenever sqlerror exit sql.sqlcode rollback

create table CODEX_STAGE.LOAD_BATCH (
  batch_id number generated always as identity,
  release_channel varchar2(20) default 'ALPHA' not null,
  loader_version varchar2(80) not null,
  source_root varchar2(1000),
  load_mode varchar2(50) not null,
  load_status varchar2(40) default 'REQUESTED' not null,
  requested_by varchar2(128) default sys_context('USERENV', 'SESSION_USER') not null,
  started_at timestamp default systimestamp not null,
  completed_at timestamp,
  source_manifest_json clob,
  notes clob,
  constraint pk_load_batch primary key (batch_id),
  constraint ck_load_batch_release check (release_channel = 'ALPHA'),
  constraint ck_load_batch_status check (
    load_status in ('REQUESTED', 'RUNNING', 'STAGED', 'CURATED', 'EXPORTED', 'COMPLETED', 'FAILED', 'SUPERSEDED')
  ),
  constraint ck_load_batch_manifest_json check (source_manifest_json is json)
);

create table CODEX_STAGE.DATASET_FILE (
  file_id number generated always as identity,
  batch_id number not null,
  source_system varchar2(80) not null,
  source_family varchar2(80) not null,
  file_name varchar2(500) not null,
  object_uri varchar2(1500),
  file_ext varchar2(20),
  file_size_bytes number,
  file_hash_sha256 varchar2(64) not null,
  snapshot_date date,
  sheet_name varchar2(200),
  section_name varchar2(200),
  encoding varchar2(80),
  row_count_source number,
  column_count_source number,
  parse_status varchar2(40) default 'PENDING' not null,
  parsed_at timestamp,
  created_at timestamp default systimestamp not null,
  constraint pk_dataset_file primary key (file_id),
  constraint fk_dataset_file_batch foreign key (batch_id)
    references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint ck_dataset_file_parse_status check (
    parse_status in ('PENDING', 'PARSED', 'PARSED_WITH_REJECTS', 'FAILED', 'SKIPPED')
  ),
  constraint ck_dataset_file_hash_len check (length(file_hash_sha256) = 64)
);

create table CODEX_STAGE.LOAD_REJECT (
  reject_id number generated always as identity,
  batch_id number not null,
  file_id number,
  source_row_number number,
  column_name varchar2(200),
  raw_value clob,
  reject_severity varchar2(20) default 'ERROR' not null,
  reject_status varchar2(30) default 'OPEN' not null,
  error_code varchar2(100),
  error_message varchar2(2000),
  created_at timestamp default systimestamp not null,
  reviewed_at timestamp,
  reviewed_by varchar2(128),
  constraint pk_load_reject primary key (reject_id),
  constraint fk_load_reject_batch foreign key (batch_id)
    references CODEX_STAGE.LOAD_BATCH (batch_id),
  constraint fk_load_reject_file foreign key (file_id)
    references CODEX_STAGE.DATASET_FILE (file_id),
  constraint ck_load_reject_severity check (reject_severity in ('INFO', 'WARN', 'ERROR', 'FATAL')),
  constraint ck_load_reject_status check (reject_status in ('OPEN', 'ACCEPTED', 'FIXED', 'IGNORED'))
);

create index CODEX_STAGE.IX_DATASET_FILE_BATCH on CODEX_STAGE.DATASET_FILE (batch_id, source_family);
create unique index CODEX_STAGE.UQ_DATASET_FILE_BATCH_HASH on CODEX_STAGE.DATASET_FILE (
  batch_id,
  file_hash_sha256,
  source_family,
  nvl(sheet_name, '-')
);
create index CODEX_STAGE.IX_LOAD_REJECT_BATCH on CODEX_STAGE.LOAD_REJECT (batch_id, reject_status);

insert into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id,
  release_channel,
  change_name,
  change_state,
  notes
) values (
  'ALPHA-002',
  'ALPHA',
  'control and lineage tables',
  'ALPHA_APPLIED',
  'Adds load batch, dataset file, and load reject objects with alpha-only change status.'
);

commit;

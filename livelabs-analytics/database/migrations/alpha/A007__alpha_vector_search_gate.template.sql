-- LiveLabs Analytics ADB alpha template
-- Alpha change id: ALPHA-007
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: gated vector search objects.
--
-- STOP POINT:
-- Do not run this template until provider, model, dimensions, distance metric,
-- credential storage, and text-egress policy are approved.
--
-- Replace &&EMBEDDING_DIMENSIONS and &&DISTANCE_METRIC during an approved rehearsal.

whenever sqlerror exit sql.sqlcode rollback

create table CODEX_ANALYTICS.VECTOR_MODEL (
  model_id number generated always as identity,
  provider_name varchar2(120) not null,
  model_name varchar2(200) not null,
  embedding_dimensions number not null,
  distance_metric varchar2(40) not null,
  credential_owner varchar2(128),
  approved_for_use char(1) default 'N' not null,
  approved_by varchar2(128),
  approved_at timestamp,
  notes clob,
  constraint pk_vector_model primary key (model_id),
  constraint uq_vector_model unique (provider_name, model_name, embedding_dimensions, distance_metric),
  constraint ck_vector_model_approved check (approved_for_use in ('Y', 'N')),
  constraint ck_vector_model_metric check (distance_metric in ('COSINE', 'DOT', 'EUCLIDEAN'))
);

create table CODEX_ANALYTICS.WORKSHOP_SEARCH_EMBEDDING (
  search_embedding_id number generated always as identity,
  search_doc_id number not null,
  model_id number not null,
  embedding vector(&&EMBEDDING_DIMENSIONS, FLOAT32),
  embedding_status varchar2(40) default 'PENDING' not null,
  embedded_at timestamp,
  source_text_hash_sha256 varchar2(64) not null,
  error_message varchar2(2000),
  created_at timestamp default systimestamp not null,
  constraint pk_workshop_search_embedding primary key (search_embedding_id),
  constraint fk_search_embedding_doc foreign key (search_doc_id) references CODEX_ANALYTICS.WORKSHOP_SEARCH_DOCUMENT (search_doc_id),
  constraint fk_search_embedding_model foreign key (model_id) references CODEX_ANALYTICS.VECTOR_MODEL (model_id),
  constraint uq_search_embedding unique (search_doc_id, model_id, source_text_hash_sha256),
  constraint ck_search_embedding_status check (embedding_status in ('PENDING', 'GENERATED', 'FAILED', 'SUPERSEDED')),
  constraint ck_search_embedding_hash check (length(source_text_hash_sha256) = 64)
);

-- Create a vector index only after exact-search quality review passes.
-- Example:
-- create vector index CODEX_ANALYTICS.IX_SEARCH_EMBEDDING_HNSW
-- on CODEX_ANALYTICS.WORKSHOP_SEARCH_EMBEDDING (embedding)
-- organization inmemory neighbor graph
-- distance &&DISTANCE_METRIC
-- with target accuracy 95;

grant select on CODEX_ANALYTICS.VECTOR_MODEL to CODEX_ANALYTICS_READ;
grant select on CODEX_ANALYTICS.WORKSHOP_SEARCH_EMBEDDING to CODEX_ANALYTICS_READ;

insert into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id,
  release_channel,
  change_name,
  change_state,
  notes
) values (
  'ALPHA-007',
  'ALPHA',
  'gated vector search template',
  'ALPHA_APPLIED',
  'Creates vector metadata and embeddings only after explicit approval.'
);

commit;


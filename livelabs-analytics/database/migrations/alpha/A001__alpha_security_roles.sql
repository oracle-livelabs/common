-- LiveLabs Analytics ADB alpha change
-- Alpha change id: ALPHA-001
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: create schema-only owners, runtime roles, and alpha change log.

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
  exec_ddl('create user CODEX_DEPLOY no authentication account lock', -1920);
  exec_ddl('create user CODEX_STAGE no authentication account lock', -1920);
  exec_ddl('create user CODEX_ANALYTICS no authentication account lock', -1920);
  exec_ddl('create user CODEX_APP no authentication account lock', -1920);
  exec_ddl('create user CODEX_AI no authentication account lock', -1920);

  exec_ddl('alter user CODEX_DEPLOY quota unlimited on DATA', -959);
  exec_ddl('alter user CODEX_STAGE quota unlimited on DATA', -959);
  exec_ddl('alter user CODEX_ANALYTICS quota unlimited on DATA', -959);
  exec_ddl('alter user CODEX_APP quota 0 on DATA', -959);
  exec_ddl('alter user CODEX_AI quota 0 on DATA', -959);

  exec_ddl('create role CODEX_ANALYTICS_READ', -1921);
  exec_ddl('create role CODEX_ETL_RUNNER', -1921);
  exec_ddl('create role CODEX_EXPORT_RUNNER', -1921);
  exec_ddl('create role CODEX_ORDS_READ', -1921);
  exec_ddl('grant CODEX_ANALYTICS_READ to CODEX_ORDS_READ', -1920);
end;
/

create table CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id varchar2(40) not null,
  release_channel varchar2(20) default 'ALPHA' not null,
  change_name varchar2(200) not null,
  change_state varchar2(30) default 'ALPHA_DRAFT' not null,
  applied_at timestamp default systimestamp not null,
  applied_by varchar2(128) default sys_context('USERENV', 'SESSION_USER') not null,
  notes clob,
  constraint pk_alpha_schema_change_log primary key (alpha_change_id),
  constraint ck_alpha_change_release check (release_channel = 'ALPHA'),
  constraint ck_alpha_change_state check (
    change_state in ('ALPHA_DRAFT', 'ALPHA_APPLIED', 'ALPHA_VALIDATED', 'ALPHA_FAILED', 'ALPHA_SUPERSEDED')
  )
);

comment on table CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG is
  'Alpha-only change log for LiveLabs Analytics ADB rehearsal scripts.';

insert into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id,
  release_channel,
  change_name,
  change_state,
  notes
) values (
  'ALPHA-001',
  'ALPHA',
  'security roles and schema owners',
  'ALPHA_APPLIED',
  'Creates schema-only owners and runtime roles. No passwords are stored in this script.'
);

commit;


-- LiveLabs Analytics ADB alpha template
-- Alpha change id: ALPHA-006
-- Release channel: ALPHA
-- Alpha status: ALPHA_DRAFT
-- Purpose: optional read-only ORDS surface.
--
-- STOP POINT:
-- Use this template only if generated JSON snapshots are not enough.
-- Keep the module NOT_PUBLISHED until authentication, rate limits, and read-only grants are reviewed.

whenever sqlerror exit sql.sqlcode rollback

begin
  ords.enable_schema(
    p_enabled             => true,
    p_schema              => 'CODEX_APP',
    p_url_mapping_type    => 'BASE_PATH',
    p_url_mapping_pattern => 'livelabs-analytics-alpha',
    p_auto_rest_auth      => true
  );

  ords.define_module(
    p_module_name    => 'livelabs.analytics.alpha',
    p_base_path      => '/alpha/v1/',
    p_items_per_page => 100,
    p_status         => 'NOT_PUBLISHED',
    p_comments       => 'LiveLabs Analytics alpha read-only API. Keep unpublished until approved.'
  );

  ords.define_template(
    p_module_name => 'livelabs.analytics.alpha',
    p_pattern     => 'health/db',
    p_comments    => 'Read-only DB health check.'
  );

  ords.define_handler(
    p_module_name => 'livelabs.analytics.alpha',
    p_pattern     => 'health/db',
    p_method      => 'GET',
    p_source_type => ords.source_type_collection_item,
    p_source      => 'select ''ALPHA'' as release_channel, systimestamp as checked_at from dual'
  );

  ords.define_template(
    p_module_name => 'livelabs.analytics.alpha',
    p_pattern     => 'inventory/',
    p_comments    => 'Read-only portfolio inventory.'
  );

  ords.define_handler(
    p_module_name    => 'livelabs.analytics.alpha',
    p_pattern        => 'inventory/',
    p_method         => 'GET',
    p_source_type    => ords.source_type_collection_feed,
    p_items_per_page => 100,
    p_source         => 'select * from CODEX_ANALYTICS.V_PORTFOLIO_INVENTORY_EXPORT order by title'
  );

  ords.define_template(
    p_module_name => 'livelabs.analytics.alpha',
    p_pattern     => 'search/',
    p_comments    => 'Read-only approved search documents.'
  );

  ords.define_handler(
    p_module_name    => 'livelabs.analytics.alpha',
    p_pattern        => 'search/',
    p_method         => 'GET',
    p_source_type    => ords.source_type_collection_feed,
    p_items_per_page => 50,
    p_source         => q'[
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
      where d.visibility_scope in ('STATIC_EXPORT_APPROVED', 'EMBEDDING_APPROVED')
        and (
          :q is null
          or contains(d.search_text, :q, 1) > 0
        )
      order by d.title
    ]'
  );

  commit;
end;
/

insert into CODEX_DEPLOY.ALPHA_SCHEMA_CHANGE_LOG (
  alpha_change_id,
  release_channel,
  change_name,
  change_state,
  notes
) values (
  'ALPHA-006',
  'ALPHA',
  'optional read-only ORDS template',
  'ALPHA_APPLIED',
  'Template for optional read-only ORDS module. Leave NOT_PUBLISHED until reviewed.'
);

commit;

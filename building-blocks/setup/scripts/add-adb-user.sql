create or replace procedure add_adb_user(user_name varchar2, pwd varchar2) authid current_user
as
    l_count number;
    type t_db_object is TABLE OF VARCHAR2(100);
    db_roles_privs t_db_object;
    
    begin
        -- List of roles and privs    
        db_roles_privs := t_db_object(
                        'console_developer',
                        'dcat_sync',
                        'dwrole',
                        'graph_developer',
                        'oml_developer',
                        'connect',
                        'create analytic view',
                        'create attribute dimension',
                        'create mining model',
                        'create any index',
                        'create procedure',
                        'create sequence',
                        'create table',
                        'create trigger',
                        'create type',
                        'create view',
                        'global query rewrite',
                        'create materialized view',
                        'resource',
                        'create job',
                        'debug connect session',
                        'inherit privileges on user admin',
                        'unlimited tablespace',
                        'execute on dbms_cloud',
                        'execute on dbms_cloud_repo',
                        'execute on dbms_session',
                        'execute on dbms_soda',
                        'execute on dbms_soda_admin',                        
                        'write on directory data_pump_dir',
                        'select on sys.v_$services',
                        'select on sys.dba_rsrc_consumer_group_privs',
                        'read on all_dcat_entities',
                        'read on dcat_entities',
                        'read on all_dcat_assets',
                        'read on all_dcat_folders'
                        );
                                               
        -- Check if user exists.            
        select count(*)
        into l_count
        from all_users
        where upper(username) = upper(user_name);

        workshop.write('create user', 1);
        if l_count > 0 then
            workshop.write(user_name || ' already exists.', -1);
            return;
        end if;
        
        -- Raise exception with an error
        workshop.write('create user ' || user_name || ' identified by ####');
        execute immediate 'create user ' || user_name || ' identified by ' || pwd;

        -- privs
        workshop.write('grant privileges and roles', 1);
        
        for i in 1 .. db_roles_privs.count loop
            workshop.exec('grant ' || db_roles_privs(i) || ' to ' || user_name);
        
        end loop;
                
        workshop.exec('grant soda_app to ' || user_name || ' with delegate option');
        workshop.exec('alter user ' || user_name || ' grant connect through OML$PROXY');
        workshop.exec('alter user ' || user_name || ' grant connect through GRAPH$PROXY_USER');
        -- workshop.exec('alter user ' || user_name || ' default role connect, resource, dwrole, oml_developer, graph_developer');
            
        commit;

        workshop.write('TO DO', 1);
        workshop.write('Run the following as "ADMIN" in SQL Worksheet to allow your new user to use the SQL Tools', 2);
        workshop.write('begin 
                ords_admin.enable_schema (
                    p_enabled               => TRUE,
                    p_schema                => ''' || user_name || ''',
                    p_url_mapping_type      => ''BASE_PATH'',
                    p_auto_rest_auth        => TRUE   
                );
                end;
                /');

        EXCEPTION when others then
            workshop.write('Unable to create the user.', -1);
            workshop.write(sqlerrm);
            raise;

end add_adb_user;
/

begin
    workshop.exec('grant execute on add_adb_user to public');
end;
/
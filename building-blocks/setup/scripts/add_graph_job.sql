create or replace procedure add_graph_job authid current_user as 
begin
    -- CREATE GRAPH (ASYNC JOB)
<<<<<<< HEAD
     workshop.write('create async job that creates and populates the graph', 1);
=======
     workshop.write('create async job that creates and populates the graph, 1);
>>>>>>> d55985721b3eda3e0a1965da470a05acf8c7a3f3
     begin
        dbms_scheduler.create_job (
           job_name             => 'create_graph',
           job_type             => 'STORED_PROCEDURE',
<<<<<<< HEAD
           job_action           => 'admin.add_graph',
=======
           job_action           => 'add_graph',
>>>>>>> d55985721b3eda3e0a1965da470a05acf8c7a3f3
           start_date           => current_timestamp,
           enabled              => true
           );
     end;

     
     workshop.write('adding graph complete.', 1);
end add_graph_job;
/

begin
   workshop.exec('grant execute on add_graph_job to public');
end;
/
# How can I create tables in the Oracle database?
<!-- If your code can fit in a 2048 character URL, we advise using the sprint-livesql-worksheet template, as this does not require the creation of a Live SQL tutorial. Otherwise, include the link to your tutorial using the src attribute.-->
<livesql-button src="https://livesql.oracle.com/next/worksheet?tutorial=json-duality-views-quick-start-D3wdHG&share_key=jCX1875rL3">

<b>Live SQL Execution:</b> Sign-In Required</br>
<b>Duration:</b> 2 minutes 


## Create table in Oracle database

Tables are the basic unit of data storage in an Oracle Database. Data is stored in rows and columns. A CREATE TABLE statement creates a table. Tables contain columns and constraints, rules to which data must conform. Table-level constraints specify a column or columns. Columns have a data type and can specify column constraints (column-level constraints).

```
<copy>
CREATE TABLE table_name (
    column1_name data_type column_constraint,
    column2_name data_type column_constraint,
    ...
    constraint table_constraint;
);
</copy>
```

### Example

For example, you define a table with a table name, such as employees, and a set of columns. You give each column a column name, such as employee\_id, last\_name, and job\_id; a datatype, such as VARCHAR2, DATE, or NUMBER; and a width. The width can be predetermined by the datatype, as in DATE. If columns are of the NUMBER datatype, define precision and scale instead of width. A row is a collection of column information corresponding to a single record.column information corresponding to a single record.

You can specify rules for each column of a table. These rules are called integrity constraints. One example is a NOT NULL integrity constraint. This constraint forces the column to contain a value in every row.

```
create table DEPARTMENTS (  
    deptno        number,  
    name          varchar2(50) not null,  
    location      varchar2(50),  
    constraint pk_departments primary key (deptno)  
);
```

Tables can declarative specify relationships between tables, typically referred to as referential integrity. To see how this works we can create a "child" table of the DEPARTMENTS table by including a foreign key in the EMPLOYEES table that references the DEPARTMENTS table.

```
create table EMPLOYEES (  
    empno             number,  
    name              varchar2(50) not null,  
    job               varchar2(50),  
    manager           number,  
    hiredate          date,  
    salary            number(7,2),  
    commission        number(7,2),  
    deptno           number,  
    constraint pk_employees primary key (empno),  
    constraint fk_employees_deptno foreign key (deptno) 
        references DEPARTMENTS (deptno)  
);
```

Foreign keys must reference primary keys, so to create a "child" table the "parent" table must have a primary key for the foreign key to reference.

## Learn More

* Explore more about [Creating Tables](https://docs.oracle.com/cd/B28359_01/server.111/b28310/tables003.htm#ADMIN11634)
* [Introduction to Oracle SQL Workshop](https://livelabs.oracle.com/pls/apex/dbpm/r/livelabs/view-workshop?wid=943)
* [SQL Language Reference](https://docs.oracle.com/en/database/oracle/oracle-database/12.2/sqlrf/Introduction-to-Oracle-SQL.html#GUID-049B7AE8-11E1-4110-B3E4-D117907D77AC)

<!--
    {
        "name":"Query simple JSON attributes",
        "description":"Use dot notation and JSON_VALUE to query JSON documents. Creates a view to simplify subsequent access."
    }
-->
<!--
    {
        "name":"Query simple JSON attributes",
        "description":"Use dot notation and JSON_VALUE to query JSON documents. Creates a view to simplify subsequent access."
    }
-->
Oracle Database offers a wide range of SQL functions that help you analyze JSON data ([see Query JSON Data](https://docs.oracle.com/en/database/oracle/oracle-database/19/adjsn/query-json-data.html#GUID-119E5069-77F2-45DC-B6F0-A1B312945590) for details). The SQL capabilities include simple extraction of JSON attributes using dot notation, array and object manipulation, JSON aggregations and more.

1. Use the simple dot (.) notation to extract fields in a tabular format.

    The movie collection includes **`title`** and **`year`** attributes. Your SQL statements can use the dot notation to navigate through the JSON path. For example, **`m.json_document.title`** refers to table **`m` (`movie_collection`)**, the **`json_document`** column, and the **`title`** JSON attribute. Copy and paste the following SQL statement into the worksheet, and then click the **Run Statement** icon in the Worksheet toolbar to view **Meryl Streep's** movies:

    ```
    <copy>
    select
        m.json_document.title,
        m.json_document.year
    from movie_collection m
    where m.json_document.cast like '%Meryl Streep%';
    </copy>
    ```

    Meryl Streep movies and the years that they were released are displayed.

    ![Meryl Streep movies](images/adb-query-json-meryl-streep.png)

2. You can simplify subsequent queries against the movie collection by using a view. The view will allow tools and applications to access JSON data as if it were tabular data. The view definition extracts from the JSON documents both simple fields (using the `JSON_VALUE` function) and complex arrays (using the `JSON_QUERY` function). Copy and paste the following SQL code into the worksheet, and then click the **Run Statement** icon in the Worksheet toolbar.

    ```
    <copy>
    -- Create a view over the collection to make queries easy
    create or replace view movie as
    select
        json_value(json_document, '$.movie_id' returning number) as movie_id,
        json_value(json_document, '$.title') as title,
        json_value(json_document, '$.budget' returning number) as budget,
        json_value(json_document, '$.list_price' returning number) as list_price,
        json_value(json_document, '$.gross' returning number) as gross,
        json_query(json_document, '$.genre' returning varchar2(400)) as genre,
        json_value(json_document, '$.sku' returning varchar2(30)) as sku,
        json_value(json_document, '$.year' returning number) as year,
        json_value(json_document, '$.opening_date' returning date) as opening_date,
        json_value(json_document, '$.views' returning number) as views,
        json_query(json_document, '$.cast' returning varchar2(4000)) as cast,
        json_query(json_document, '$.crew' returning varchar2(4000)) as crew,
        json_query(json_document, '$.studio' returning varchar2(4000)) as studio,
        json_value(json_document, '$.main_subject' returning varchar2(400)) as main_subject,
        json_query(json_document, '$.awards' returning varchar2(4000)) as awards,
        json_query(json_document, '$.nominations' returning varchar2(4000)) as nominations,
        json_value(json_document, '$.runtime' returning number) as runtime,
        json_value(json_document, '$.summary' returning varchar2(10000)) as summary
    from movie_collection
    ;
    </copy>
    ```
    Each JSON attribute is now exposed as a column - similar to any table column.

    ![Create movie view.](images/create-json-view.png)

3. Query the newly created by view. Copy and paste the following SQL code into the worksheet, and then click the **Run Statement** icon in the Worksheet toolbar.

    ```
    <copy>
    select *
    from movie
    where rownum < 10;
    </copy>
    ```

    ![Tabular and array-based data](images/query-view.png)

    Most of the data is in tabular format. However, several of the fields are arrays. For example, there are multiple genres and cast members associated with each movie.

    ![Genre and Cast members.](images/genre-cast.png)
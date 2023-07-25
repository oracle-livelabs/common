# List of Building Blocks and Tasks
## Introduction

Review the list of Building Blocks and Tasks that are currently available. Become a contributor by creating reusable components!
## List of Building Blocks

Building Blocks are exposed to customers. You can use these same blocks in your own workshop by adding the block to your manifest.json file.
| Cloud Service | Block |  File | Description |
|---------------| ---- |  ---- |------------ |
| setup | [Add Workshop Utilities](/common/building-blocks/workshop/freetier/index.html?lab=add-workshop-utilities) |  /common/building-blocks /setup/add-workshop-utilities.md| Utilities for adding data sets and users |
| adb | [Connect with SQL Worksheet](/common/building-blocks/workshop/freetier/index.html?lab=connect-sql-worksheet.md) | /common/building-blocks/blocks/adb/connect/connect-sql-worksheet.md | Connect to Autonomous Database using the SQL Worksheet in Database Actions |
| adb | [Load and Analyze Data from REST Services](/common/building-blocks/workshop/freetier/index.html?lab=load-analyze-rest.md) | /common/building-blocks/blocks/adb/load-analyze-rest/load-analyze-rest.md | Analyze data sourced from REST services. Using the News API as an example.<ul><li>Create an Account on newsapi.org</li><li>Create a PLSQL function that retrieves news for actors</li><li>Perform a sentiment analysis on the article descriptions</li><li>Find which actors are generating buzz - both good and bad</li></ul> |
| adb | [Use Database Actions Data Loading for Object Store data](/common/building-blocks/workshop/freetier/index.html?lab=load-data-tools.md) | /common/building-blocks/blocks/adb/load-data/load-data-tools.md | Use the Database Actions tooling to easily load data from object storage. |
| adb | [Provision ADB using Python API](/common/building-blocks/workshop/freetier/index.html?lab=provision-python-api.md) | /common/building-blocks/blocks/adb/provision-python-api/provision-python-api.md | OCI provides a rich set of APIs to interact with its services. Use the python API to provision an autonomous database. |
| adb | [Create an Oracle Autonomous Database](/common/building-blocks/workshop/freetier/index.html?lab=provision-console.md) | /common/building-blocks/blocks/adb/provision/provision-console.md | Learn how to provision Autonomous Database using the OCI console. |
| adb | [Access and Load Partitioned Object Storage Data](/common/building-blocks/workshop/freetier/index.html?lab=use-partitioned-external-table.md) | /common/building-blocks/blocks/adb/use-partitioned-external-table/use-partitioned-external-table.md | Show value of partitioned external tables to improve performance |
| oac | [Provision Your Oracle Analytics Cloud (OAC) Instance](/common/building-blocks/workshop/freetier/index.html?lab=oac-provision.md) | /common/building-blocks/blocks/oac/provision/oac-provision.md | Show how to create a new OAC instance |

[Go here for the customer view of Building Blocks](/building-blocks/workshop/freetier/index.html)
## List of Tasks

Listed below are the tasks that you can incorporate into your markdown. You can also use the navigation tree on the left to view the tasks. Again, contribute to the list of tasks!
| Cloud Service | Task |  File | Description |
|---------------| ---- |  ---- |------------ |
| adb | [Connect with SQL Worksheet](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#ConnectwithSQLWorksheet) | /common/building-blocks/tasks/adb/connect-with-sql-worksheet-body.md | Connect to Autonomous Database using the SQL Worksheet in Database Actions |
| adb | [Create Graph](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#CreateGraph) | /common/building-blocks/tasks/adb/create-graph.md | Create a bipartite Graph for MOVIESTREAM watched movies. |
| adb | [Create and load JSON Collection from object storage](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#CreateandloadJSONCollectionfromobjectstorage) | /common/building-blocks/tasks/adb/create-load-json-collection.md | <ul><li>Loads data using DBMS&lowbar;CLOUD.COPY&lowbar;COLLECTION</li><li>Introduces JSON&lowbar;SERIALIZE, JSON&lowbar;VALUE and JSON&lowbar;QUERY (minimal)</li><li>Creates a view over JSON data</li><li>Performs basic JSON queries</li></ul> |
| adb | [Create ADB User using Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#CreateADBUserusingDatabaseActions) | /common/building-blocks/tasks/adb/create-user.md | Creates an ADB user using the new user database action |
| adb | [Go to Data Load Utility Database Action](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#GotoDataLoadUtilityDatabaseAction) | /common/building-blocks/tasks/adb/goto-data-load-utility.md | Navigate to data loader. AUTHORS: For expediency, this task uses the ADMIN user/password to open Database Actions. In your workshop, you might want to substitute a different user/password to open Database Actions. |
| adb | [Go to Graph Studio](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#GotoGraphStudio) | /common/building-blocks/tasks/adb/goto-graph-studio.md | Login to Graph Studio from the Autonomous Database OCI console |
| adb | [Go to Autonomous Database Service](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#GotoAutonomousDatabaseService) | /common/building-blocks/tasks/adb/goto-service-body.md | Navigate to ADB using the OCI menu. AUTHORS: For expediency, this task uses the ADMIN user/password to open Database Actions. In your workshop, you might want to substitute a different user/password to open Database Actions. |
| adb | [Go to SQL Worksheet in Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#GotoSQLWorksheetinDatabaseActions) | /common/building-blocks/tasks/adb/goto-sql-worksheet.md | Navigate to SQL Worksheet from the OCI service console.  |
| adb | [Load data from public buckets using Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#LoaddatafrompublicbucketsusingDatabaseActions) | /common/building-blocks/tasks/adb/load-public-db-actions-15-min-quickstart.md | Uses Database Actions to load data from public object storage buckets. It loads the following two tables:<ul><li>customer</li><li>sales&lowbar;sample</li></ul> |
| adb | [Load data from public buckets using Database Actions. Sales data not included.](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#LoaddatafrompublicbucketsusingDatabaseActionsSalesdatanotincluded) | /common/building-blocks/tasks/adb/load-public-db-actions-no-sales.md | Uses Database Actions to load data from public object storage buckets. It loads the following tables:<ul><li>customer&lowbar;contact</li><li>genre</li><li>pizza location</li></ul><p>To load sales&lowbar;sample, use task **Load data from public buckets using Database Actions** |
| adb | [Load data from public buckets using Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#LoaddatafrompublicbucketsusingDatabaseActions) | /common/building-blocks/tasks/adb/load-public-db-actions.md | Uses Database Actions to load data from public object storage buckets. It loads the following tables:<ul><li>customer&lowbar;contact</li><li>sales&lowbar;sample</li><li>genre</li><li>pizza location</li></ul> |
| adb | [Provision Autonomous Database](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#ProvisionAutonomousDatabase) | /common/building-blocks/tasks/adb/provision-body.md | Provision an ADB. Use the `variables.json` file to update provisioning parameters, including database name, OCPUs, storage and more. |
| adb | [Query JSON arrays](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#QueryJSONarrays) | /common/building-blocks/tasks/adb/query-json-arrays.md | Use JSON&lowbar;TABLE to convert arrays into rows. |
| adb | [Query simple JSON attributes](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#QuerysimpleJSONattributes) | /common/building-blocks/tasks/adb/query-json-simple.md | Use dot notation and JSON&lowbar;VALUE to query JSON documents. Creates a view to simplify subsequent access. |
| adb | [Query Object Storage contents with SQL](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#QueryObjectStoragecontentswithSQL) | /common/building-blocks/tasks/adb/query-object-store-contents-with-sql.md | Use SQL to see listing of object storage files and folders. |
| adb | [Analyze Spatial Data with SQL](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#AnalyzeSpatialDatawithSQL) | /common/building-blocks/tasks/adb/query-spatial.md | Oracle provides rich support for querying and analyzing spatial data. Run queries to find pizza shops closest to customers. |
| adb | [Using Partitoned External Tables](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb#UsingPartitonedExternalTables) | /common/building-blocks/tasks/adb/use-partitioned-external-table-body.md | Create partitioned external tables over object storage data using a single, simple API call. Then, load that data. Compare performance of external tables and partitioned external tables. |
| iam | [Create an OCI Compartment](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=iam#CreateanOCICompartment) | /common/building-blocks/tasks/iam/compartment-create-body.md | Create a new compartment using the OCI service console |

## Variable Defaults
You can use the default variables or copy the default file to your project and override the settings. See the **Authoring using Blocks and Tasks** topic for details.

[View default variable values](/common/building-blocks/variables/variables.json)


## manifest.json Template
The manifest.json template below includes all the tasks that are currently available. You can remove those that you do not plan to use - either directly or thru a Block

The template assumes you copied the default **variables.json** to the same directory as the **manifest.json** file.

```
<copy>
{
  "workshoptitle":"LiveLabs Workshop Template",
  "include": {
     "adb-connect-with-sql-worksheet-body.md":"/common/building-blocks/tasks/adb/connect-with-sql-worksheet-body.md",
     "adb-create-graph.md":"/common/building-blocks/tasks/adb/create-graph.md",
     "adb-create-load-json-collection.md":"/common/building-blocks/tasks/adb/create-load-json-collection.md",
     "adb-create-user.md":"/common/building-blocks/tasks/adb/create-user.md",
     "adb-goto-data-load-utility.md":"/common/building-blocks/tasks/adb/goto-data-load-utility.md",
     "adb-goto-graph-studio.md":"/common/building-blocks/tasks/adb/goto-graph-studio.md",
     "adb-goto-service-body.md":"/common/building-blocks/tasks/adb/goto-service-body.md",
     "adb-goto-sql-worksheet.md":"/common/building-blocks/tasks/adb/goto-sql-worksheet.md",
     "adb-load-public-db-actions-15-min-quickstart.md":"/common/building-blocks/tasks/adb/load-public-db-actions-15-min-quickstart.md",
     "adb-load-public-db-actions-no-sales.md":"/common/building-blocks/tasks/adb/load-public-db-actions-no-sales.md",
     "adb-load-public-db-actions.md":"/common/building-blocks/tasks/adb/load-public-db-actions.md",
     "adb-provision-body.md":"/common/building-blocks/tasks/adb/provision-body.md",
     "adb-query-json-arrays.md":"/common/building-blocks/tasks/adb/query-json-arrays.md",
     "adb-query-json-simple.md":"/common/building-blocks/tasks/adb/query-json-simple.md",
     "adb-query-object-store-contents-with-sql.md":"/common/building-blocks/tasks/adb/query-object-store-contents-with-sql.md",
     "adb-query-spatial.md":"/common/building-blocks/tasks/adb/query-spatial.md",
     "adb-use-partitioned-external-table-body.md":"/common/building-blocks/tasks/adb/use-partitioned-external-table-body.md",
     "iam-compartment-create-body.md":"/common/building-blocks/tasks/iam/compartment-create-body.md"
  },
  "help": "livelabs-help-db_us@oracle.com",
  "variables": ["./variables.json"],
  "tutorials": [  
    {
        "title": "Get Started",
        "description": "Get a Free Trial",
        "filename": "https://oracle-livelabs.github.io/common/labs/cloud-login/cloud-login.md"
    },
    {
        "title": "Provision Autonomous Database",
        "type": "freetier",
        "filename": "/common/building-blocks/blocks/adb/provision/provision-console.md"
    },
    {
        "title": "Your lab goes here",
        "type": "freetier",
        "filename": "/../../yourlab.md"
    }
  ]
}
</copy>
```
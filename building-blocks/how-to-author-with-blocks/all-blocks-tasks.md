# List of Building Blocks and Tasks
## Introduction

Review the list of Building Blocks and Tasks that are currently available. Become a contributor by creating reusable components!
## List of Building Blocks

Building Blocks are exposed to customers. You can use these same blocks in your own workshop by adding the block to your manifest.json file.
| Cloud Service | Block |  File | Description |
|---------------| ---- |  ---- |------------ |
| setup | [Add Workshop Utilities](/common/building-blocks/workshop/freetier/index.html?lab=add-workshop-utilities) |  /common/building-blocks /setup/add-workshop-utilities.md| Utilities for adding data sets and users |
| adb\cleanup\cleanup.m | [Delete your workshop resources](/common/building-blocks/workshop/freetier/index.html?lab=blocks\adb\cleanup\cleanup.md) | d | Delete some or all of the resources that you created in the workshop |
| adb\connect\connect-sql-worksheet.m | [Connect with SQL Worksheet](/common/building-blocks/workshop/freetier/index.html?lab=blocks\adb\connect\connect-sql-worksheet.md) | d | Connect to Autonomous Database using the SQL Worksheet in Database Actions |
| adb\load-analyze-rest\load-analyze-rest.m | [Load and Analyze Data from REST Services](/common/building-blocks/workshop/freetier/index.html?lab=blocks\adb\load-analyze-rest\load-analyze-rest.md) | d | Analyze data sourced from REST services. Using the News API as an example.<ul><li>Create an Account on newsapi.org</li><li>Create a PLSQL function that retrieves news for actors</li><li>Perform a sentiment analysis on the article descriptions</li><li>Find which actors are generating buzz - both good and bad</li></ul> |
| adb\load-data\load-data-tools.m | [Use Database Actions Data Loading for Object Store data](/common/building-blocks/workshop/freetier/index.html?lab=blocks\adb\load-data\load-data-tools.md) | d | Use the Database Actions tooling to easily load data from object storage. |
| adb\provision-python-api\provision-python-api.m | [Provision ADB using Python API](/common/building-blocks/workshop/freetier/index.html?lab=blocks\adb\provision-python-api\provision-python-api.md) | d | OCI provides a rich set of APIs to interact with its services. Use the python API to provision an autonomous database. |
| adb\provision\provision-console.m | [Create an Oracle Autonomous Database](/common/building-blocks/workshop/freetier/index.html?lab=blocks\adb\provision\provision-console.md) | d | Learn how to provision Autonomous Database using the OCI console. |
| adb\use-partitioned-external-table\use-partitioned-external-table.m | [Access and Load Partitioned Object Storage Data](/common/building-blocks/workshop/freetier/index.html?lab=blocks\adb\use-partitioned-external-table\use-partitioned-external-table.md) | d | Show value of partitioned external tables to improve performance |
| oac\provision\oac-provision.m | [Provision Your Oracle Analytics Cloud (OAC) Instance](/common/building-blocks/workshop/freetier/index.html?lab=blocks\oac\provision\oac-provision.md) | d | Show how to create a new OAC instance |

[Go here for the customer view of Building Blocks](/building-blocks/workshop/freetier/index.html)
## List of Tasks

Listed below are the tasks that you can incorporate into your markdown. You can also use the navigation tree on the left to view the tasks. Again, contribute to the list of tasks!
| Cloud Service | Task |  File | Description |
|---------------| ---- |  ---- |------------ |
| adb\cleanup.m | [Delete your workshop resources](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\cleanup.m#Deleteyourworkshopresources) | d | Delete some or all of the resources that you created in the workshop |
| adb\connect-with-sql-worksheet-body.m | [Connect with SQL Worksheet](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\connect-with-sql-worksheet-body.m#ConnectwithSQLWorksheet) | d | Connect to Autonomous Database using the SQL Worksheet in Database Actions |
| adb\connect-with-sql-worksheet-non-admin.m | [Connect with SQL Worksheet as non-admin user](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\connect-with-sql-worksheet-non-admin.m#ConnectwithSQLWorksheetasnonadminuser) | d | Connect to Autonomous Database using the SQL Worksheet in Database Actions. Non-admin user. |
| adb\create-graph.m | [Create Graph](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\create-graph.m#CreateGraph) | d | Create a bipartite Graph for MOVIESTREAM watched movies. |
| adb\create-load-json-collection.m | [Create and load JSON Collection from object storage](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\create-load-json-collection.m#CreateandloadJSONCollectionfromobjectstorage) | d | <ul><li>Loads data using DBMS&lowbar;CLOUD.COPY&lowbar;COLLECTION</li><li>Introduces JSON&lowbar;SERIALIZE, JSON&lowbar;VALUE and JSON&lowbar;QUERY (minimal)</li><li>Creates a view over JSON data</li><li>Performs basic JSON queries</li></ul> |
| adb\create-user.m | [Create ADB User using Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\create-user.m#CreateADBUserusingDatabaseActions) | d | Creates an ADB user using the new user database action |
| adb\generate-rsa-key-pair.m | [Generate an RSA key pair](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\generate-rsa-key-pair.m#GenerateanRSAkeypair) | d | Generate an RSA key pair and get the key's values and fingerprint |
| adb\goto-data-load-utility.m | [Go to Data Load Utility Database Action](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\goto-data-load-utility.m#GotoDataLoadUtilityDatabaseAction) | d | Navigate to data loader. AUTHORS: For expediency, this task uses the ADMIN user/password to open Database Actions. In your workshop, you might want to substitute a different user/password to open Database Actions. |
| adb\goto-graph-studio.m | [Go to Graph Studio](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\goto-graph-studio.m#GotoGraphStudio) | d | Login to Graph Studio from the Autonomous Database OCI console |
| adb\goto-service-body.m | [Go to Autonomous Database Service](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\goto-service-body.m#GotoAutonomousDatabaseService) | d | Navigate to ADB using the OCI menu. AUTHORS: For expediency, this task uses the ADMIN user/password to open Database Actions. In your workshop, you might want to substitute a different user/password to open Database Actions. |
| adb\goto-sql-worksheet.m | [Go to SQL Worksheet in Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\goto-sql-worksheet.m#GotoSQLWorksheetinDatabaseActions) | d | Navigate to SQL Worksheet from the OCI service console.  |
| adb\load-public-db-actions-15-min-quickstart.m | [Load data from public buckets using Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\load-public-db-actions-15-min-quickstart.m#LoaddatafrompublicbucketsusingDatabaseActions) | d | Uses Database Actions to load data from public object storage buckets. It loads the following two tables:<ul><li>customer</li><li>sales&lowbar;sample</li></ul> |
| adb\load-public-db-actions-no-sales.m | [Load data from public buckets using Database Actions. Sales data not included.](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\load-public-db-actions-no-sales.m#LoaddatafrompublicbucketsusingDatabaseActionsSalesdatanotincluded) | d | Uses Database Actions to load data from public object storage buckets. It loads the following tables:<ul><li>customer&lowbar;contact</li><li>genre</li><li>pizza location</li></ul><p>To load sales&lowbar;sample, use task **Load data from public buckets using Database Actions** |
| adb\load-public-db-actions.m | [Load data from public buckets using Database Actions](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\load-public-db-actions.m#LoaddatafrompublicbucketsusingDatabaseActions) | d | Uses Database Actions to load data from public object storage buckets. It loads the following tables:<ul><li>customer&lowbar;contact</li><li>sales&lowbar;sample</li><li>genre</li><li>pizza location</li></ul> |
| adb\provision-body.m | [Provision Autonomous Database](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\provision-body.m#ProvisionAutonomousDatabase) | d | Provision an ADB. Use the `variables.json` file to update provisioning parameters, including database name, ECPUs, storage and more. |
| adb\query-json-arrays.m | [Query JSON arrays](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\query-json-arrays.m#QueryJSONarrays) | d | Use JSON&lowbar;TABLE to convert arrays into rows. |
| adb\query-json-simple.m | [Query simple JSON attributes](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\query-json-simple.m#QuerysimpleJSONattributes) | d | Use dot notation and JSON&lowbar;VALUE to query JSON documents. Creates a view to simplify subsequent access. |
| adb\query-object-store-contents-with-sql.m | [Query Object Storage contents with SQL](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\query-object-store-contents-with-sql.m#QueryObjectStoragecontentswithSQL) | d | Use SQL to see listing of object storage files and folders. |
| adb\query-spatial.m | [Analyze Spatial Data with SQL](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\query-spatial.m#AnalyzeSpatialDatawithSQL) | d | Oracle provides rich support for querying and analyzing spatial data. Run queries to find pizza shops closest to customers. |
| adb\use-partitioned-external-table-body.m | [Using Partitoned External Tables](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=adb\use-partitioned-external-table-body.m#UsingPartitonedExternalTables) | d | Create partitioned external tables over object storage data using a single, simple API call. Then, load that data. Compare performance of external tables and partitioned external tables. |
| iam\compartment-create-body.m | [Create an OCI Compartment](/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=iam\compartment-create-body.m#CreateanOCICompartment) | d | Create a new compartment using the OCI service console |

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
     "adb\cleanup.m-tasks\adb\cleanup.md":"d",
     "adb\connect-with-sql-worksheet-body.m-tasks\adb\connect-with-sql-worksheet-body.md":"d",
     "adb\connect-with-sql-worksheet-non-admin.m-tasks\adb\connect-with-sql-worksheet-non-admin.md":"d",
     "adb\create-graph.m-tasks\adb\create-graph.md":"d",
     "adb\create-load-json-collection.m-tasks\adb\create-load-json-collection.md":"d",
     "adb\create-user.m-tasks\adb\create-user.md":"d",
     "adb\generate-rsa-key-pair.m-tasks\adb\generate-rsa-key-pair.md":"d",
     "adb\goto-data-load-utility.m-tasks\adb\goto-data-load-utility.md":"d",
     "adb\goto-graph-studio.m-tasks\adb\goto-graph-studio.md":"d",
     "adb\goto-service-body.m-tasks\adb\goto-service-body.md":"d",
     "adb\goto-sql-worksheet.m-tasks\adb\goto-sql-worksheet.md":"d",
     "adb\load-public-db-actions-15-min-quickstart.m-tasks\adb\load-public-db-actions-15-min-quickstart.md":"d",
     "adb\load-public-db-actions-no-sales.m-tasks\adb\load-public-db-actions-no-sales.md":"d",
     "adb\load-public-db-actions.m-tasks\adb\load-public-db-actions.md":"d",
     "adb\provision-body.m-tasks\adb\provision-body.md":"d",
     "adb\query-json-arrays.m-tasks\adb\query-json-arrays.md":"d",
     "adb\query-json-simple.m-tasks\adb\query-json-simple.md":"d",
     "adb\query-object-store-contents-with-sql.m-tasks\adb\query-object-store-contents-with-sql.md":"d",
     "adb\query-spatial.m-tasks\adb\query-spatial.md":"d",
     "adb\use-partitioned-external-table-body.m-tasks\adb\use-partitioned-external-table-body.md":"d",
     "iam\compartment-create-body.m-tasks\iam\compartment-create-body.md":"d"
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
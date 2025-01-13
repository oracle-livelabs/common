<!--
    {
        "name":"Provision an ADB instance for Data Sharing/Data Lake workshops",
        "description":"Learn how to provision Autonomous Database using the OCI console.",
        "author":"Lauran K. Serhal, Consulting User Assistance Developer",
        "last_updated":"Lauran K. Serhal, January 2025"
    }
-->

This lab walks you through how to provision an Autonomous Database instance.

> **Note:** This workshop is directed at administrator users because they have the required privileges.

Estimated Time: 5 minutes

> **Note:** If you have a **Free Trial** account, when your Free Trial expires your account will be converted to an **Always Free** account. You will not be able to conduct Free Tier workshops unless the Always Free environment is available. [Click here for the Free Tier FAQ page.](https://www.oracle.com/cloud/free/faq.html)

1. Log in to the **Oracle Cloud Console** as the Cloud Administrator, if you are not already logged in. On the **Sign In** page, select your tenancy, enter your username and password, and then click **Sign In**. The **Oracle Cloud Console** Home page is displayed.

2. Open the **Navigation** menu and click **Oracle Database**. Under **Oracle Database**, click **Autonomous Data Warehouse**.

3. On the **Autonomous Databases** page, select your compartment from the **Compartment** drop-down list in the **List Scope** section. In this example, we selected our **`training-adw-compartment`**. Click **Create Autonomous Database**. The **Create Autonomous Database** page is displayed.

4. In the **Provide basic information for the Autonomous Database** section, specify the following:

       * **Compartment:** Select your own compartment.
       * **Display Name:** **`ADW-Data-Lake`**.
       * **Database Name:** **`TrainingADW`**.

       ![The completed "Provide basic information for the Autonomous Database" section is displayed.](./images/adb-basic-info.png =75%x*)

5. In the **Choose a workload type** section, accept the **Data Warehouse** default selection.

       ![The selected Data Warehouse option of the "Choose a workload type" section is displayed and highlighted.](./images/adb-workload-type.png " ")

6. In the **Choose a deployment type** section, accept the **Serverless** default selection.

       ![The selected Shared Infrastructure option of the "Choose a deployment type" section is displayed and highlighted.](./images/adb-deployment-type.png " ")

7. In the **Configure the database** section, accept the default selections as follows:

       - **Always Free**: An Always Free databases are especially useful for development and trying new features. You can deploy an Always Free instance in an Always Free account or paid account. However, it must be deployed in the home region of your tenancy. The only option you specify in an Always Free database is the database version. For this lab, we recommend you leave **Always Free** unchecked unless you are in an Always Free account.
       - **Developer**: Developer databases provide a great low cost option for developing apps with Autonomous Database. You have similar features to Always Free - but are not limited in terms of region deployments or the number of databases in your tenancy. You can upgrade your Developer Database to a full paid version later and benefit from greater control over resources, backups and more.
       - **Choose database version**: Select your database version from this drop-down list.
       - **ECPU count**: Choose the number of ECPUs for your service. For this lab, specify **[](var:db_ocpu)**. If you choose an Always Free database, you do not need to specify this option.
       - **Storage (TB)**: Select your storage capacity in terabytes. For this lab, specify **[](var:db_storage)** of storage. Or, if you choose an Always Free database, it comes with 20 GB of storage.
       - **Compute auto scaling**: Accept the default which is enabled. This enables the system to automatically use up to three times more compute and IO resources to meet workload demand.
       - **Storage auto scaling**: For this lab, there is no need to enable storage auto scaling, which would allow the system to expand up to three times the reserved storage.

       > **Note:** You cannot scale up/down an Always Free autonomous database.

       ![Choose the remaining parameters.](./images/adb-create-screen-configure-db-new.png =85%x*)

       >**Note:** You can click the **Show advanced options** link to use your organization's on-premise licenses with **bring your own license** or to take advantage of database consolidation savings with **elastic pools**.

8. In the **Backup retention** section, you can either accept the default value or specify your own preferred backup retention days value. Accept the default **60** days default value.

       ![The Backup retention section is displayed.](./images/backup-retention.png " ")

9. In the **Create administrator credentials** section, specify the following:

       * **Username:** This read-only field displays the default administrator username, **`ADMIN`**.
       **Important:** Make a note of this _username_ as you will need it to perform later tasks.
       * **Password:** Enter a password for the **`ADMIN`** user of your choice such as **`Training4ADW`**.
       **Important:** Make a note of this _password_ as you will need it to perform later tasks.
       * **Confirm password:** Confirm your password.

       ![The completed "Create administrator credentials" section is displayed.](./images/adb-admin-credentials.png =75%x*)

10. In the **Choose network access** section, select the **Secure access from everywhere** option as the access type.

       ![The selected "Secure access from everywhere" option of the "Choose network access" section is displayed and highlighted.](./images/adb-network-access.png " ")

11. In the **Provide contacts for operational notifications and announcements** section, do not provide a contact email address. The **Contact email** field allows you to list contacts to receive operational notices and announcements as well as unplanned maintenance notifications.

       ![Do not provide a contact email address.](images/adb-create-screen-contact-email.png "email")

12. Click __Create Autonomous Database__.

       ![Click create autonomous database.](./images/click-create-adb.png " ")

13. The **Autonomous Database details** page is displayed. The status of your ADB instance is **PROVISIONING**.

    ![The breadcrumbs and PROVISIONING Status on the Autonomous Database Details page are highlighted.](./images/adw-provisioning.png " ")

    A **Check database lifecycle state** informational box is displayed. You can navigate through this tour or choose to skip it. Click **Skip tour**. A **Skip guided tour** dialog box is displayed. Click **Skip**.

    In a few minutes, the instance status changes to **AVAILABLE**. At this point, your Autonomous Data Warehouse database instance is ready to use! Review your instance's details including its name, database version, ECPU count, and storage size.

    ![The Autonomous Database Information tab displays many details about your provisioned database.](./images/adb-provisioned.png " ")

13. Click the **Autonomous Database** link in the breadcrumbs. The **Autonomous Database** page is displayed. The new Autonomous Database instance is displayed.

    ![The provisioned Autonomous Database instance is displayed on the Autonomous Databases page. The state of the instance is AVAILABLE.](./images/adb-page.png " ")
<!--
    {
        "name":"Provision Autonomous Database",
        "description":"provision-body.md common task. Uses the Redwood UI. Use the `variables.json` file to update provisioning parameters, including database name, ECPUs, storage and more.",
        "author":"Lauran K. Serhal",
        "lastUpdated":"July 2025"
    }
-->
1. On the **Autonomous Databases** page, select your desired **region** and **compartment**. Click **Create Autonomous Database** to start the instance creation process. The **Create Autonomous Database** page is displayed.

    <if type="livelabs">
    ![Click Create Autonomous Database.](images/ll-adb-click-create-adb-new.png =65%x*)
    </if>

    <if type="freetier">
    ![Click Create Autonomous Database.](images/click-create-new-adb.png =65%x*)
    </if>

2. On the **Create Autonomous Database Serverless** page, specify the following:

<if type="freetier">
    - **Display name**: Enter a memorable name for the database for display purposes. For this lab, use **[](var:db_display_name)**.
    - **Database Name**: Use letters and numbers only, starting with a letter. Maximum length is 14 characters. _Underscores are not supported_. For this lab, use **[](var:db_name)**.
    - **Compartment**: Select your compartment from the drop-down list.

    ![Enter the required details.](./images/adb-create-screen-names.png =65%x*)

    >**Note:** Ensure that you use the suggested database names as instructed in this step, and not those shown in the screenshots.
</if>

<if type="livelabs">
    - **Display Name**: Enter a memorable name for the database for display purposes. For this lab, use **[](var:db_display_name)**.
    - **Database Name**: Use letters and numbers only, starting with a letter. Maximum length is 14 characters. _Underscores are not supported_. For this lab, use **[](var:db_name_livelabs)**.
    - **Compartment**: Use the default compartment created for your reservation.

    ![Enter the required details.](./images/adb-create-screen-names.png =65%x*)

> **Note:** Ensure that you use the suggested database names as instructed in this step, and not those shown in the screenshots.
</if>

3. In the **Workload type** section, choose a workload type. Select the workload type for your database from the following choices:

    - **Data Warehouse**: Designed to support all standard SQL and business intelligence (BI) tools, and provides all of the performance of the market-leading Oracle Database in an environment that is tuned and optimized for data warehouse workloads
    - **Transaction Processing**: Provides all of the performance of the market-leading Oracle Database in an environment that is tuned and optimized to meet the demands of a variety of applications, including: mission-critical transaction processing, mixed transactions and analytics, IoT, and JSON document store
    - **JSON**: It is Oracle Autonomous Transaction Processing, but designed for developing NoSQL-style applications that use JavaScript Object Notation (JSON) documents. You can store up to 20 GB of data other than JSON document collections. There is no storage limit for JSON collections.
    - **APEX**: It is a low cost, Oracle Cloud service offering convenient access to the Oracle APEX platform for rapidly building and deploying low-code applications

    For this workshop, accept the **Data Warehouse** default selection.

    ![Choose a workload type.](images/adb-create-screen-workload.png =65%x*)

4. In the **Database configuration** section, specify the following:

    - **Always Free**: An Always Free databases are especially useful for development and trying new features. You can deploy an Always Free instance in an Always Free account or paid account. However, it must be deployed in the home region of your tenancy. The only option you specify in an Always Free database is the database version. For this lab, we recommend you leave the **Always Free** slider disabled unless you are in an Always Free account.
    - **Developer**: Developer databases provide a great low cost option for developing apps with Autonomous Database. You have similar features to Always Free - but are not limited in terms of region deployments or the number of databases in your tenancy. You can upgrade your Developer Database to a full paid version later and benefit from greater control over resources, backups and more. For this lab, leave the **Developer** slider disabled.
    - **Choose database version**: Select **23ai** for the database version from this drop-down list.
    - **ECPU count**: Choose the number of ECPUs for your service. For this lab, specify **[](var:db_ocpu)**. If you choose an Always Free database, you do not need to specify this option.
    - **Compute auto scaling**: Accept the default which is enabled. This enables the system to automatically use up to three times more compute and IO resources to meet workload demand.
    - **Storage (TB)**: Select your storage capacity in terabytes. For this lab, specify **[](var:db_storage)** of storage. Or, if you choose an Always Free database, it comes with 20 GB of storage.
    - **Storage auto scaling**: For this lab, there is no need to enable storage auto scaling, which would allow the system to expand up to three times the reserved storage. Accept the default which is disabled.

        > **Note:** You cannot scale up/down an Always Free autonomous database.

        ![Choose the remaining parameters.](./images/adb-create-database-configuration.png =65%x*)

        >**Note:** You can drill down on the **Advanced options** option to take advantage of database consolidation savings with **elastic pools** or to use your organization's on-premise licenses with **bring your own license**. 

5. In the **Backup** section, specify the following:
    - **Automatic backup retention period in days:** You can either accept the default value or specify your own preferred backup retention days value. For this lab, accept the default `60` days default value.
    - **Immutable backup retention:** Accept the disabled default selection.

     ![Choose backup retention.](./images/choose-backup-retention.png =65%x*)

6. In the **Administrator credentials creation** section, specify the following:

    - **Username:** This read-only field displays the default administrator username, **`ADMIN`**. _**Important:** Make a note of this **username** as you will need it to perform later tasks._
    - **Password:** Enter a password for the **`ADMIN`** user of the service instance choice such as **`Training4ADW`**. _**Important:** Make a note of this **password** as you will need it to perform later tasks._
    - **Confirm password:** Confirm your password.

        > **Note:** The password must meet the following requirements:    
            - Must be between 12 and 30 characters long and must include at least one uppercase letter, one lowercase letter, and one numeric character.    
            - Cannot contain the username.    
            - Cannot contain the double quote (") character.    
            - Must be different from the last 4 passwords used.    
            - Must not be the same password that you set less than 24 hours ago.

        ![Enter password and confirm password.](./images/adb-create-screen-password.png =65%x*)

7. In the **Network access** section, select one of the following options:
    - For this lab, accept the default selection, **Secure access from everywhere**.
    - If you want to allow traffic only from the IP addresses and VCNs you specify - where access to the database from all public IPs or VCNs is blocked, select **Secure access from allowed IPs and VCNs only** in the Choose network access area.
    - If you want to restrict access to a private endpoint within an OCI VCN, select **Private endpoint access only** in the Choose network access area.
    - If the **Require mutual TLS (mTLS) authentication** option is selected, mTLS will be required to authenticate connections to your Autonomous Database. TLS connections allow you to connect to your Autonomous Database without a wallet, if you use a JDBC thin driver with JDK8 or above. See the [documentation for network options](https://docs.oracle.com/en/cloud/paas/autonomous-database/adbsa/support-tls-mtls-authentication.html#GUID-3F3F1FA4-DD7D-4211-A1D3-A74ED35C0AF5) for options to allow TLS, or to require only mutual TLS (mTLS) authentication.

        ![Choose the network access.](./images/adb-create-network-access.png =65%x*)

8. In the **Contacts for operational notifications and announcements** section, provide a contact email address. The **Contact email** field allows you to list contacts to receive operational notices and announcements as well as unplanned maintenance notifications.

    ![Provide a contact email address.](images/adb-create-contact-email.png =65%x*)

9. Click **Create**.

10.  The **Autonomous Database details** page is displayed. The status of your ADB instance is **`Provisioning`**.

    <if type="freetier">
    ![Database Provisioning message.](./images/adb-create-provisioning-message-new.png =65%x*)
    </if>

    <if type="livelabs">
    ![Database Provisioning message.](./images/ll-adb-create-provisioning-message-new.png =65%x*)
    </if>

    A **Check database lifecycle state** informational box is displayed. You can navigate through this tour or choose to skip it. Click **Skip tour**. A **Skip guided tour** dialog box is displayed. Click **Skip**.

    In a few minutes, the instance status changes to **`Available`**. At this point, your Autonomous Data Warehouse database instance is ready to use! Review your instance's details including its name, database version, ECPU count, and storage size.
       
    <if type="livelabs">
    >**Note:** In the following screen sample, the database display name is **`MyQuickStart`** and the database name is **`MOVIExxxxxx`**. _In your example, your **database display name** and **database name** might be different_.

    ![Database complete message.](./images/ll-adb-create-complete-message-new.png =65%x*)
    </if>

    <if type="freetier">
    >**Note:** In the following screen sample, the database display name is **`Training-Database`** and the database name is **`TrainingDatabase`**. _In your example, your **database display name** and **database name** might be different_.

    ![Database complete message.](./images/adb-created.png =65%x*)
    </if>

11. Click the **Autonomous Databases** link in the top left of the page. The **Autonomous Database** page is displayed.

    <if type="freetier">
    ![Click left arrow.](./images/click-left-arrow.png =65%x*)
    </if>

    <if type="livelabs">
    ![Database instance displayed.](./images/click-left-arrow.png =65%x*)
    </if>

    Your new Autonomous Database instance is displayed. 

    <if type="freetier">
    In the following sample screen capture, the instance display name is **`Training-Database`**.

    ![Click left arrow.](./images/adb-home-page.png =65%x*)
    </if>

    <if type="livelabs">
    In the following sample screen capture, the instance display name is **`MyQuickStart`**.

    ![Database instance displayed.](./images/ll-adb-page-new.png =65%x*)
    </if>

12. An email message is sent to the contact email that you provided. The email contains useful links that you can use to launch Database Actions, view the Get Started with Autonomous Database Web page, and access the online forums to post a question and collaborate with other Autonomous Database experts. 

    ![provisioning email sent.](./images/provisioning-email-generic.png =65%x*)
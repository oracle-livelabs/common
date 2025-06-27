<!--
    {
        "name":"Provision an Autonomous Database",
        "description":"Steps to provision an autonomous database"
    }
-->

To provision an Oracle Autonomous Database:

1. Sign into your OCI account, and under the Build section, click **Create an ADW database**.

	![Create ADW Database](images/adw-database-rw.png " ")

	 Alternatively, you may click the Cloud menu icon on the upper left corner. This opens the left nagivation menu. Click **Oracle Database** and then click **Autonomous Database**.

	![Autonomous Database under Oracle Database](images/database-adw-rw.png " ")

2. On the Autonomous Databases page, click **Compartment** to select a compartment. By default, it will show the root compartment. Click **Create Autonomous Database**. This opens the _Create Autonomous Database Serverless_ page.

   ![Create Autonomous Database option](images/create-autonomous-db-rw.png " ")

    > **Note:** You must select your **OCI Home Region** if you intend to create an Always-Free Autonomous Database.

     ![Create Autonomous Database option](images/create-adb-home-region-rw.png " ")


3. On the *Create Autonomous Database Serverless* page, provide the basic information about the database. By default, a database name and a display name for the database are provided. You can modify these names to enter a user-friendly display name for the ADB instance to easily identify the resource. The display name does not have to be unique.    

   > **Note:** We will choose the Display Name *OMLLABS* and the Database Name *OMLLABS* for our example.  You can use the same or create your own, but neither supports blank spaces in the name

   ![Autonomous Database information](images/adb-basic-info-rw.png " ")

4. For Workload Type, select **Data Warehouse**.

   ![Autonomous Database Workload type](images/workload-type-rw.png " ")

5. For Database Configuration, select **Always Free**. 

    * For the Always Free option, both releases 19c and 23ai are available.  Let’s use the default **23ai**.  You can create **Always Free** resources both in Free Tier and Paid accounts, with the requirement of it being created in your **OCI Home Region** as mentioned above in Task 2.

        ![Autonomous Database always free](images/db-config-always-free-rw.png " ")
   
    * If you are using a standard **Paid Account** and decide to provision a **paid database** instead of an **Always Free**, you will see more options available that include ECPU count, Compute auto scaling and Storage auto scaling. For this workshop **the minimum compute unit of 2 ECPUs with auto scaling is sufficient**.  If you decide to use a **Developer Database** option, it already has the configuration necessary for this workshop.

        > ![Configure Database](images/db-configuration-ecpu-rw.png " ")

	    > You will also be offered an **Immutable Backup Retention** plan billed separately. This option is not available in the Always Free Autonomous Database. We will not be using backups in this workshop, so you can easily put it to a minimum of 1 day without issues.

        > ![Configure Database](images/db-configuration-backup-rw.png " ")

        The Advanced options - **Compute Model** and **Bring your own license** are available only for a paid version.

6. Create your Autonomous Database administrator credentials by providing a password. You will need these credentials to sign into this Autonomous Database instance.   

	> **Note:** The default administrator username is ADMIN. The ADMIN password must be 12 to 30 characters and contain at least one uppercase letter, one lowercase letter, and one number. The password cannot contain the double quote (") character or the username "admin".

	![Database Administrator credentials](images/db-admin-credentials-rw.png " ")

7. For network access, select **Allow secure access from everywhere.**

    ![Network Access settings](images/create-adw-network-rw.png " ")

8. In the **Contacts for operational notifications and announcements** section, provide your email ID for any notifications and announcements. You also have the option to add additional email IDs by clicking **Add customer contact**.

	 ![Contact details](images/contact-details-rw.png " ")

9. Under **Advanced Options**, let's retain the default for this workshop. 

10. Click **Create**.  The Oracle Autonomous Database instance starts provisioning. It will show the status **Provisioning**. .
    ![ADB listed](images/adw-starts-provisioning-rw.png " ")

    Once the provisioning is complete, the database details are listed with the status Available.

	  ![ADB details](images/adw-details-rw.png " ")

This completes the task of provisioning an Oracle Autonomous Database.


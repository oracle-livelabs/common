# Connect Oracle Autonomous AI Database to Mongo API

## Introduction

In this lab, we will connect an Oracle Autonomous AI Database to MongoDB shell tools from our local machine.

**NOTE**: Mongo Shell is provided by MongoDB Inc. Oracle is not associated with MongoDB Inc, and has no control over the software. These instructions are provided simply to help you learn about Oracle Database API for MongodDB. Links may change without notice.

Estimated Time: 10 minutes

### About Oracle REST Data Services
Oracle REST Data Services (ORDS) is a mid-tier application that enables you to easily expose Oracle Database data and objects as RESTful Web Services. ORDS bridges the gap between relational data and modern web, mobile, and cloud-based applications, allowing developers to interact with Oracle databases using simple HTTP(S) calls and JSON payloads. ORDS makes it straightforward to build modern, RESTful APIs over your Oracle Database, unlocking database data and logic for web, mobile, and integration scenarios.
![ORDS picture](./images/ords-pic.png " ")
For non-autonomous databases, if you deploy ORDS version 22.3 or later, you can use the MongoDB API with any Oracle Database, release 21c or later, regardless of whether it is deployed on-premises or in the cloud.

### Objectives

In this lab, you will:
* Get the Mongo API string from Oracle Autonomous AI Database
* Run MongoDB Shell executable `mongosh` to connect to the Oracle Autonomous AI Database

### Prerequisites

This lab assumes you have:

* An Oracle Autonomous AI Database from a paid or free tenancy
* MongoDB Shell on your local machine

  **Note:** If you have a **Free Trial** account, when your Free Trial expires your account will be converted to an **Always Free** account. You will not be able to conduct Free Tier workshops unless the Always Free environment is available. **[Click here for the Free Tier FAQ page.](https://www.oracle.com/cloud/free/faq.html)**

## Task 1: Find the MongoDB API Connection URL

1. Go to your running Autonomous AI Database tab **Tool configuration** and find the **MongoDB API**:

    ![Tool configuration MongoDB API](./images/newmongogoapi.png " ")
    **Your Autonomous AI Database should be configured with an enabled MongoDB API, ready for you to go. If you don't see the MongoDB API enabled in your environment, then let's enable it.  Otherwise, skip to step 2.**

    You need to do two things:

      * Enable Access Control Lists (ACLs)

        Due to security precautions, the MongoDB API is not enabled to the public out of the box, but requires some conscious control access. To enable ACLs, go to the details page of your Autonomous AI Database and select to edit the access control lists.

        ![Set ACL](./images/set-acl.png " ")

      *  Choose an ACL that enables the machine where you have installed the MongoDB tools to access the database. For   demonstration purposes, the most pragmatic way to do this is to set the CIDR block to 0.0.0.0/0 which allows full access from the Internet. **This is for demonstration purposes only and never meant for production environment or systems with sensitive data.**

        ![Set CIDR block](./images/set-cidr-block.png " ")

        Save your changes and go back to the detail page of your Autonomous AI Database.
2. If the MongoDB API is successfully enabled, it will show you the URI to copy.

      ![Copy Mongo URI](./images/copy-mongo-uri.png " ")

3. Copy the MongoDB API URI. The MongoDB API URI looks similar to this:

      ```bash
      mongodb://[user:password@][ADB Instance name].adb.[region].oraclecloudapps.com:27017/[user]?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true
      ```

4. Next, set an environment variable, *`URI`*, on your machine to the Mongo API connection string you copied.

      On Mac or Linux, issue the following command in your shell to set the environment variable. If you close the shell, you need to set this variable again.

      ```bash
      $ <copy>
      export URI='[user:password@][ADB Instance name].adb.[region].oraclecloudapps.com:27017/[user]?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true'
      </copy>
      ```

      Example:

      ```
      export URI='mongodb://admin:*redacted*@ATP3834*redacted*.adb.us-ashburn-1.oraclecloudapps.com:27017/admin?authMechanism=PLAIN&authSource=$external&tls=true&retryWrites=false&loadBalanced=true'
      ```

      On Windows systems, issue the following command in your shell to set the environment variable. If you close the shell, you need to set this variable again.

      ```bash
      $ <copy>
      set URI="[user:password@][ADB Instance name].adb.[region].oraclecloudapps.com:27017/[user]?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true"
      </copy>
      ```

      > **_NOTE:_** Please make sure you replace both the user and password. Also, keep in mind that the **[user]** tag needs to be updated in two places.

      <if type="sandbox">

      In your LiveLabs Sandbox environment, the user is `admin`. You can find the password for the user on the **View Login Info** 

      ![ADB Admin password in the LiveLabs Sandbox](./images/adb-admin-password.png " ")


      </if>


      You might need to escape some characters as well.



      | Special Character |   !   |   #   |   $   |   %   |   &   |   '   |   (   |   )   |   *   |   +   |
      | ----------------- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
      | Replace with      |  %21  |  %23  |  %24  |  %25  |  %26  |  %27  |  %28  |  %29  |  %2A  |  %2B  |
      {: title="Special characters and their replacements 1"}

      | Special Character |   ,   |   /   |   :   |   ;   |   =   |   ?   |   @   |   [   |   ]   |
      | ----------------- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
      | Replace with      |  %2C  |  %2F  |  %3A  |  %3B  |  %3D  |  %3F  |  %40  |  %5B  |  %5D  |
      {: title="Special characters and their replacements 2"}

      Please check [this link](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/mongo-using-oracle-database-api-mongodb.html#GUID-44088366-81BF-4090-A5CF-09E56BB2ACAB) to learn more about Using MongoDB API in the Oracle AI Database.

## Task 2: Connect MongoDB shell to Autonomous Database

1. Now with the *`URI`* set, we can connect to MongoDB Shell. Run the command below to connect.

    On Mac and Linux systems:

    ```
    $ <copy>mongosh $URI</copy>
    ```
    
    On Windows systems:

    ```
    $ <copy>mongosh %URI%</copy>
    ```
    ![Connect to the Mongo Shell](./images/mongo-shell.png " ")

	If all goes well you will see an "admin>" prompt. If not, check your URL carefully:

	* Is it enclosed in single quotes (Mac) or double quotes (Windows)?
	* Is your password correct, with any special characters quoted as above?
	* Did you leave any [ square brackets ] in the URL where they should have been removed?
	* Do you have the : sign between the user and password, and the @ sign after the password? 
	* Is the whole command on a single line with no line breaks?

## Learn More

* [Using the Oracle Database API for MongoDB](https://docs.oracle.com/en/database/oracle/mongodb-api/mgapi/index.html)
* [Oracle Database API for MongoDB Blog Post](https://blogs.oracle.com/database/post/mongodb-api)
* [Simple example to test your MongoDB connection using a node.js application](https://docs.oracle.com/en/cloud/paas/autonomous-database/adbsa/mongo-using-oracle-database-api-mongodb.html#GUID-935C72EB-5ECF-4663-9BCA-860708EFAE2A__SUBSTEPS_BQL_R2Y_BRB)

## Acknowledgements

- **Author** - Roger Ford, Principal Product Manager
- **Contributors** - Kamryn Vinson, Andres Quintana
- **Last Updated By/Date** - Eileen Beck, November 2025

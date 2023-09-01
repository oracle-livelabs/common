<!--
    {
        "name":"Connect with SQL Worksheet",
        "description":"Connect to Autonomous Database using the SQL Worksheet in Database Actions"
    }
-->

Although you can connect to your Oracle Autonomous Database using desktop tools like Oracle SQL Developer, you can conveniently access the browser-based SQL Worksheet directly from your Autonomous Database console.

1.  If you are not logged in to Oracle Cloud Console, log in and select **[](var:db_workload_type)** from the navigation menu, make sure you are in the right compartment where you ADB is provisioned and navigate into your **[](var:db_display_name)** instance.

    ![Oracle Home page left navigation menu.](images/oci-navigation-adb.png " ")


    ![Autonomous Databases homepage.](images/oci-adb-list-with-db.png " ")

2. In your [](var:db_display_name)'s details page, click the **Database Actions** button.

    ![Click Database Actions button.](./images/adb-dbactions-goto.png " ")

    Logging in from the OCI service console expects you are the ADMIN user. Log in as [](var:db_user_name) if you are not automatically logged in.

3. The Database Actions page opens. In the **Development** box, click **SQL**.

    ![Click SQL.](./images/adb-dbactions-click-sql.png " ")

4.  The first time you open SQL Worksheet, a series of pop-up informational boxes may appear, providing you a tour that introduces the main features. If not, click the Tour button (labeled with binoculars symbol) in the upper right corner. Click **Next** to take a tour through the informational boxes.

    ![SQL Worksheet.](./images/adb-sql-worksheet-opening-tour.png " ")
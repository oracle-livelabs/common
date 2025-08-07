<!--
    {
        "name":"Provision an ADB instance for Data Sharing/Data Lake workshops",
        "description":"(Redwood UI) Learn how to provision Autonomous Database using the OCI console.",
        "author":"Lauran K. Serhal, Consulting User Assistance Developer",
        "lastUpdated":"Lauran K. Serhal, July 2025"
    }
-->

1. On the **Data Load** page, click the **Load Data** card.

    ![Select Link Data and Cloud Store.](images/data-load-home-page-callout.png =70%x*)

2. On the **Load Data** page, click the **Cloud Store** tab.

    ![Click Cloud Store.](images/click-cloud-store-tab.png =70%x*)

3. Copy the following object storage URL and paste it in the **Select Cloud Store Location or enter public URL** field. The **`moviestream_landing`** Oracle Object Storage bucket that contains the data is located in a different tenancy than yours, **`c4u04`**; therefore, you will use the following URL.

    ```
    <copy>
    https://objectstorage.us-ashburn-1.oraclecloud.com/n/c4u04/b/moviestream_landing/o
    </copy>
    ```

    ![Enter public bucket URL.](images/public-bucket-url.png)

4. A list of the folders in the selected Object Storage bucket is displayed on left side section of the page. You can drag and drop the desired folders from this public bucket from this section to the data loading job section on the right.

    ![The Load Cloud Object page appears](images/bucket-folders-displayed.png)

5. Drag the **`customer_contact`** folder and drop it onto the data loading job section.

    ![Drag the customer_contact folder](images/drag-drop-customer-contact.png)

6. A **Load to Single Target Table** dialog box is displayed to prompt you whether or not you want to link all objects in this folder matching **.csv** to a single target table. This folder contains a single file, `customer-contact.csv`. In general, data lake folders contain many files of the same type, as you will see with sales data. Click **Yes**.

    ![Click yes to load objects to a single table.](images/load-to-single-table.png =60%x*)

    The **`customer_contact`** target table to be created for the selected `.csv` file is displayed in the data loading job section.

    ![The customer_contact target table is displayed.](images/customer_contact-target-table.png " ")

7. Drag and drop the **`genre`**, **`sales_sample`**, and **`pizza_location`** folders onto the data linking job section. Click **Yes** when prompted for each target table.

    ![Drag and drop three more folders.](images/drag-drop-3-folders.png)

8. Click the **Settings** icon (pencil) for the **`customer_contact`** link task to view its settings.

    ![Click the pencil icon to open settings viewer for customer_contact load task](images/click-customer-contact-settings.png =65%x*)

    The **Load Data from Cloud Store Location customer_contact** settings panel is displayed.

9. The **Database Actions** load job will create a **`CUSTOMER_CONTACT`** table with the listed columns and data types that are based on the selected `.csv` file. Review the information and the loading options. In the **Mapping** section, notice that you can change the target column names, data types, and length/precision. Click **Close** to close the settings viewer panel.

    ![View the settings for customer_contact load task](images/customer-contact-settings.png)

10. Click the **Settings** icon (pencil) for the **`sales_sample`** load task to view its settings.

    ![View the sales-sample load task settings.](images/click-sales-sample-settings.png =65%x*)

11. The Load tool makes intelligent choices for the target table name and properties. Since this is an initial load, accept the default option of **Create Table**, which conveniently creates the target table in the Autonomous Database instance, without the need to predefine the table in SQL. Change the name of the target table to be created from **`SALES_SAMPLE`** to **`CUSTSALES`**. Next, click **Close**.

    ![Update table name](images/change-target-table-name.png)

12. Click **Start** to run the data load job. 

    ![Click Start](images/click-start.png)

13. In the **Start Load From Cloud Store** dialog box, click **Run**.

    ![Click Run](images/click-run.png)

    > **Note:** The load job can take about 2 minutes to complete.

14. After the load job is completed, make sure that all of the data load cards have the copy icons next to them. You can click the **Report** button for each load job to view a report of total rows processed successfully and failed for the selected table.

    ![Load job tasks completed. View the genre load task settings.](images/load-completed.png)

15. Click the **Report** button for the **`CUSTSALES`** load job. The details about the successful load job is displayed. Click **Close**.

    ![Click Report for custsales.](images/click-custsales-report.png)

16. Click the **ellipsis** icon for the **`genre`** load task to view its settings. Next, click **Table** > **View Details** from the context menu.

    ![View genre data.](images/click-genre-ellipsis.png)

17. The **Preview** tab is selected by default. This shows the **`genre`** data.

    ![View genre data](images/preview-genre-table.png)

18. Click **Close** to exit the **`genre`** task preview and return to the load data dashboard.

     ![Click Close.](images/data-load-page.png)
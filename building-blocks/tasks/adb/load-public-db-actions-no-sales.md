<!--
    {
        "name":"Load data from public buckets using Database Actions. Sales data not included.",
        "description":"Uses Database Actions to load data from public object storage buckets. It loads the following tables:<ul><li>customer_contact</li><li>genre</li><li>pizza location</li></ul><p>To load sales_sample, use task **Load data from public buckets using Database Actions**"
    }
-->
1. In the **Database Actions Launchpad** home page, under the **Data Studio** section, select the **DATA LOAD** card. Under **What do you want to do with your data?** select **LOAD DATA**, and under **Where is your data?** select **CLOUD STORE**, then click **Next**

    ![Select Load Data, then Cloud Store](images/select-load-data-from-cloud-store.png)

2. The **Load Cloud Object** page appears. Use this page to drag and drop tables from the public object storage bucket to the data loading job. Copy the following object storage URL to the **Select Cloud Store Link or enter public URL field**:

    ```
    <copy>
    https://objectstorage.us-ashburn-1.oraclecloud.com/n/c4u04/b/moviestream_landing/o
    </copy>
    ```

    ![Enter URL](images/cloud-location-url.png)

    Click ENTER on your keyboard. This will take you to the data loading tool. You will see a list of folders on the left side from which you can drag and drop to the data loading job.

    ![The Load Cloud Object page appears](images/load-cloud-object-page-appears.png)

3. You will select multiple folders. First, drag the **customer\_contact** folder over to the right hand pane. Note that a dialog box appears asking if you want to load all the files in this folder to a single target table. In this case, the folder has only a single file, `customer-contact.csv`. Frequently, data lake folders contain many files of the same type, as you will see with sales data. Click **Yes**.

    ![Drag the customer_contact folder](images/drag-customer-contact-folder.png)

4. Perform the same drag and drop steps for **genre**, and **pizza\_location**.


5. Click the 3-dot ellipsis menu for the **customer\_contact** load task. In the pop-up menu, click **Settings** to view the settings for this task.

    ![Click the pencil icon to open settings viewer for customer_contact load task](images/cc-viewsettings.png)

6. In the settings viewer, you can see that Database Actions will create a **CUSTOMER_CONTACT** table with the list of columns and data types that will be created from the csv file. Take a moment to examine the preview information and loading options. In the Mapping section, notice that you can change the target column names and data types. They all look correct, so click **Close** to close the settings viewer.

    ![View the settings for customer_contact load task](images/settings-viewer-for-customer-contact.png)

7. Now click the **Start** button to run the data load job.

    ![Run the data load job](images/rundataload.png)

    The job should take about 2 minutes to run.

8. Check that all of the data load cards have green tick marks in them, indicating that the data load tasks have completed successfully. Click the on the **genre** task link to view the results:

    ![Check the job is completed](images/loadcompleted-no-sales.png)

9. Let's do a quick review of the loaded data. Click the **Table** tab to view the **genre** data:

    ![View genre data](images/adb-dataload-genre-table.png)

    The data looks good! Click **Close** to exit the **genre** task and then click **Done** to exit the DATA LOAD tool and return to the Database Actions Launchpad.

<!--
    {
        "name":"goto-service-body.md",
        "description":"Navigate to ADB using the OCI Navigation menu. AUTHORS: For expediency, this task uses the ADMIN user/password to open Database Actions. In your workshop, you might want to substitute a different user/password to open Database Actions.",
        "author":"Lauran K. Serhal, Consulting User Assistance Developer",
        "lastUpdated":"Lauran K. Serhal, July 2025"
    }
-->
1. Open the **Navigation** menu.

    ![Open the Navigation menu.](images/open-navigation-menu.png =65%x*)

2. Under **Oracle Database**, click **Autonomous Database**.

    ![Click Autonomous Database (ATP or ADW).](images/oci-navigation-adb.png =65%x*)

    <if type="livelabs">
    _**Important:** At the time of updating this workshop (July 8, 2025), there is a known issue with OCI and using the sandbox environment reservations (the green button). The old **Autonomous Databases** page is displayed instead of the new Redwood UI page._  

    ![The old Autonomous Databases page.](images/old-adb-page.png =65%x*)

    To correct this issue, simply click **Reload this page** icon in your browser. The newly designed **Autonomous Databases** page is displayed. 
    
    >**Note:** The **Couldn't load data** error on the page is due to being in the wrong compartment. You will learn how to navigate to your assigned compartment next. 

    ![The new Autonomous Databases page.](images/new-adb-page.png =65%x*)

    </if>

    <if type="freetier">
    The **Autonomous Databases** page is displayed.

    ![The Autonomous Databases page is displayed.](images/autonomous-databases-page.png =65%x*)

    OCI resources are organized into compartments. Click the **Compartment** field to select the compartment where you want to create your Autonomous Database.
    </if>
    
    <if type="livelabs">
    OCI resources are organized into compartments. To navigate to your assigned sandbox reservation compartment, click the **Compartment** field. Next, enter your assigned compartment name (or partial name) from the **Reservation Information** page in the **Compartment** text box. Once your assigned compartment is displayed in the drop-down list under the **`Livelabs`** node, click it, and then click **Apply filter**.
    
    ![Select your assigned compartment.](images/ll-select-compartment.png =65%x*)

    >**Note:** For more details on finding your assigned resources in your reservation such as the username, password, compartment and so on, review the **Get Started with LiveLabs** lab in the Navigation menu on the left.
    </if>

    <if type="freetier">
    > **Note:** Avoid the use of the `ManagedCompartmentforPaaS` compartment as this is an Oracle default used for Oracle Platform Services.
    </if>

3. You can use the **Search and Filter** field to control the list of Autonomous Databases that are displayed on the page. This is useful when you are managing many Autonomous Databases. For example, you can use **Workload type** to filter the Autonomous Database list by selecting your workload type. You can also use the **State** filter to view databases that are `available`, `stopped`, `terminated` and much more.

    ![Database list.](images/search-and-filter.png =65%x*)

<if type="freetier">
3. If you are using a Free Trial or Always Free account, and you want to use Always Free Resources, you need to be in a region where Always Free Resources are available. You can see your current default **region** in the top, right hand corner of the page.

    ![Select region on the far upper-right corner of the page.](./images/oci-region-list.png =65%x*)
</if>

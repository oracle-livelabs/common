<!--
    {
        "name":"Create an OCI Compartment",
        "description":"Create a new compartment using the OCI service console",
        "author":"Lauran K. Serhal, Consulting User Assistance Developer",
        "last_updated":"Lauran K. Serhal, May 2025"
    }
-->

A compartment is a collection of cloud assets, like compute instances, load balancers, databases, and so on. By default, a root compartment was created for you when you created your tenancy (for example, when you registered for the trial account). It is possible to create everything in the root compartment, but Oracle recommends that you create sub-compartments to help manage your resources more efficiently.

_If you are using an Oracle LiveLabs-provided sandbox, you don't have privileges to create a compartment and you can either review or skip this first task. Oracle LiveLabs has already created a compartment for you and you should use that one. Even though you can't create a compartment, you can review the steps below to see how it is done._

>_**Note:** This is an optional task. If you already have a compartment that you are using, you don't have to create a new compartment._

1. Open the **Navigation** menu.

    ![Click the Navigation menu.](./images/click-navigation-menu.png =50%x*)

2. Click **Identity & Security**. Under **Identity**, click **Compartments**.

    ![The Navigation menu is clicked. The navigation path to Compartments is displayed.](./images/navigate-compartment.png =60%x*)

    For faster navigation, you can pin items that you use frequently. To pin an item, hover over the menu item and then click pin to the left of the item name.

    ![An example on pinning an item such as Data Lake/Data Catalog for quicker access is shown.](./images/pin-items.png =60%x*)

    The pinned item is displayed in the **Pinned** section of the **Home** tab the next time you use the Navigation menu.

    ![An example that shows the Compartment item pinned.](./images/pinned-item.png =60%x*)

    The **Recently visited** section of the **Home** tab shows recently used navigation items.

    To quickly find navigation menu items, use the **Search** text box.

3. On the **Compartments** page, click **Create Compartment**.

   ![The Compartments page is displayed. The Create Compartment button is highlighted.](./images/click-create-compartment.png =60%x*)

4. In the **Create Compartment** dialog box, enter a name and a description in the **Name** and the **Description** fields respectively.

5. In the **Parent Compartment** drop-down list, select your parent compartment, and then click **Create Compartment**.

   ![On the completed Create Compartment dialog box, click Create Compartment.](./images/create-compartment.png =60%x*)

   The **Compartments** page is re-displayed and the newly created compartment is displayed in the list of available compartments.

   ![The newly created compartment is highlighted with its status as Active.](./images/compartment-created.png =60%x*)

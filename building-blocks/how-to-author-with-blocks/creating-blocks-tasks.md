# Create Building (Common) Blocks and Tasks

## Introduction

**Everyone should contribute to Blocks and Tasks!** If you are creating a workshop and you have labs or tasks that you think will be useful to others - share them! It's easy - here's how.

### Create a block or task?

The block is equivalent to a lab. It may be difficult not to provide workshop specific information - especially in the introduction. If you can keep the content generic, then create a block!

Very frequently, a lab has tasks that are very generic. For example, Navigating to the object storage service is the same. So, make that a task and use variables to specify the compartment and bucket. Now, any lab that needs to navigate to the object store can simply include the task in their markdown. It's a one liner! And, when the UX changes, one update to the task will update all the workshops that use the task.

Don't forget to use tasks when creating your block :).

### Prerequisites

Ensure that have met the pre-requisites covered in the **Author LiveLabs Workshops with Building (Common) Blocks and Tasks lab > Task 2: Pre-requisites to Using Building Blocks and Tasks**.

## Task 1: Create your lab's markdown file

Create your workshop as you normally would. Try to keep content generic enough so that it can be used in multiple contexts. And, it may mean using variables instead of hardcoding names. Create the common block or task in the appropriate folder (repo). For example, if you are creating a common task for an ADB workshop, you'll create the common task in the **`common > building-blocks > tasks > adb`** folder.

To create a new folder or file in the your chosen folder such as the adb folder, click the **New File...** or **New Folder...** icons in Visual Studio Code.

![Create a new common block or task](images/create-file-folder-icon-vsc.png " ")

In our example, we will create the new common block in a folder named **provision**.

![Create the common block in the provision folder](images/create-common-block.png =50%x*)

## Task 2: Add the required comment block to your markdown file

The one addition you'll need to make to your markdown is a comment block at the beginning of the file. This comment block provides a name, description, author, and last updated fields for your block or task. **The documentation's master list of blocks and tasks in listed in this workshop is derived from these comment blocks**.

![Add the comment block to the .md file](images/comment-block.png " ")

**_Important:_** _You must use the exact spelling of the comment block fields names. Pay attention to the **`lastUpdated`** field where the camel case naming convention is used. If you don't use the exact spelling, your common block or task will not appear in the list of available blocks or tasks._

## Task 3: Enter the content of the building block

1. Enter the remaining content of the building block. Here's the complete building block. Notice that this building block uses two common tasks! We will cover how to create and use common tasks a little bit later.

    ![The complete building block](images/completed-building-block-example.png =75%x*)

2. Save your markdown file to the appropriate repo folder (block or task) under the **building-blocks** root folder to which you already navigated. Each cloud service has its own folder in either the blocks or tasks parent folder. If your cloud service's folder doesn't exist yet, then simply add a new folder. In this example, we created the building block in the using the following path: 

C:\Users\LSERHAL\Documents\livelabs-clones\common\building-blocks\blocks\adb\provision\provision-data-sharing-lake-block.md 

```
adb
.. building-blocks
.... blocks
........adb
........oac
.... tasks
........adb
........iam

```

## Task 4: Regenerate the documentation

After you create (or modify or delete too) new blocks and tasks, regenerate the documentation by running the **generate-documentation.py** python script found in the `/common/building-blocks/scripts` folder. This script generates much of the how-to-author-with-blocks documentation.

1. Navigate to the `/common/building-blocks/scripts` folder.

2. Right-click the **generate-documentation.py** file name, and then select **Open in Integrated Terminal** from the context menu.

    ![Navigate to script and open in terminal](images/open-integrated-terminal.png " ")

3. Run the script. Copy the following code and then paste it on the command prompt. Next, press the `[Enter]` key.

    ```
    <copy>
    python generate-documentation.py
    </copy>
    ```

    ![Run Python script](./images/run-python-script.png " ")

    The script output is displayed.

    ![The script output](./images/script-output.png " ")

4. Navigate to and review the following to display any additions, deletions, or edits that you might have made:

    * `adb.md`
    * `how-to-author-with-blocks.md`
    * `manifest.json`

## Task 5: Push your changes to your fork and production

1. Push your changes to the common repo to your fork. In this example, we are using GitHub Desktop.

    ![Push changes to fork](./images/push-to-fork.png " ")

    ![Push origin](./images/push-origin.png " ")

2. Submit a Pull Request to move your changes to production.

    ![Submit a Pull Request](./images/submit-pr.png " ")

3. Wait for your PR to be approved and merged and then use the following URL to this building blocks documentation workshop to confirm your changes.

    https://oracle-livelabs.github.io/common/building-blocks/how-to-author-with-blocks/workshop/index.html?lab=how-to-author-with-blocks


## Acknowledgements
* **Author:**
    * Lauran K. Serhal, Consulting User Assistance Developer
* **Contributors:**
    * Marty Gubar, Product Manager
    * Kevin Lazarz, Senior Manager, Product Management
* **Last Updated By/Date:** Lauran K. Serhal, March 2025

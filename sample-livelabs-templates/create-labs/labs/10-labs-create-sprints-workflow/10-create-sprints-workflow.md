# Develop LiveLabs Sprints

## Introduction

This lab walks you through the steps to set up the Sprints repository in the Oracle LiveLabs GitHub Project, provides an overview of the Sprints Folder Structure, shows you how to develop sprint content, commit changes to your clone, create a pull request, and submit a new sprint publish request in WMS.

> **Note:** For questions about LiveLabs Sprints or the sprint development lifecycle, contact the LiveLabs Sprints Admin team through the WMS messaging system, email us at livelabs-help-sprints_us@oracle.com, or message us in the #workshop-authors-help Slack channel (share the sprint WMS ID and LiveLabs ID if available).

### What Are Oracle LiveLabs Sprints?

LiveLabs Sprints differ from standard LiveLabs workshops. A LiveLabs Sprint provides users with quick, easy help by answering a specific technical question, challenge, or issue. Users should complete a sprint in less than 10-15 minutes.

The following diagram shows the general LiveLabs Sprints Development Workflow process you need to follow to set up your environment and develop sprints. You perform most tasks only once.

![Sprints Workflow](./images/sprints-workflow.png " ")

### Objectives

* Set Up Oracle LiveLabs Sprints GitHub Repository
* Understand the Oracle LiveLabs Sprints Folder Structure and Components
* Create Content for Your Sprint
* Commit Changes to Your Clone and Create Pull Request
* Request Sprint Publish in WMS

### What Do You Need?

To start Oracle LiveLabs Sprints development, complete Lab 2:

* A GitHub Account (steps in Lab 2 Task 1)
* GitHub Desktop installed on your machine (steps in Lab 2 Task 3)
* Visual Studio Code editor installed (steps in Lab 2 Task 4) with LiveServer extension (steps in Lab 2 Task 5)

## Task 1: Set Up Oracle LiveLabs Sprints GitHub Repository

> **Note:** Before you create a new sprint, check if a sprint with the same content exists in [WMS](http://livelabs.oracle.com/wms). If no sprint with your content exists, proceed.

1.  Navigate to the [oracle-livelabs/sprints](https://github.com/oracle-livelabs/sprints) repository in the Oracle LiveLabs GitHub Project.

    ![Sprints Repository](./images/sprints-repository.png " ")

2.  Fork the **oracle-livelabs/sprints** repository (steps in Lab 3 Task 1 Steps 4-6).

3.  Create a local clone of the forked repository (steps in Lab 3 Task 2).

## Task 2: Understand the Oracle LiveLabs Sprints Folder Structure and Components

> **Note:** You will create your sprint folder within the domain folder of your cloned sprints repository. Review the different domain folders and decide on a folder for your sprint. If no existing folder fits your sprint, contact our LiveLabs Sprints team by emailing us at [livelabs-help-sprints_us@oracle.com](livelabs-help-sprints_us@oracle.com) or send us a message in the Slack #workshop-authors-help channel with the details of the folder you wish to create. We respond within 20 minutes over Slack or within 24 hours via email.

1.  The following image shows the folder structure of the sample **sprint** opened in Visual Studio Code. Inside the **oracle-livelabs/sprints** repository in the Oracle LiveLabs GitHub Project, there is a sample-sprints folder. You can see this structure at https://github.com/oracle-livelabs/common/tree/main/sample-livelabs-templates/sample-sprints. Start sprint development by copying this sprint folder inside the sprint folder.

    ![Example of sprint structure.](./images/sample-sprint-structure.png " ")

2.  The following describes the components of the above example:
    * The root folder of this example is the sprint name, **sprint**.
    * Each sprint has its own:
        * **images** folder that contains the screenshots used in this sprint.
        * **.md** file that contains this sprint's content.
        * **index.html** file, which executes when accessed by a browser. When you copy this file from the *sample-sprints* folder, you can use it without changes.
        * **manifest.json** file, which defines the sprint structure that the `index.html` file renders. When you copy this file from the *sample-sprints* folder, customize it for your sprint.

3.  The following screenshot shows a sample `manifest.json` file opened in Visual Studio Code.

    > **Note:** Ensure that the **livelabs-help-sprints_us@oracle.com** email is listed in ***help***.

    ![Sample manifest json file.](./images/sprint-manifest.png " ")

## Task 3: Create Content for Your Sprint

1.  Every day before you start editing your content, perform a Merge in GitHub Desktop (steps in Lab 3 Task 3). Merging synchronizes the content in your cloned repository with the latest content on the upstream/main repository and ensures you have the most recent versions of the templates and other workshops/labs.

2.  Copy the files in the **sprint** folder in the **sample-sprints** folder into the domain folder you decided, or copy from an existing sprint in that domain folder to create your content.

    ![Copy sprint folder](./images/copy-sprint-folder.png " ")

3.  Rename your sprint folder and the markdown (.md) file to match the folder name.

4.  To edit the .md file of your sprint, open the text editor of your choice. In this case, we use VS Code. Click File > Open.

    ![click open in VS Code](./images/click-open-in-vscode.png " ")

5.  Navigate to your sprint folder and click Open. Your sprint folder, along with the images folder, markdown, index.html, and manifest.json files, displays in your text editor.

    ![sprint folder open in VS Code](./images/sprint-folder-open-in-vscode.png " ")

6.  If you want to add images to your sprint, include them in the images folder. You can delete the images folder if you don't need it.

7.  Edit the manifest.json file.
    -   help: Update the field to point to *livelabs-help-sprints_us@oracle.com* email.
    -   title: Update the first title field with your sprint title.
    -   description: Add a short description about the sprint.
    -   filename: Update this field with your file name.
    -   Other related sprints: The manifest.json is like your book map file in SDL. If you want to add related sprints, update the title fields with the respective sprint titles, their descriptions, and absolute paths (steps in Lab 4 Task 4) to their markdown files in filename. You can add up to six related sprints and delete the existing sprint sections if you don't need them.

        ![edit manifest.json file](./images/edit-manifest-file.png " ")

8.  Use the formatting in the .md file you copied earlier and edit it to develop your sprint.

9.  Develop the content considering all security-related points mentioned in Lab 4 Task 3 of the LiveLabs guide.

10. Preview your sprint using the Live Server.

You can refer to Lab 4 for markdown features for content development and Lab 2 Task 6 for helpful resources and extensions for VS Code.

## Task 4: Commit Your Changes to Your Clone and Create Pull Request

You will push the updated content from your clone to the origin of your clone (your fork) to synchronize your clone with your fork. As a reminder, merge your repository every day or whenever you start your GitHub Desktop application. Merge pulls all commits (changes) from the upstream/main repositories (production) into your local filesystem clone (local machine). This keeps your local clone up-to-date with other people's work (commits) from upstream/main. Merging also avoids the long time it could take to complete if you don't do this often.

1.  Once you complete the sprint development or when you create, delete, or modify assets in your clone (local copy), commit (save) those changes to your clone, and then push those changes from your clone to your fork (steps in Lab 3 Task 6). These changes then save to your forked repository.

2.  Before you create a pull request, get the latest updates from the production repository into your clone (steps in Lab 3 Task 3).

3. Set up GitHub Pages for your fork (steps in Lab 3 Task 7) to test or review your sprint content (steps in Lab 3 Task 8).

4. Create a pull request to upload your content to the main repository, **https://github.com/oracle-livelabs/sprints** (steps in Lab 6 Task 1), and follow the steps in Task 5 to request sprint publishing in WMS.

5.  Once the PR is approved, it takes a few minutes for the changes to reflect on the **oracle-livelabs.github.io/sprints** GitHub pages site. You can access your sprint on GitHub by following the steps in Lab 3 Task 8.

##  Task 5: Request Sprint Publish in WMS

1.  After you submit the pull request, navigate to your domain sprint bucket in [WMS](http://bit.ly/oraclewms). If no existing domain sprint bucket fits your sprint, contact our LiveLabs Sprints team by emailing us at [livelabs-help-sprints_us@oracle.com](livelabs-help-sprints_us@oracle.com) or send us a message in Slack #workshop-authors-help to create a new bucket. We will respond within 20 minutes over Slack or within 24 hours via email and create the bucket if needed.

2. In your sprint bucket in WMS, click on the **Publishing** tab, then click the **Publish to LiveLabs** button to submit a new sprint publish request.

      ![Request Publishing](images/publishing-tab.png)

3.  Provide all these **required** details and click **Create**:

    -   **Publish Type:** Leave the default - Public
    -   **Workshop Time (in hours):** The maximum duration to complete the steps in a sprint should be less than 10-15 minutes. Convert the sprint duration time to hours. Ensure they end with an odd number. For example, if a sprint duration is 4 minutes, update the field with 0.067 hours.
    -   **LiveLabs Sprint:** Turn *ON* the radio button for the sprint and provide the oracle-livelabs.github.io/sprints pages URL (follow the steps in Lab 5 Task 1 and replace your GitHub account name with oracle-livelabs to create the production URL) for the sprint once it is published. Format: https://oracle-livelabs.github.io/sprints/domain-folder-name/your-sprint-folder-name/

    Scroll down to the Override Workshop Fields Section and provide these details:
    -   **Title Override field:** Choose a descriptive title up to 200 characters. Do not include the word "Sprint" and use "Oracle Speak". Choose a title that users would recognize or understand. Do not use abbreviations ("Autonomous Database" not "ADB") and start the title with a question, for example, How can I, Where do I, What do I do) and use only imperative verbs ("Build" not "Building").
    -   **Desc Short Override field:** The short description is the key piece of information that goes on the workshop tile. Keep it crisp, catchy, and interesting. The length is up to 400 characters.

    ![Request Sprint Publishing](images/request-sprint-publishing.png)

4. The sprint will now be in **Publish Requested** status. Click on your sprint tile to view your sprint's Current Publish Status and note the WMS ID and LiveLabs ID as we will need it now and for your reference.

    ![Note WMS ID and LL ID](images/note-wms-ll-ids.png)

5. After you submit the new sprint request in WMS, update the pull request with the WMS ID and LiveLabs ID of the sprint by clicking on Edit next to the title of the pull request.

    ![Update pull request with WMS ID and LiveLabs ID](images/update-pr-with-wms-ll-ids.png)

6.  The LiveLabs team will review your sprint request and the pull request. If there are changes to the sprint, the pull request will be updated with comments. If there are changes to the sprint submit request, the LiveLabs Sprints team will reach out to you via email or WMS and update the publishing status of the sprint to **Changes Requested** in WMS.

7.  If no changes are needed, the LiveLabs Admin team will approve the new sprint submit publish request and the pull request within 1-2 business days and update the sprint status to **Publish Approved** in WMS.

8. Once the sprint is approved in WMS, the sprint will be live in production in 1 business day.

Feel free to make changes to the sprints to keep them updated. Create a pull request with the changes you made to the sprint.

> **Note:** If you update the sprint title, update the respective sprint title in WMS and keep the LiveLabs sprints team updated.

## Acknowledgements

* **Last Updated By/Date:** LiveLabs Team, January 2026

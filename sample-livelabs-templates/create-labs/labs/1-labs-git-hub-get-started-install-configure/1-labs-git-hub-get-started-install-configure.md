#  Get Started with Git and Set up the GitHub Environment

## Introduction

In this lab, you will learn how to create a GitHub Account and use the Oracle LiveLabs GitHub Organization and repositories, set up the GitHub development environment, and install GitHub Desktop.

### Objectives
* Submit a LiveLabs workshop request using the **Oracle Workshop Management System (WMS)**.
* Create a GitHub account and add it to the Oracle GitHub Organization.
* Set up your GitHub environment.
* Install GitHub Desktop Client (recommended for User Assistance Developers).

### What Do You Need?

* Access to the **Oracle Workshop Management System (WMS)**
* Access to the **Develop LiveLabs Workshops and Labs Using Markdown** internal documentation
* Familiarity with HTML and/or Markdown is helpful but not required

## Task 1: Submit a Workshop Request to the Oracle Workshop Management System

Before getting started, you should submit your LiveLabs workshop request to the WMS. Submitting a workshop informs the Oracle ecosystem that you are working on a workshop and submits your idea to the Workshop Council. We urge you not to delay this step. There are hundreds of workshops already, this step is important to helps us preserve the quality and integrity of the workshop catalog.

Workshop authors can watch the [video 2:22 – 22:40](https://otube.oracle.com/media/How%20to%20submit%20a%20LiveLabs%20workshop%20in%20WMS%20-%20LiveLabs%20Office%20Hours%20-%2002-04-2022/1_6v8qdkzp) on how to submit a new workshop request.

1.  Login to Corporate VPN.

2.  Access the **Oracle Workshop Management System (WMS)** page.
    > **Note:** This page is only accessible to Oracle Employees.

3.  Click **Submit a New Workshop Request**.

4.  Fill in required *Workshop Basic Information*. Select the *Stakeholder*, *Workshop Council*, and *Workshop Owner Group* for your workshop. Fill in the *Workshop Abstract* **thoroughly**, *Workshop Outline*, and *Workshop Prerequisites*. Click **?** besides those fields to see more details.

  ![Submit Workshop](images/submit_workshop.png " ")
  ![Detailed Workshop Information](images/detailed_info.png " ")

5.  Click the *Tags* tab, and select proper tags for your workshop. You should select a *Level* tag, and at least one tag for *Role*, *Focus Area*, and *Product* respectively. Failure to do so will prevent your workshop from being approved. Click **Create**.

  ![Select tags](images/tags.png " ")

6. Click the *Social* tab to include a link to the blog of your workshop, write a couple sentences that would accompany a LinkedIn post about your workshop, and write a tweet to be used to promote your workshop.

  ![Select social](images/social.png " ")

7.  We recommend you don't start working on your workshop until your workshop has been approved by a council member.

Once your workshop is submitted, it will be sent to the workshop council.  The workshop council will approve your workshop or ask for more details within 3 business days. If you have not heard back from your council group after 3 business days, please message them via WMS. Once approved, you will be entered into the workflow and given additional steps to progress through to production.

To find your council members, go to WMS, under **People & Role Reports**, select **Workshop Council Members**, and you can find your council members.

Council can watch this [video 5:10 - 7:05](https://otube.oracle.com/media/Know%20about%20Roles%20and%20Responsibilities%20in%20LiveLabs%20Workshop%20Management%20System%202.0%20-%20LiveLabs%20Office%20Hours%20-%2001-28-2022/1_hrkwddhr) to understand your responsibilities and this [video 9:45 - 10:45](https://otube.oracle.com/media/Introducing%20LiveLabs%20Dashboard%20-%20LiveLabs%20Office%20Hours%20-%2002-08-2022/1_ebeuqq95) to learn how to change workshop statuses (approve the workshop).

> **Note:** If you are a developer, QA, or PM, you can create and publish a Custom image of the on-premises product to OCI Market place. See the [Creating Compute Images for Marketplace](https://objectstorage.us-phoenix-1.oraclecloud.com/p/SJgQwcGUvQ4LqtQ9xGsxRcgoSN19Wip9vSdk-D_lBzi7bhDP6eG1zMBl0I21Qvaz/n/c4u02/b/common/o/sample-livelabs-templates/create-labs/labs/workshops/compute/?lab=6-labs-setup-graphical-remote-desktop) LiveLabs workshop.

## Task 2: Create and Set Up Your GitHub Account

In this Step, you will create and set up your GitHub account.

1. Create a free GitHub Account here: [GitHub Web UI](https://github.com/) if you don't have one.
    ![](./images/git-download-install-create-account.png " ")

2.  If this is a new account, use your Oracle email ID to register.

    > **Note:** Do not create a secondary new account to join GitHub. Ensure that your GitHub account is associated with your @oracle.com email ID.

3. Go to [GitHub Settings](https://github.com/settings/profile) and configure the following:
    *   Set your Name as it appears in your Aria employee page.
    *   Add your Profile Picture.

4. Click **Account** to add your user name in the **Enter a user name** dialog. For example, achepuri, LauranSerhal, and so on.

5. Set up a 2 Factor Authentication here: [GitHub Security](https://github.com/settings/security).

    ![Set up 2 factor authentication.](./images/git-2-factor-authentication.png " ")


## Task 3: Download and Install the latest version of Git (Optional Step)

> **Note:** For User Assistance Developers (UAD), Oracle recommends using GitHub Desktop client because of its simple and user friendly user interface, and it is also much easier to use than the Git command line; therefore,  if you are a UAD, skip this task and follow the instructions in **Task 4: Install GitHub Desktop**.

To install Git:

1. Install Git for your operating system from the [Git download site] (https://git-scm.com/downloads).

2. Click the required option under **Downloads** (**Windows** in this example) and save the installer file.

3. Browse to the downloaded location and double-click the file to launch the installer.

4. Click **Yes** in the **User Account Control** dialog box.

5. Click **Next** in the **GNU General Public License** dialog box.

6. Under **Choose the default behavior of `git pull`**, leave the selected **Default (fast-forward or merge)** option as is and click **Next**.

7. In the **Configuring experimental options** dialog box, click **Install**.

## Task 4: Install GitHub Desktop

The GitHub Desktop application is a UI client for Windows and Mac that simplifies the complex set of GitHub command line arguments. GitHub Desktop is a fast and easy way to contribute to projects and it simplifies your development workflow. It is much easier than using Git command line.

To setup the GitHub Development Environment and install **GitHub Desktop**:

1. Download and install **GitHub Desktop** from [GitHub Desktop](https://desktop.github.com/).

2. When the software is successfully installed, open the **GitHub Desktop**.

  ![GitHub desktop login screen.](./images/git-hub-desktop-login-screen.png " ")

3. Click **File > Options > Sign in**, enter your GitHub **Username** or **email address**, **Password**, and then click **Sign in**. You will receive an authentication code to your cell phone. Enter this code in the **Authentication code** field in the **Sign in** dialog box.

    > **Note:** The authentication code is valid only for a few seconds.

  You are now logged in to **GitHub Desktop**.

  ![GitHub desktop main screen.](./images/get-started-git-hub-desktop.png " ")

## Task 5: Fork the Repository on Your GitHub Account

  We create workshops and labs in repositories of the **oracle-livelabs** project. You must fork the repository you want to work in to create a duplicate personal copy of the repository on your GitHub account. You own the forked (stage) **adb** repository as an example (other repos are available) and you can edit its contents without affecting the parent **adb** (production) repository.

  For example, if a user named malcherm forks the **adb** repository in the **oracle-livelabs** project, a duplicate repository [achepuri/learning-library](https://github.com/malcherm/learning-library) is created.

The public repository options are: adb, analytics-ai, apex, common, converged, database, developer, em-omc, exacs, goldengate, multicloud, oic, oci, oci-core, oci-hpc, oml, partner-solutions, security, spatial-graph, sprints, weblogic

This is an example to just fork the repository that you are working. You do not need to fork all of the repos, but just the ones you are changing and syncing with.

  To fork the **adb** repository:

1. Log in to the [GitHub Web UI](http://github.com), using your GitHub account.

2. Navigate to the [oracle-livelabs org](https://github.com/oracle-livelabs).

3. Click **Fork** to display the following message: **How are you planning to use this fork?**.

  ![Fork instruction dialog box.](./images/get-started-git-hub-webUI-fork.png " ")

4. Select the option that indicates your local repository.
In the following example, user achepuri has forked the **learning-library** repository.

  ![Local repository to fork.](./images/get-started-git-hub-webui-forked-library.png " ")

In the next Step, you will clone this forked repository.

## Task 6: Clone the Forked Repository
A clone is a copy of your forked repository that lives on your local computer instead of on [GitHub Web UI](http://github.com). When you clone your forked repository, you can edit the files in your preferred editor, such as **Atom** editor, and use the **GitHub Desktop** client to keep track of your changes without having to be online.

To clone the forked repository:
1. Open your **GitHub Desktop** application and log in using your GitHub account.
2. Click **File > Clone repository** to display the **Clone a repository** dialog box.

    ![Clone repository.](./images/git-hub-desktop-clone-repository.png " ")

3. Select your own repository such as **your account/adb** from **Your repositories**. In this example, there is only one repository displayed named **malcherm/adb**. Under **Local path**, select the local path on your machine where the repository is going to be cloned (copied). This is where the project files get copied to your local file system. In this example, the local path is **C:\Users\achepuri.ORADEV\Documents\GitHub**.  

    ![Available repositories dialog box.](./images/git-hub-desktop-clone-repository_dialog.png " ")

4. Click **Clone**.

  The **adb** repository files appear in the local path you just specified. You can now start working on your labs and workshops!

  ![Successfully cloned repository.](./images/git-hub-my-cloned-repository.png " ")

  > **Note:** The local cloned repository is connected to the remote fork version. You can push your local clone changes to the remote fork version when you are online to keep them in sync.

  When you make a clone, you can create your own project folder, edit the files in your preferred editor, such as **Atom**, and use **GitHub Desktop client** to keep track of your changes without having to be online.

  The repository you cloned is still connected to the remote version (your fork) so that you can push your local changes to the remote to keep them synced when you're online.

5. You can also use Github Desktop to Synchronize the changes that you have made in your local file system to the forked content on your github repo, more details on using Github Desktop in Lab 4 of this workshop and also on Otube [Working with GitHub Desktop](https://otube.oracle.com/media/t/1_bxj0cfqf).

  ![Synchronize with GitHub.](./images/github-desktop-sync.png " ")

6. When asked how you plan to use the fork select **To contribute to the parent project**.

  ![Contribute to parent project.](./images/contribute-to-parent.png " ")

This concludes this lab. You may now proceed to the next lab.

## Want to Learn More?

<!-- * [Setting Up Environment](https://otube.oracle.com/media/Setting+Up+GitHub/0_93stcjpb) -->
* [Download and Install Git for Windows](https://git-scm.com/download/win)
<!-- * [Using GitHub Desktop to merge, commit and make pull requests](https://otube.oracle.com/media/t/1_bxj0cfqf) -->
* [Download and Install Git for Mac](https://git-scm.com/download/mac)

## Acknowledgements

* **Authors:**
    * Anuradha Chepuri, Principal User Assistance Developer, Oracle GoldenGate
    * Lauran Serhal, Principal User Assistance Developer, Oracle Database and Big Data
* **Contributors:**
    * Kay Malcolm, Database Product Management
    * Madhusudhan Rao, Principal Product Manager, Database
    * Aslam Khan, Senior User Assistance Manager, ODI, OGG, EDQ
    * Michelle Malcher, Database Product Management

* **Last Updated By/Date:** Michelle Malcher, Database Product Management, June 2022

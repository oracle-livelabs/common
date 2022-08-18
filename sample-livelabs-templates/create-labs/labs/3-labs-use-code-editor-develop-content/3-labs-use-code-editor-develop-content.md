# Use A Text Editor to Develop Markdown Content

## Introduction

You can use your preferred editor to author and edit your Markdown (.md) content for rendering the Workshop output.

> **Note:** Oracle recommends using **Visual Studio Code (VSCode)**. If you are currently using **Atom** - it is being retired, and you should move to use VSCode.

### Objectives

* Learn about the tools that are available to develop and host your content.
* Learn how to merge content.
* Create workshop and lab content.
* Preview the content in a browser.


## Task 1: Install Visual Studio Code

To install Visual Studio Code:

1. Visit the [download](https://code.visualstudio.com/download) site and select the zip file for your operating system. In this case, we chose Mac OS.
  ![Downloading Visual Studio Code.](./images/vscode-os-options.png " ")
3. Double-click the zip file to expand it. The VS Code application will then show in your downloads folder in Finder.
  ![Install Visual Studio Code.](./images/vscode-zip-expanded.png " ")
4. Drag it to the Applications folder and double-click it to launch the text editor.
  ![Launch Visual Studio Code.](./images/vscode-drag.png " ")

## Task 2: Install Visual Studio Code's Live Server Extension

1. Launch VS Code and navigate to the Extensions bar.
  ![Add extensions in visual studio code.](./images/extensions-tab.png " ")
2. Type "Live Server" into the search bar and select the first entry, "Live Server 5.6.1".
  ![Search for live server.](./images/ls-search.png " ")
3. Click "Install".
  ![Install live server.](./images/ls-install.png " ")

## Task 3: Merge Content from Git Before You Start Editing Your Content
  Every day before you start editing your content, ensure to do a Merge in **GitHub Desktop**.
  Merging synchronizes the content in your cloned repository with the latest content on the **upstream/main** repository and ensures that you have the most recent versions of the templates and other workshops/labs.

  >**Note**: If you don't do that, you may get merge conflicts later when you commit your changes, which can be complex to fix.

  To merge content:
  1. Start your **GitHub Desktop** client.

  2. If you have multiple Oracle LiveLabs repositories, first switch to the repository that you will work on. Expand the dropdown list of **Current Repository**. Click the repository that you want to sync. In this case, I select the *em-omc* repository as an example, but the following process is the same for syncing other repositories.
  ![Switch repository.](./images/switch-repo.png " ")

  3. Make sure you perform the following steps **off VPN**. Otherwise, your GitHub Desktop may be stuck.

  4. Click **Fetch origin**.
  ![Fetch origin.](./images/fetch-origin.png " ")

  5. Select **Branch > Merge into Current Branch...** to display the **Merge into main** window.

    ![Merge current branch.](./images/git-hub-merge-current-branch.png " ")

  6. Under the **Default Branch**, the main branch is selected by default. This indicates the local clone on your PC.
    ![Main branch is selected by default.](./images/git-hub-merge-local-clone-default-branch.png " ")

  7. Scroll down the **Merge into main** window, select **upstream/main** (this is your production repository which is oracle-livelabs/repository), and then click **Create a merge commit**. In this example, this will merge 1 commit by other people from the **upstream/main** into the clone on the local PC.

    ![Create a Merge Commit.](./images/create-merge-commit.png " ")

  8. When the merge is completed, a **"Successfully merged upstream/main into main"** message is displayed. To push the new commits from the local clone to your forked location, click **Push origin**. If you get an *Authentication failed* error, refer to the Troubleshooting section at the end of this lab.

    ![Push Origin.](./images/push-origin.png " ")

    >**Note**: To determine if your clone is up-to-date with **upstream/main** (production), repeat Steps 4 to 7. If both repositories are synchronized, then the following message is displayed: "This branch is up to date with **upstream/main**".

    ![This branch is up to date.](./images/git-hub-merge-branch-up-to-date.png " ")

  In the **GitHub Desktop** UI, notice that the **Push origin** is replaced by **Fetch origin** after the push origin operation is completed.  The local clone and fork repositories are now synchronized with the main repository.

  ![Synchronized repositories.](./images/fetch-origin.png " ")

## Task 4: Create Your Labs and Workshop Content
Leverage the content from the **[sample-livelabs-templates/sample-workshop](https://github.com/oracle-livelabs/common/tree/main/sample-livelabs-templates/sample-workshop)** folder to start creating lab and workshop content for your project. Fork and clone the **[oracle-livelabs/common repository](https://github.com/oracle-livelabs/common/)** to get the sample-workshop folder on your local computer, by following Lab 1 -> Task 5 and Task 6.

> **Note:** Ensure to update your clone from the **upstream/main** repository (detailed in **Task 3**) regularly whenever we are working on the markdown files.

To create your lab and workshop content:
1. Submit your workshop to the [Workshop Management System](http://bit.ly/oraclelivelabs) BEFORE you begin development.  No GitHub requests will be approved without an approved WMS ID.

2. Open your cloned repository (where you want to put your workshop, not the common repository) using Windows Explorer (Windows) or Finder (Mac).

3. Create your project folder anywhere in your cloned repository. If a folder already exists for the product you work on, then you can create your project folder within that.

4. In your cloned *common* repository, Go to **sample-livelabs-templates/sample-workshop**. This has a few lab folders, such as **provision**, **query**, etc. Every lab folder contains the following: a **files** folder, an **images** folder, and the respective `.md` file. You can use **Live Server** (see in Task 6) to open up **sample-workshop/workshops/tenancy/index.html** to see how a workshop will show up in production, and play with it.

5. Copy any lab folder (except the folder named `workshops`), such as the **query** folder, to your project folder. In your project folder, rename the folder **query** and the respective `.md` file within it as per your requirement.  Based on the sample **query** folder, you can create and rename as many labs (folders) and the respective `.md` files as per your requirement.

      >**Note:** The **files** folder within every sample lab folder is currently not required and is reserved for future use. You can remove it if you don't need it.

      ![Files folder with sample labs.](./images/lab-files-folder-currently-not-needed.png " ")
      After you copy the sample folder to your project folder, you can delete your copy of the **files** folder from your project folder.
      Your lab will look similar to this example:
      ![Example of your lab files folder.](./images/lab-folder-structure.png " ")

6. Similarly, copy the **workshops** folder along with its contents from **sample-livelabs-templates/sample-workshop** to your project folder.

7. To edit a `.md` file of your lab, you click **File > Open**.
  ![Open md file](./images/file-open.png " ")

8. Navigate to your project folder and click **Open** to open your project folder.
  ![Navigate to your project folder.](./images/project-folder.png " ")

  The project folder along with the labs and **workshops** folder will then be displayed in your text editor.
    ![Workshops folder displayed in text editor.](./images/project-folder-displayed.png " ")

9. Select the `.md` file you want to edit, for example, select the `data-load/data-load.md` file and edit your lab content. Similarly, edit the `.md` files of the rest of your labs.
    ![Select markdown file to edit.](./images/open-mdfile-editing.png " ")

10. If you want to add images in your lab, then include them within the **images** folder. You can insert images in the respective `.md` file.

11. Similarly to edit your workshop content, expand the **workshops/tenancy** (if you are creating a workshop running on users' tenancies), **workshops/sandbox** (if you are creating a sandbox/green button workshop), and/or **workshops/desktop** (if you are creating a noVNC workshop) folder in your text editor. Edit the `manifest.json` to list the labs you have added to your workshop (or plan to add) and update the title of the workshop. The `manifest.json` is like your book map file in SDL.

  Besides the list of labs, also update the `workshoptitle` field, and update the `help` field to point to the workshop's stakeholders group email. If the `include` and `variables` field do not apply to your workshop, please remove them, otherwise, your workshop will not render properly.

  ![Edit manifest json file](./images/manifest.png " ")

12. If you want to add an introduction to your workshop, then navigate to **sample-livelabs-templates/sample-workshop** and copy the `introduction` folder to your project folder. You can rename the introduction folder if you would want to.

13. You can also create a `README.md` file within **workshops/tenancy**, **workshops/sandbox**, and/or **workshops/desktop**, and update the `README.md` with a summary of your workshop. Note that the `README.md` file is optional for your workshop.

## Task 5: Use Common Labs

1. Some labs can be shared by many LiveLabs workshops, so we put together a list of [common labs](https://github.com/oracle-livelabs/common/tree/main/labs), including "Generate SSH Key," "Register an Oracle Cloud account," "Need Help," etc. for easier workshop development. You can leverage the [common labs](https://github.com/oracle-livelabs/common/tree/main/labs) located in the **[oracle-livelabs/common repository](https://github.com/oracle-livelabs/common/)**.

2. To use a common lab, you need to use an absolute link to the lab in your workshop's manifest.json file. For example, if you want to use the "Generate SSH Key" common lab located in [https://github.com/oracle-livelabs/common/blob/main/**labs/generate-ssh-key-cloud-shell/generate-ssh-keys-cloud-shell.md**](https://github.com/oracle-livelabs/common/blob/main/labs/generate-ssh-key-cloud-shell/generate-ssh-keys-cloud-shell.md), you should use this link in the manifest.json file: [https://oracle-livelabs.github.io/common/**labs/generate-ssh-key-local/generate-ssh-keys-local.md**](https://oracle-livelabs.github.io/common/labs/generate-ssh-key-local/generate-ssh-keys-local.md).

## Task 6: Security

1. Blur all personal information (IP addresses, intranet URLs, email addresses, OCIDs, usernames, and passwords) from images.
  ![Blur all identifiable information.](./images/blur-ip.png " ")

2. Every image must have a description: ![DESC] (…/…/name.png “ “)

  ![Every image must have a description.](./images/image-desc.png " ")

3. Do not use any IP addresses, intranet URLs (for example links to a Confluence page), email addresses, OCIDs, usernames, or passwords in the text. Do not provide a demo password.


## Task 7: Preview Your Workshop and Labs Using Live Server

1. Within the directory of any workshop you want to view, click the **workshops** folder and then click the **freetier** folder.
  ![Navigate to freetier folder.](./images/folder-nav.png " ")
2. Right-click on the index.html file and select "Open with Live Server".
  ![Right click and select open with the Live Server.](./images/right-click.png " ")
3. The local version of your workshop will then be launched in your web browser.

## Task 8: (Optional) Helpful resources and extensions for Visual Studio Code

1. [Showdown Editor](http://demo.showdownjs.com/) is a Javascript Markdown to HTML converter that LiveLabs uses in the background to convert Markdown files to HTML. This documentation is a helpful resource while developing content in markdown files. This document provides a quick description of the markdown syntax supported on the left side and the output in HTML format on the right side. Showdown Editor shows the syntax of writing, paragraphs, headings, block and italics, code formatting, creating lists, tables, adding links, images, escaping entities, etc.

  ![Showdown Editor](./images/showdown-editor.png " ")

2. Set up tab spacing in Markdown files in Visual Studio Code - To have a fixed indentation and consistency in all the markdown files among the images, code snippets, and between the numbers in each task with the line starting, you need to set spaces to tabs (size 4).

  To set spaces to tabs size 4, click on spaces, choose indent with tabs, and select 4 as configured size, which sets the tab spacing to 4.

    ![click on spaces](./images/spacing1.png " ")

    ![choose indent with tabs](./images/spacing2.png " ")

    ![select 4 as configured size](./images/spacing3.png " ")

    ![tab spacing is set to 4](./images/spacing4.png " ")

3. Install Markdownlink Extension in Visual Studio Code - This extension is helpful to check markdown files linting and styling in VS Code. This extension has a library of rules to encourage standards and consistency for markdown files. 

  To install this extension, search for markdownlint in the VS Code marketplace, select the first one and click on Install to install it.

    ![Markdownlink Extension](./images/markdownlink-extension.png " ")

4. Install Code Spell Checker Extension in Visual Studio Code - This extension is helpful to check spellings in the files.

  Search for the code spell checker in the VS Code marketplace, select the first one that doesn’t specify any language in the title, which is the English spell checker, and install it.

  ![Code Spell Checker Extension](./images/code-spell-checker-extension.png " ")

5. Install Delete Trailing Spaces Extension in Visual Studio Code - Trailing space is all whitespace(s) located at the end of a line, without any other characters following it. This extension is helpful to resolve code blocks, copy and paste issues, and sometimes merge conflicts.

  To highlight trailing spaces, in the VS Code marketplace, search for trailing spaces and select the first trailing spaces, not the one with a fork, and click on Install. Once the extension is installed, you can see that whitespace(s) are highlighted in red to delete them.

  ![Delete Trailing Spaces Extension](./images/delete-trailing-spaces-extension.png " ")

6. Install Path Intellisense Extension in Visual Studio Code - since repositories in the Oracle LiveLabs GitHub project have many files, you may want to access files in different folders of your workshop or sometimes in a different directory. To know the file, you are pointing to in the manifest.json file, you can use the path Intellisense extension.

  To install this extension, search for path intellisense in VS Code marketplace, select the first extension and install it.

  ![Path Intellisense Extension](./images/path-intellisense-extension.png " ")

  Use Path Intellisense Extension in manifest.json file - After typing the backslash, hit enter to view or choose the folder(s) or file(s)

  ![Use Path Intellisense Extension](./images/use-path-intellisense-extension1.png " ")

  ![Use Path Intellisense Extension](./images/use-path-intellisense-extension2.png " ")

This concludes this lab. You may now proceed to the next lab.

## Troubleshooting

### Issue 1: Authentication error.

  ![Authentication failed.](./images/authentication-failed.png " ")

First, make sure that you are logged into your GitHub account in GitHub Desktop. If it still does not solve the error, try the following steps.

If you have already created an SSH key in your local computer and added the key to your GitHub account, you can go directly to Step 5.

1. If you have not generated SSH keys in your local computer, first follow the *(Optional) Lab 5: Generate SSH keys* on the left to generate SSH keys in your local computer.

2. Now you have your public and private SSH keys. Go to your GitHub account in a browser. Click the arrow next to your profile picture on the upper right, and click **Settings**. Click **SSH and GPG keys**. If you have not added any SSH keys to your GitHub account, you will not see any SSH keys displayed. Then click **New SSH key**.
  ![Settings](./images/settings-ssh.png " ")

3. For **Title**, give your SSH key a name. In the **Key** field, copy and paste your public SSH key. Then, click **Add SSH key**.
  ![Add SSH key](./images/add-ssh-key.png " ")

4. After the SSH key is added, you can see it under SSH keys on your GitHub page.
  ![SSH key added](./images/ssh-key-displayed.png " ")

5. Open up your terminal. Go to where *you cloned your GitHub repository* (which may be different from the example below). In this case, I am using the **em-omc** repository as an example, but the process is the same for other repositories.

    ```
    user@user-mac ~ % cd Documents/oracle-livelabs/em-omc
    user@user-mac em-omc %
    ```
6. Run the ssh-agent command.

    ```
    user@user-mac em-omc % <copy> ssh-agent -s </copy>
    SSH_AUTH_SOCK=/var/folders/sl/pt8rm4rd4tl_f8yyd8n6jd640000gn/T//ssh-vkOzi3x2qhp7/agent.82390; export SSH_AUTH_SOCK;
    SSH_AGENT_PID=82391; export SSH_AGENT_PID;
    echo Agent pid 82391;
    ```

7. Run the ssh-add command. Append your private SSH key after the ssh-add. Yours may be different from what is shown below.
    ```
    user@user-mac em-omc % <copy> ssh-add ~/.ssh/sshkey </copy>
    Identity added: /Users/user/.ssh/sshkey (user@user-mac)
    ```

8. Finally, go back to **GitHub Desktop** UI, and click **Push origin**. This should solve the authentication issue, and you can continue the lab.
  ![Push origin.](./images/push-origin.png " ")

### Issue 2: Workshops or labs do not show up using Live Server

If you see a blank page, check the manifest.json file.
1. Expand the navigation menu on the left, if you can navigate to other labs, then the problem is with a particular lab. Find that lab's location in the manifest.json file.

2. If no labs are showing up, then it is possibly the issue with the workshop. In the manifest.json file, make sure you remove the *include* and *variables* if they do not apply to your workshop.


## Acknowledgements
* **Author:**
    * Anuradha Chepuri, Principal User Assistance Developer, Oracle GoldenGate
* **Contributors:**
    * Lauran Serhal, Principal User Assistance Developer, Oracle Database and Big Data User Assistance

* **Reviewed by:**
    * Aslam Khan, Senior User Assistance Manager, ODI, OGG, EDQ
    * Kay Malcolm, Database Product Management
    * Arabella Yao, Database Product Management
    * Andres Quintana
    * Brianna Ambler

* **Last Updated By/Date:** Arabella Yao, August 2022
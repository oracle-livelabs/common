# Set up GitHub and install tools

## Introduction

In this lab, you will learn how to configure your environment to develop LiveLabs workshops. We use the Oracle LiveLabs GitHub organization so you will learn to create a GitHub Account, set up the GitHub development environment, and install GitHub Desktop. Oracle LiveLabs Organization is one of Oracle GitHub Organizations and we encourage you to sign up through OIM and register your email account, but it is not required for LiveLabs development. 

These steps need to be completed once to setup your environment for current and future development.

> **Note:** Oracle recommends using **Visual Studio Code (VSCode)**. If you are currently using **Atom** - it is being retired, and you should move to use VSCode.

### Objectives

* Configure your environment - one time setup.
* Create a GitHub account and add it to the Oracle GitHub Organization.
* Set up your GitHub environment.
* Install GitHub Desktop Client (recommended for User Assistance Developers).
* Install Visual Studio.

### What Do You Need?

* Familiarity with HTML and/or Markdown is helpful but not required

## Task 1: Create and set up your GitHub account

In this Task, you will create and set up your GitHub account.

1. Create a free GitHub Account here: [GitHub Web UI](https://github.com/) if you don't have one.
    ![Git download install create account](./images/git-download-install-create-account.png " ")

2.  If this is a new account, use your Oracle email ID to register. This is optional, however we highly recommend you associate your @oracle.com email with your account so we can validate you are an Oracle Employee. If you are not an Oracle Employee you can develop a workshop in oracle-livelabs/partner-solutions repository and sign an Oracle Contributor Agreement.

    > **Note:** Do not create a secondary new account to join GitHub. Ensure that your GitHub account is associated with your @oracle.com email ID.

3. Go to [GitHub Settings](https://github.com/settings/profile) and configure the following:
    *   Set your Name as it appears on your Aria employee page.
    *   Add your Profile Picture.

4. Click **Account** to add your user name in the **Enter a user name** dialog. For example, achepuri, LauranSerhal, and so on.

5. Set up a 2 Factor Authentication here: [GitHub Security](https://github.com/settings/security).

    ![Set up 2 factor authentication.](./images/git-2-factor-authentication.png " ")

## Task 2: Download and install the latest version of Git (Optional Step)

> **Note:** For User Assistance Developers (UAD), Oracle recommends using the GitHub Desktop client because of its simple and user-friendly user interface, and it is also much easier to use than the Git command line; therefore,  if you are a UAD, skip this task and follow the instructions in **Task 4: Install GitHub Desktop**.

To install Git:

1. Install Git for your operating system from the [Git download site] (https://git-scm.com/downloads).

2. Click the required option under **Downloads** (**Windows** in this example) and save the installer file.

3. Browse to the downloaded location and double-click the file to launch the installer.

4. Click **Yes** in the **User Account Control** dialog box.

5. Click **Next** in the **GNU General Public License** dialog box.

6. Under **Choose the default behavior of `git pull`**, leave the selected **Default (fast-forward or merge)** option as is and click **Next**.

7. In the **Configuring experimental options** dialog box, click **Install**.

## Task 3: Install GitHub Desktop

The GitHub Desktop application is a UI client for Windows and Mac that simplifies the complex set of GitHub command line arguments. GitHub Desktop is a fast and easy way to contribute to projects and it simplifies your development workflow. It is much easier than using the Git command line.

To set up the GitHub Development Environment and install **GitHub Desktop**:

1. Download and install **GitHub Desktop** from [GitHub Desktop](https://desktop.github.com/).

2. When the software is successfully installed, open the **GitHub Desktop**.

  ![GitHub desktop login screen.](./images/git-hub-desktop-login-screen.png " ")

3. Click **File > Options > Sign in**, enter your GitHub **Username** or **email address**, **Password**, and then click **Sign in**. You will receive an authentication code sent to your cell phone. Enter this code in the **Authentication code** field in the **Sign in** dialog box.

    > **Note:** The authentication code is valid only for a few seconds.

  You are now logged in to **GitHub Desktop**.

  ![GitHub desktop main screen.](./images/get-started-git-hub-desktop.png " ")

## Task 4: Install Visual Studio Code

To install Visual Studio Code:

1. Visit the [download](https://code.visualstudio.com/download) site and select the zip file for your operating system. In this case, we chose Mac OS.
  ![Downloading Visual Studio Code.](./images/vscode-os-options.png " ")
3. Double-click the zip file to expand it. The VS Code application will then show in your downloads folder in Finder.
  ![Install Visual Studio Code.](./images/vscode-zip-expanded.png " ")
4. Drag it to the Applications folder and double-click it to launch the text editor.
  ![Launch Visual Studio Code.](./images/vscode-drag.png " ")

## Task 5: Install Visual Studio Code's Live Server Extension

1. Launch VS Code and navigate to the Extensions bar.
  ![Add extensions in visual studio code.](./images/extensions-tab.png " ")
2. Type "Live Server" into the search bar and select the first entry, "Live Server 5.6.1".
  ![Search for live server.](./images/ls-search.png " ")
3. Click "Install".
  ![Install live server.](./images/ls-install.png " ")

Video about the Visual Studio Code's extensions and showdownjs:
[Video walking through showdownjs and extensions](https://www.youtube.com/watch?v=rOj5APIU-XU)

## Task 6: (Optional) Helpful resources and extensions for Visual Studio Code

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


This concludes this lab. You may now **proceed to the next lab**.

## Want to Learn More?

* [Download and Install Git for Windows](https://git-scm.com/download/win)
* [Download and Install Git for Mac](https://git-scm.com/download/mac)

## Acknowledgements

* **Authors:**
    * Anuradha Chepuri, Principal User Assistance Developer, Oracle GoldenGate
    * Lauran Serhal, Principal User Assistance Developer, Oracle Database and Big Data
* **Contributors:**
    * Kay Malcolm, Database Product Management
    * Madhusudhan Rao, Principal Product Manager, Database
    * Aslam Khan, Senior User Assistance Manager, ODI, OGG, EDQ
    * Arabella Yao, Product Manager, Database

* **Last Updated By/Date:** Arabella Yao, August 2022

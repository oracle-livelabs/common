# Create SSH keys

## Introduction

The SSH (Secure Shell) protocol is a method for secure remote login from one computer to another. SSH enables secure system administration and file transfers over insecure networks using encryption to secure the connections between endpoints. SSH keys are an important part of securely accessing Oracle Cloud Infrastructure compute instances in the cloud.

If you already have an SSH key pair, you may use that to connect to your environment. We recommend you use the *Oracle Cloud Shell* to interface with the OCI compute instance you will create. Oracle Cloud Shell is browser-based, does not require installation or configuration of anything on your laptop, and works independently of your network setup. However, if you prefer to connect via your laptop, please select an option based on your configuration.

*IMPORTANT:  If the SSH key is not created correctly, you will not be able to connect to your environment and will get errors.  Please ensure you create your key properly.*

Estimated Time: 5 minutes

### Objectives
- Generate and access SSH public and private keys

### LiveLabs (Green Button) Reservations - Please Read
If you are creating an SSH Key for a workshop that will be running *inside a LiveLabs tenancy*, do **NOT** select *Option 1: Oracle Cloud Shell*.  Select the options that correspond to the OS running on your local laptop.  You will be pasting your key into the LiveLabs reservation page so that we can pre-create your instance for you.

![LiveLabs Reservation.](./images/livelabs-reservation.png " ")

## Option 1:  Oracle Cloud Shell

<!--
Watch the video below for an overview of the Generate SSH Keys Cloud Shell option.
[This video shows an overview of the lab content.](youtube:oq2Hk1Yy9Cg)
-->

The Cloud Shell machine is a small virtual machine running a Bash shell which you access through the OCI Console (Homepage). Cloud Shell comes with a pre-authenticated OCI CLI (Command Line Interface), set to the Console tenancy home page region, as well as up-to-date tools and utilities. To use the Cloud Shell machine, your tenancy administrator must grant the required IAM (Identity and Access Management) policy.

>**Note:**  If you are making a reservation via the LiveLabs Green Button, you will need to choose the option that matches your laptop.  Your tenancy access will be provided AFTER you create your ssh key locally.

1.  To start the Oracle Cloud shell, go to your Cloud console and click **Cloud Shell** at the top right of the page.

    ![Click cloud shell.](https://oracle-livelabs.github.io/common/images/console/cloud-shell.png " ")

    ![Set up cloud shell.](https://oracle-livelabs.github.io/common/images/console/cloud-shell-setup.png " ")

    ![Open cloud shell.](https://oracle-livelabs.github.io/common/images/console/cloud-shell-open.png " ")

    >**Note:** If you get a *Policy Missing* error, make sure you have navigated first to the compartment assigned to you, and then launch cloud shell. Go to the *Need Help* lab -> *Cannot Access Cloud Shell?* to see how to do that.

2.  Once the cloud shell has started, enter the following command. Choose the key name you can remember. This will be the keyname you will use to connect to any compute instances you create. Press Enter twice for no passphrase.

    ````text
    <copy>mkdir .ssh</copy>
    ````

    ````text
    <copy>cd .ssh</copy>
    ````

    ````text
    ssh-keygen -b 2048 -t rsa -f <<sshkeyname>>
    ````

    >**Note:** The angle brackets <<>> should not appear in your command.

    ![Generate SSH key in cloud shell.](./images/cloudshell-ssh-keygen.png " ")

3.  Examine the two files that you just created.

    ````
    <copy>ls</copy>
    ````

    ![Examine the two files.](./images/examine-cloudshell-keys.png " ")

    >**Note:** in the output that there are two files, a *private key:* ```<<sshkeyname>>``` and a *public key:* ```<<sshkeyname>>.pub```. Keep the private key safe and don't share its content with anyone. The public key will be needed for various activities and can be uploaded to certain systems as well as copied and pasted to facilitate secure communications in the cloud.

4. To list the contents of the public key, use the cat command ```cat <<sshkeyname>>.pub```

    >**Note:** The angle brackets <<>> should not appear in your command.

    ![Use cat command.](./images/cat-in-cloudshell.png " ")

5.  When pasting the key into the compute instance in future labs, make sure that you remove any hard returns that may have been added when copying. *The .pub key should be one line.*

    ![Pasting public key into compute instance.](./images/copy-publickey-cloudshell.png " ")

You may now **proceed to the next lab** or paste it into the LiveLabs reservation page.

## Option 2:  MacOS

Watch the video below for an overview of the Generate SSH Keys Mac option.
[This video shows an overview of the Mac option.](youtube:0Q6_fvJGgMA)

1.  If you don't already have a shortcut to the terminal application for MacOS, you can find it in the **Applications** > **Utilities** menu or (Shift+Command+U) on your keyboard.

2.  Start up **Terminal** and type in the command ```ssh-keygen```. ssh-keygen will ask you where to save the key, accept the default of the .ssh folder in your home directory by pressing Enter. The file name will be ```id_rsa``` or whatever you choose to name your key. Press Enter twice for no passphrase. Remember the directory where you saved your key (~/.ssh), you will need to reference it later when you create your instance.

    ````
    <copy>ssh-keygen</copy>
    ````

    ![SSH key Mac option.](./images/ssh-keygen-mac.png " ")


3.  Type the following commands in the terminal window to verify that the public and private keys were created.  And to copy the contents of the public key for use in creating your instance in the OCI dialog.

    ```text
    <copy>cd .ssh</copy>
    ```

    ```
    <copy>ls</copy>
    ```

    ```text
    <copy>cat id_rsa.pub</copy>
    ```

    ![Verify creation of public and private keys.](./images/cat-mac.png " ")

    >**Note:** in the output that there are two files, a *private key:* ```id_rsa``` and a *public key:* ```id_rsa.pub```. Keep the private key safe and don't share its content with anyone. The public key will be needed for various activities and can be uploaded to certain systems as well as copied and pasted to facilitate secure communications in the cloud.

4.  If you're ready to create an instance, copy and paste the contents when prompted for the SSH key. Make sure that you remove any hard returns that may have been added when copying.

    ![Copy the contents when ready to create an instance.](./images/copy-mac.png " ")

[Click for the MacOS Terminal User Guide](https://support.apple.com/guide/terminal/welcome/mac)

You may now **proceed to the next lab** or paste it into the LiveLabs reservation page.

## Option 3:  Windows 10

Watch the video below for an overview of the Generate SSH Keys Windows option.
[This video shows an overview of Generate SSH keys windows option.](youtube:BHbfxg_ek3Y)

Creating keys for Windows can be interesting as ```ssh-keygen``` was not a native utility for Windows until the release of Windows 10. And it wasn't included in the initial Windows 10 builds. In this section, we'll assume your version of Windows 10 actually has ```ssh-keygen``` installed.  Note that you might have an earlier build that doesn't include ssh-keygen. If you can't find it, either upgrade or try one of the other methods listed for earlier versions of Windows.

1.  Open a **Powershell** command window on your Windows 10 system by clicking its icon/tile or by typing 'powershell' in the search field in the Start bar.

    ![Open a Powershell.](./images/powershell.png " ")

2.  Enter the command ```ssh-keygen``` into the terminal window. Pay particular attention to where the file will be saved so you can locate it later.   ```ssh-keygen``` will default to the standard .ssh directory under the user's base directory.

    ```
    <copy>ssh-keygen</copy>
    ```

3.  Press Enter at all of the prompts to accept the default location, default file names, and no passphrases.

    >**Note:** In Unix variants, a folder with a dot (.) in front of it was usually designated for configuration files and 'hidden' from normal view.   However, a dot (.) doesn't mean anything special in front of Windows folders.  So the folder will exist but won't be hidden.*\

    ![Press enter at all of the prompts.](./images/ssh-keygen-powershell.png " ")

4.  Confirm that your keys exist and were created properly.   Enter the following commands in the Powershell window.

    ```text
    <copy>cd .ssh</copy>
    ```

    ```
    <copy>ls</copy>
    ```

    ```text
    <copy>cat id_rsa.pub</copy>
    ```

    ![Confirm keys were created properly.](./images/ls-cat.png " ")

    You now have a working SSH key pair and can use it for secure communications to instances in the cloud. Do not share the *private key* `id_rsa` with anyone unless you understand what you're doing. You should only ever need to share and copy the *public key* `id_rsa.pub`.

5.  Also note that if you elect to copy/paste the content of the key into certain dialogs for your labs, you will need to locate the file in Windows, either through Powershell, Explorer, or other directory tools, and open the public key file to copy its content. The example below is using Powershell to ```cat``` the content. You can select the text with your mouse but the copy/paste commands aren't available. Use ```<ctrl-c>``` to copy the contents to the clipboard for pasting into other application dialogs.

    ![Copy the contents to clipboard.](./images/copy-powershell.png " ")

    Or you can just open the file with Notepad, Wordpad, or other text editors.

    >**Note:** Don't use MS Word or any other rich text editors as they might add extra formatting characters which will render the key unusable.

    ![Or open file with plain text editor.](./images/notepad.png " ")

    * [Click here for more details on PowerShell for Windows](https://docs.microsoft.com/en-us/powershell/)
    * [Click here for more details on OpenSSH Key Management for Windows](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement)

You may now **proceed to the next lab** or paste it in the LiveLabs reservation page.

## Option 4a: Prior Windows Versions - Git for Windows

In earlier versions of Windows, ssh-keygen was not a native utility, so third-party utilities had to be utilized. In this section, we'll illustrate using **Git for Windows**. **Git for Windows** includes a Unix-like shell called ```Git Bash``` which is what you will use to create keys and establish SSH communications with your cloud host systems. If you prefer **PuTTY**, go to the next section.

1.  If you don't already have it installed, access the link below and download the application. If you are unable to install anything on your laptop due to permission issues, please use the **Oracle Cloud Shell** option above.

    [Click here to download Git for Windows](https://git-scm.com/download/win)

2. Follow the instructions for installation.

    >**Note:** Installing Git for Windows is beyond the scope of this lab.

3.  Once installed, you should have an entry in your Windows Start menu for Git which should include the **Git Bash** command. Click on the **Git Bash** command.

    ![CLick on Git Bash command.](./images/git-bash.png " ")

4.  Type ```ssh-keygen``` into the terminal window. Press the Enter key to accept the default location (~/.ssh) and default filename (id_rsa) and ```<Enter>``` two more times for no passphrase.

    ```
    <copy>ssh-keygen</copy>
    ```

    ![Accept default location.](./images/ssh-keygen-git-bash.png " ")

    >**Note:** The tricky part here is that **Git Bash** uses a simulated Unix home directory. In order to view, retrieve, or copy your keys, you will need to navigate into the Windows directory structure.

5.  First navigate 'up' into the root C: directory.

    ```text
    <copy>cd c:</copy>
    ```
    Then navigate 'down' into the .ssh folder in your normal home directory.

    ```text
    cd Users/<your home folder name>/.ssh/
    ```
    >**Note:** The angle brackets <> should not appear in your command.

    ```
    <copy>ls</copy>
    ```

    ![Navigate up into root C: directory.](./images/ls-git-bash.png " ")

    Note in the output that there are two files, a *private key:* ```id_rsa``` and a *public key:* ```id_rsa.pub```. Keep the private key safe and don't share its content with anyone. The public key will be needed for various activities and can be uploaded to certain systems as well as copied and pasted to facilitate secure communications in the cloud.

6.  Make a note of where your SSH public and private key files are located. You may be asked to upload the file or to copy/paste the content into other labs for Oracle Cloud Services. Copy the key content exactly, capturing space after the key characters may render your key invalid. In the example below, you can use the gitbash ```cat``` command to display the public key file content. You can select the key file content and right-click to **Copy** the key.  Or you can upload the file directly.

    ![Copy the key content exactly.](./images/copy-git-bash.png " ")

    >**Note:** If you've already installed Git for Windows, don't bother with PuTTY. It's your choice which utility to use for key generation and terminal access.

You may now **proceed to the next lab** or paste it into the LiveLabs reservation page.

## Option 4b: Windows Versions - PuTTY

In earlier versions of Windows, ssh-keygen was not a native utility, so third-party utilities had to be utilized. In this section, we'll illustrate using **PuTTY**. If you prefer **Git for Windows**, visit the option prior to this one.

1.  If you don't already have it installed, access the link below and download the application. For Oracle employees, **PuTTY** is also available for download internally via the **MyDesktop** application. For non-Oracle employees and customers, use the below link. If you are unable to install anything on your laptop due to permission issues, please use the **Oracle Cloud Shell** option above.

    [Click here to download PuTTY for Windows](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html)

2.  Follow the instructions for installation.
    >**Note:** Installing PuTTY is beyond the scope of this lab document.

    Once installed, you should have an entry in your Windows Start menu, and perhaps a desktop shortcut for PuTTY. PuTTY is actually a suite of secure communication utilities. We'll be using two of them, the PuTTY utility for terminal access and the PuTTYgen utility for generating a secure SSH key.

3.  Open the Windows start menu and navigate to the PuTTY folder. Select the PuTTYgen utility.

    ![Select the PuTTYYgen utility.](./images/puttygen.png " ")

4.  Verify that the defaults are selected and the key type should be RSA set at 2048 bits.   Click on the **Generate** button.

    ![Verify the defaults are selected.](./images/generate.png " ")

5.  Follow the instructions and move your mouse around the empty grey area to generate random information. PuTTY is using that information to generate a random, secure SSH key.

    ![Generate random, secure SSH key.](./images/random.png " ")

6.  In the below screen, PuTTY has taken your mouse information and created a key. We need to do several things here that are a little different than other key generation methods. Although we can't actually use the file for an OCI Instance, we'll still want to save the key for future reference. Click the **Save public key** button.

    >**Note:** PuTTY does not save keys in an OpenSSH-compatible format. Thus, if you upload a public key file created with PuTTY to a Linux/Unix system using OpenSSH, the key will not be read correctly. However, the key information itself, when copied directly from the PuTTYgen application, does work correctly when **pasted** into fields that then use that information to create a proper OpenSSH-compatible key. For example, when creating an instance on OCI, you can **paste** the SSH key from PuTTY and it will work correctly.

    ![Save public key.](./images/save-public-key.png " ")

7.  In the *Save public key as:* dialog, name your key and add the ```.pub``` extension to the filename. It will also be helpful if save the file in the common ```.ssh``` folder under your Windows username/folder structure. In this example the key files will be accessible ```C:\Users\<username>\.ssh``` directory. Store the keys here for easy future reference.

    ![Store the keys in common directory for future reference.](./images/pub.png " ")

8.  Next you will need to save the private key. Click the **Save private key** button, and answer **Yes** to the warning about saving without a passphrase.

    ![Save private key.](./images/save-private-key.png " ")

9.  Name the key and verify that it's saved with a ```.ppk``` extension to identify the file as the private key file. Do not share your private key with anyone.

    ![Identify the file as private key.](./images/ppk.png " ")

10. Now you've saved the keys for future reference, all you have to do is copy the key information from the PuTTY dialog.

11. Select the key text in the dialog box from start to finish, then right-click and choose **Copy**. You can then paste the key into a Notepad or directly into the instance creation dialog in the OCI console.

    ![Select the key text.](./images/copy-putty.png " ")

12.  Below is an example of the **Add SSH key - Paste SSH keys** dialog in the OCI instance creation form.

    ![Add SSH key dialog in OCI instance.](./images/paste.png " ")

    This concludes the section on using PuTTY to generate a SSH key pair for versions of Windows prior to Windows 10.

    Follow the below instructions to connect to a cloud instance via SSH using the PuTTY terminal.

### Connect to an instance using PuTTY

1.  Open the PuTTY utility from the Windows start menu. In the dialog box, enter the IP address of your OCI Compute Instance. This can be obtained from the **OCI Console > Compute > Instances > Instance Details** screen.

    ![Enter IP address of OCI compute instance.](./images/ip.png " ")

    ![Compute Instance Console.](https://oracle-livelabs.github.io/common/images/console/compute-instances.png " ")

2.  Under **Category** select **Connection** and then choose the **Data** field. Enter the assigned instance's username. OCI instances will default to the username ```opc```. Enter ```opc```.

    ![Enter assigned instance username.](./images/data.png " ")

3.  Under **Category**, navigate to **Connection** - **SSH** and choose the **Auth** category. Click on the **Browse** button and locate the ```private key file``` you created in the earlier step. Click the **Open** button to initiate the SSH connection to your cloud instance.

    ![Initiate SSH connection to cloud instance.](./images/auth.png " ")

4.  Click **Yes** to bypass the Security Alert about the uncached key.

    ![Click yes to bypass security alert.](./images/security-alert.png " ")

5.  Connection successful. You are now securely connected to an OCI Cloud instance.

    ![Connection Successful.](./images/connected.png " ")

    You are now able to connect securely using the PuTTY terminal utility. You can save the connection information for future use and configure PuTTY with your own custom settings.

    >**Note:** If you've already installed PuTTY, don't bother with Git for Windows. It's your choice which to use for key generation and terminal access.

    [For more information on using PuTTY](https://the.earth.li/~sgtatham/putty/0.73/htmldoc/)

You may now **proceed to the next lab** or paste it into the LiveLabs reservation page.

## Option 5: SSH Keys for Linux

1. Open a terminal window and type in the ```ssh-keygen``` command.   There are a few command line options for the ssh-keygen utility; however, for quick and dirty key creation for lab use, no options are necessary.    Type ```ssh-keygen --help``` in your terminal window to see all the possible options.   For now, just run the command by itself.

    ```
    <copy>ssh-keygen</copy>
    ```
2. You should run this command from your home directory.  In this case as the user-id ```opc```.   The dialog will default to a hidden directory, ```~/.ssh```.  If you don't already have keys created, accept the default file name ```id_rsa``` by hitting the Enter key.   Press the Enter key two more times to create a key with no passphrase.   The best practice in a production environment would be to use a secure passphrase; however, we don't need to bother with these practice labs.

    ![Run this command from home directory.](./images/ssh-keygen.png " ")

    The dialog will indicate that the key pair has been saved in the ```/home/username/.ssh``` directory and is now ready for use.

3.  Change to the ```.ssh``` directory, list and examine your keys.

    ```text
    <copy>cd .ssh</copy>
    ```
    ```
    <copy>ls</copy>
    ```

    ![List and examine your keys.](./images/ls.png " ")

    >**Note:** in the output that there are two files, a *private key:* ```id_rsa``` and a *public key:* ```id_rsa.pub```. Keep the private key safe and don't share its contents with anyone. The public key will be needed for various activities and can be uploaded to certain systems as well as copied and pasted to facilitate secure communications in the cloud.

4.  Use the Linux ```cat``` command to list the contents of ```id_rsa.pub```.

    ```text
    <copy>cat id_rsa.pub</copy>
    ```

    ![Use Linux cat command.](./images/cat.png " ")

5.  In some labs you will be asked to upload or copy (rcp) the public key to an instance in order to facilitate communications. So remember where the file is kept. Other labs will ask for the 'contents' of the key to be pasted into various dialog boxes to facilitate secure connections. Use the ```cat``` command and copy/paste the information from the key starting at the word "ssh-rsa" and copy everything up to the final character in the line. In the example below, you would copy from "ssh-rsa ... " and to exactly after "... -01". Copy the key contents exactly, capturing space after the key characters may render your key invalid.

    ![Copy the key contents exactly.](./images/copy.png " ")

    You have created a public/private SSH key pair and can utilize it in any of the Oracle OCI labs that require an SSH key.

    In case you're interested, click [here](https://www.ssh.com/ssh/key) for more details on SSH, and a short tutorial on initiating a connection from a Linux instance with the SSH keys we just created.

You may now **proceed to the next lab** or paste it into the LiveLabs reservation page.

## Acknowledgements
* **Author** - Dan Kingsley, Enablement Specialist, OSPA
* **Contributors** - LiveLabs Team, Kamryn Vinson, Anil Nair, Madhusudhan Rao, Arabella Yao
* **Last Updated By/Date** - Arabella Yao, Dec 2022
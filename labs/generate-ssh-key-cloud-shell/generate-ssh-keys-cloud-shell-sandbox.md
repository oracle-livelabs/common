# Create SSH keys using Oracle Cloud Shell

## Introduction

The SSH (Secure Shell) protocol is a method for secure remote login from one computer to another. SSH enables secure system administration and file transfers over insecure networks using encryption to secure the connections between endpoints. SSH keys are an important part of securely accessing Oracle Cloud Infrastructure compute instances in the cloud.

We recommend you use the *Oracle Cloud Shell* to interface with the OCI compute instance you will create. Oracle Cloud Shell is browser-based, does not require installation or configuration of software on your laptop, and works independently of your network setup.

*IMPORTANT:  If the SSH key is not created correctly, you will not be able to connect to your environment and will get errors.  Please ensure you create your key properly.*

Estimated Time: 5 minutes

### Objectives
In this lab, you will:
- Generate SSH keys using Oracle cloud shell
- List the content of the public key

### Prerequisites
* An Oracle Cloud Account - please view this workshop's LiveLabs landing page to see which environments are supported.

### Oracle Cloud Shell

The Cloud Shell machine is a small virtual machine running a Bash shell which you access through the OCI Console (Homepage). Cloud Shell comes with a pre-authenticated OCI CLI (Command Line Interface), set to the Console tenancy home page region, as well as up-to-date tools and utilities. To use the Cloud Shell machine, your tenancy administrator must grant the required IAM (Identity and Access Management) policy.

## Task 1: Generate SSH Keys

1. Click the **Navigation Menu** in the upper left, navigate to **Compute**, and select **Instances**.

   ![Compute Instances](https://oracle-livelabs.github.io/common/images/console/compute-instances.png " ")

2. Select the compartment you are assigned to (check which compartment you are assigned to on the LiveLabs *Login Info* page). Expand the **root** compartment and then the **Livelabs** compartment. Select the compartment assigned to you.

    ![View Login Info](https://oracle-livelabs.github.io/common/labs/need-help/images/view-login-info.png " ")

   ![Select Compartment](https://oracle-livelabs.github.io/common/labs/need-help/images/select-compartment.png " ")

3. Go to your Cloud console and click **Cloud Shell** at the top right of the page.

    ![Click cloud shell.](https://oracle-livelabs.github.io/common/images/console/cloud-shell.png " ")

    ![Set up cloud shell.](https://oracle-livelabs.github.io/common/images/console/cloud-shell-setup.png " ")

    ![Open cloud shell.](https://oracle-livelabs.github.io/common/images/console/cloud-shell-open.png " ")

4.  Once the cloud shell has started, enter the following command. Choose the key name you can remember. This will be the key name you will use to connect to any compute instances you create. Press Enter twice for no passphrase.

    ````text
    <copy>mkdir .ssh</copy>
    ````

    ````text
    <copy>cd .ssh</copy>
    ````

    ````text
    ssh-keygen -b 2048 -t rsa -f <<sshkeyname>>
    ````

    >**Note:** The angle brackets <<>> should not appear in your code.

    ![Generate SSH key](./images/cloudshell-ssh-keygen.png " ")

    ![SSH key output](./images/cloudshell-ssh-keygen-2.png " ")

5.  Examine the two files that you just created.

    ````
    <copy>ls</copy>
    ````

    ![Examine files](./images/examine-cloudshell-keys.png " ")

    >**Note:** In the output, there are two files, a *private key:* `cloudshellkey` and a *public key:* `cloudshellkey.pub`. Keep the private key safe and don't share its content with anyone. The public key will be needed for various activities and can be uploaded to certain systems as well as copied and pasted to facilitate secure communications in the cloud.

6. To list the contents of the public key, use the cat command ```cat <<sshkeyname>>.pub```

    >**Note:** The angle brackets <<>> should not appear in your code.

    ![Cat in cloud shell](./images/cat-in-cloudshell.png " ")

7.  When pasting the key into the compute instance in future labs, make sure that you remove any hard returns that may have been added when copying. *The .pub key should be one line.*

    ![Copy public key](./images/copy-publickey-cloudshell.png " ")

You may now **proceed to the next lab**.

## Acknowledgements
* **Author** - Dan Kingsley, Enablement Specialist, OSPA
* **Contributors** - Arabella Yao, Database Product Management
* **Last Updated By/Date** - Carmen Berdant, Mar 2024
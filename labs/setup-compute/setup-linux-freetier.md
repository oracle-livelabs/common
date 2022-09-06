# Set up Oracle Linux compute image

## Introduction
This lab will show you how to setup a Oracle Cloud network (VCN) and a compute instance running Oracle Linux using Oracle Resource Manager.  

Estimated Lab Time:  15 minutes

### About Terraform and Oracle Cloud Resource Manager
Terraform is a tool for building, changing, and versioning infrastructure safely and efficiently.  Oracle offers sample solutions to help you quickly create common Oracle cloud components.

Resource Manager is an Oracle Cloud Infrastructure service that allows you to automate the process of provisioning your Oracle Cloud Infrastructure resources. Using Terraform, Resource Manager helps you install, configure, and manage resources through the "infrastructure-as-code" model. To learn more about OCI Resource Manager, preview the video below.

[](youtube:udJdVCz5HYs)

### Objectives
In this lab, you will:
* Setup a VCN (Virtual Compute Network) using Resource Manager
* Setup a compute instance using Resource Manager
* Login to your compute instance

### Prerequisites

This lab assumes you have:
- An Oracle Free Tier or Paid Cloud account
- Lab:  Generate SSH Keys

## Task 1: Setup VCN Stack
If you already have a VCN created, skip this step and proceed to *STEP 3*.

1.  Login to your Oracle Cloud account
2.  Click the **Create a Stack** tile on the homepage.  Or, click the **Navigation Menu** in the upper left, navigate to **Developer Services**, select **Stacks** and click **Create Stack**.

	![](https://oracle-livelabs.github.io/common/images/console/developer-resmgr-stacks.png " ")
3.  Choose **Template** and click on **Select Template**.

    ![Image alt text](images/db19c-ft-step1-3.png " ")

4. In the Browse Templates window, select **Default VCN** and click the **Select Template** button.
   ![Image alt text](images/db19c-ft-step1-4.png " ")
5.  Enter the name for your VCN:  **livelabsvcn**. Choose your compartment and click **Next**.
   ![Image alt text](images/db19c-ft-step1-5.png " ")
6. Inspect and then accept all default values in the Configure Variables screen and click **Next**.
   ![Image alt text](images/db19c-freetier-step1-5.png " ")
7.  Review your selections and click **Create**
   ![Image alt text](images/db19c-freetier-step1-6.png " ")

## Task 2: Run VCN Stack Apply Job
Now that your stack has been created, you will run an *apply* job to create the actual VCN

1. Click **Apply** on the Stack Details page
![Image alt text](images/db19c-ft-step2-1.png " ")
2. Inspect the apply job, accept all defaults and click **Apply**
![Image alt text](images/db19c-ft-step2-2.png " ")
3. The VCN will immediately begin creation.
![Image alt text](images/db19c-freetier-step1-10.png " ")
4. Once the apply job is complete, inspect the results.  
![Image alt text](images/db19c-freetier-step1-11.png " ")
5. Scroll down the log.  You will notice that 6 objects were created:  A VCN, subnet, internet gateway, default security list, route table and dhcp options, each with their own Oracle Cloud ID (ocid).  We will focus on the subnet.  You will need this subnet information to create your compute instance
![Image alt text](images/db19c-freetier-step1-12.png " ")
6. Copy the first subnet id to a notepad and save for the next step.  If you would like to further inspect the VCN, complete steps#7-12.  Otherwise skip to the next section.
![Image alt text](images/db19c-freetier-step1-13.png " ")
7.  Click the **Navigation Menu** in the upper left, navigate to **Networking**, and select **Virtual Cloud Networks**.
    ![](https://oracle-livelabs.github.io/common/images/console/networking-vcn.png " ")
8.  The VCN you created should be listed.  Click on the VCN you just created.
![Image alt text](images/db19c-freetier-step1-15.png " ")  
9.  On the VCN homepage notice the 3 subnets that were created.  Each subnet is tied to an Availability Domain.  Click on the subnet that matches AD-1.
![Image alt text](images/db19c-freetier-step1-16.png " ")  
10.  Inspect the subnet homepage, find the OCID (Oracle Cloud ID).  Click **Copy**
![Image alt text](images/db19c-freetier-step1-17.png " ")  
11. Copy the subnet ID to a notepad.
![Image alt text](images/db19c-freetier-step1-18.png " ")        

## Task 3: Setup Compute Stack
1.  Click the **Create a Stack** tile on the homepage.  Or, click the **Navigation Menu** in the upper left, navigate to **Developer Services**, select **Stacks** and click **Create Stack**.
	![](https://oracle-livelabs.github.io/common/images/console/developer-resmgr-stacks.png " ")
2.  Choose **Template** and click on **Select Template**.

    ![Image alt text](images/db19c-ft-step1-3.png " ")
3.  In the Browse Templates window, select **Compute Instance** and click the **Select Template** button.
    ![Image alt text](images/ln-compute-step3-3.png " ")

4.  Enter the name for your Compute Stack:  **livelabslinux**. Choose your compartment and click **Next**.
   ![Image alt text](images/ln-compute-step3-4.png " ")
5. Fill in the following values for your new compute instance.
   	- Compute Instance Display Name: Choose a name for your instance
  	 - Choose the VCN you created in the previous step
  	 - Choose a subnet from the drop down

   ![Image alt text](images/linux-compute-step3-3.png " ")
6.  Scroll down, provide the following values for your compute instance and click **Next**.
  	 - Check the Assign Public IP *(Note: This is VERY IMPORTANT, you will not be able to login to your instance without this)
  	 - Paste the public key you created in the earlier lab
   ![Image alt text](images/linux-compute-step3-4.png " ")

7.   Review your selections and click **Create**
   ![Image alt text](images/linux-compute-step3-5.png " ")

## Task 4: Run Compute Stack Apply Job
Now that your stack has been created, you will run an *apply* job to create the actual compute instance

1. Click **Apply** on the Stack Details page.
![Image alt text](images/db19c-ft-step2-1.png " ")
2. Inspect the apply job, accept all defaults and click **Apply**
![Image alt text](images/db19c-ft-step2-2.png " ")
3. The VCN will immediately begin creation.
![Image alt text](images/db19c-freetier-step1-10.png " ")
4. Once the apply job is complete, inspect the results.  
![Image alt text](images/linux-compute-step3-9.png " ")
5. You will notice that 3 objects were created.  Your instance has a private IP address and a public IP address.  Copy the public IP address, you will need it to connect to your instance.
![Image alt text](images/db19c-freetier-step1-12.png " ")
6. Click the **Navigation Menu** in the upper left, navigate to **Compute**, and select **Instances**.
	![](https://oracle-livelabs.github.io/common/images/console/compute-instances.png " ")
7.  The compute instance you created should be listed. Note the public IP address.
![Image alt text](images/linux-compute-step3-11.png " ")     

## Task 5: Connect to your instance

There are multiple ways to connect to your cloud instance.  Choose the way to connect to your cloud instance that matches the SSH Key you generated.  *(i.e If you created your SSH Keys in cloud shell, choose cloud shell)*

- Oracle Cloud Shell
- MAC or Windows CYCGWIN Emulator
- Windows Using Putty

### Oracle Cloud Shell

1. To re-start the Oracle Cloud shell, go to your Cloud console and click the cloud shell icon to the right of the region.  *Note: Make sure you are in the region you were assigned*

    ![Open cloud shell.](https://oracle-livelabs.github.io/common/images/console/cloud-shell-open.png " ")

2.  Go to **Compute** -> **Instance** and select the instance you created (make sure you choose the correct compartment)
3.  On the instance homepage, find the Public IP address for your instance.
4.  Enter the command below to login to your instance.
    ````
    ssh -i ~/.ssh/<sshkeyname> opc@<Your Compute Instance Public IP Address>
    ````

    *Note: The angle brackets <> should not appear in your code.*
5.  When prompted, answer **yes** to continue connecting.

### MAC or Windows CYGWIN Emulator
1.  Go to **Compute** -> **Instance** and select the instance you created (make sure you choose the correct compartment)
2.  On the instance homepage, find the Public IP address for your instance.

3.  Open up a terminal (MAC) or cygwin emulator as the opc user.  Enter yes when prompted.

    ````
    ssh -i ~/.ssh/<sshkeyname> opc@<Your Compute Instance Public IP Address>
    ````
    ![SSH](./images/ssh-first-time.png " ")


    *Note: The angle brackets <> should not appear in your code.*

### Windows using Putty

1.  Open up putty and create a new connection.

    ````
    ssh -i ~/.ssh/<sshkeyname> opc@<Your Compute Instance Public IP Address>
    ````

    *Note: The angle brackets <> should not appear in your code.*

2.  Enter a name for the session and click **Save**.

    ![](./images/putty-setup.png " ")

3. Click **Connection** > **Data** in the left navigation pane and set the Auto-login username to root.

4. Click **Connection** > **SSH** > **Auth** in the left navigation pane and configure the SSH private key to use by clicking Browse under Private key file for authentication.

5. Navigate to the location where you saved your SSH private key file, select the file, and click Open.  NOTE:  You cannot connect while on VPN or in the Oracle office on clear-corporate (choose clear-internet).

    ![](./images/putty-auth.png " ")

6. The file path for the SSH private key file now displays in the Private key file for authentication field.

7. Click Session in the left navigation pane, then click Save in the Load, save or delete a stored session STEP.

8. Click Open to begin your session with the instance.

Congratulations!  You now have a fully functional Linux instance running on Oracle Cloud Compute.  

You may now proceed to the next lab.

## Acknowledgements
- **Author** - LiveLabs Team, DB Product Management
- **Contributors** - Jaden McElvey, Anoosha Pilli, Sanjay Narvekar, David Start, Arabella Yao
- **Last Updated By/Date** - Arabella Yao, Aug 2022

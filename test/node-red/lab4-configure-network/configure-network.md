# Configure the Network Security and Firewall

## Introduction

In this lab, we will configure the Virtual Cloud Network to allow incoming traffic on port 1180 (the default port of Node-RED).
Furthermore, we will also configure the firewall on Oracle Autonomous Linux (OAL) to allow incoming traffic on the same port.

Estimated time: 20 minutes

### Objectives
* Configure Network Security List to allow incoming traffic on port 1880
* Configure the firewall service on (OAL) to allow incoming traffic on port 1880

### Prerequisites
* A VCN
* A compute instance running OAL
* Connected via SSH to your compute instance

## Task 1: Configure Network Security List

1. Click the **Navigation Menu** in the upper left, navigate to **Networking**, and select **Virtual Cloud Networks**. Select the VCN by clicking on its name

	![](https://oracle-livelabs.github.io/common/images/console/networking-vcn.png " ")

2. Now click on **Security Lists** on the left navigation bar for the VCN.

   ![Click on Security Lists](images/vcn2.png " ")

3. Click on the **Default Security List**.

4. Here you need to open port **1880**. Click on **+ Another Ingress Rule** and add the following values as shown below:

   - **Source Type:** CIDR
   - **Source CIDR**: 0.0.0.0/0
   - **IP Protocol:** TCP
   - **Source Port Range:** All
   - **Destination Port Range:** 1880
   - Click on **Add Ingress Rules** at the bottom.

   ![Add Ingress Rule](images/addIngress1.png " ")

## Task 2: Update the OAL Firewall service

Change to your SSH session. We will now configure the firewall service on OAL to allow incoming traffic on port 1180.

Type the following command: `sudo firewall-cmd --permanent --add-port=1880/tcp`

You can control the currently configured firewall rules for which incoming traffic is allowed by typing `sudo firewall-cmd --list-all --zone=public`

![Firewall Public Zone Rule](images/firewall-public-rules.png " ")

**Congratiulations!** You have finished this lab. Now lets start up Node-RED in next lab.

## Acknowledgements
* **Author** - Kevin Lazarz, Product Manager
* **Last Updated By/Date** - Kevin Lazarz, Product Manager, November 2021

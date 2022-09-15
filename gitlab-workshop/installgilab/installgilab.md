# Install GitLab on Compute Instance running Oracle Enterprise Linux 8.x

## Introduction

This Lab will walk you through the step by step instructions of installing GitLab via Officail Linux package on virtual machine running Oracle Enterprise Linux 8.x.

Estimated Time: 15 minutes


### Objectives


In this lab, you will:
* Install and configure the necessary dependencies 
* Add the GitLab package repository and install the package
* Login to GitLab Console

### Prerequisites

This lab assumes you have:
* Configured OCI Networking
* Provisioned a Virtual Machine on OCI
* Ability to SSH into to server via a Public IP




## Task 1: Install and configure the necessary dependencies

The dependecy requirements mentioned below are tailored for OEL 8.x. For installation dependecy requirements for OEL 7.x refer to [documentation](https://about.gitlab.com/install/#centos-7) 

1. Install and configure the necessary dependencies


    ```
    <copy>sudo yum install -y curl policycoreutils-python-utils openssh-server perl</copy>   
    ```


2.  Enable OpenSSH server daemon (won't be required for Oracle Cloud provided images)

    ```
    <copy>sudo systemctl enable sshd</copy>
    <copy>sudo systemctl start sshd</copy>
    ```


3. Enable the Firewall rules 
    ```
    <copy>sudo firewall-cmd --permanent --add-service=http</copy>
    <copy>sudo firewall-cmd --permanent --add-service=https</copy>
    <copy>sudo systemctl reload firewalld</copy>
    ```

4. Install Postfix to send notification emails
    ```
    <copy>sudo yum -y install postfix</copy>
    <copy>sudo systemctl enable postfix --now</copy>
    <copy>sudo systemctl status postfix</copy>
    ```

> **Note:** During Postfix installation a configuration screen may appear. Select 'Internet Site' and press enter. Use your server's external DNS for 'mail name' and press enter. If additional screens appear, continue to press enter to accept the defaults.


5. Configure OCI Network Security List

Enable port 80 & 443 in the security list of the Public Subnet to allow the GitLab access via application console

![Configure Securtity Rules](images/securityRules.png)

## Task 2: Add the GitLab package repository and install the package

1. Add a GitLab package repository to the instance
    ```
    <copy>curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ee/script.rpm.sh | sudo bash</copy>
    ```


2. Get the fully qualified domain name (FQDN) for the host
    ```
    <copy>cat /etc/hosts</copy>
    127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
    ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
    172.30.0.84 gitlab.sub09012145440.livelab.oraclevcn.com gitlab
    ```

3. Install GitLab Packages and substitute the FQDN for EXTERNAL_URL variable
    ```
    <copy>sudo EXTERNAL_URL="http://gitlab.sub09012145440.livelab.oraclevcn.com" yum install -y gitlab-ee</copy>
    ```
    > **Note:** *Since the FQDN is not publically routable, so the instead of https we will configure GitLab with http protocol for access. 
    Https can be used if the URL is publically routable. In order to use HTTPS, make sure to correctly set up the DNS, and change https://gitlab.sub08271857090.livelab.oraclevcn to the public URL at which you want to access your GitLab instance. Installation will automatically configure and start GitLab at that URL. For https:// URLs, GitLab will automatically request a certificate with Let's Encrypt, which requires inbound HTTP access and a valid hostname. You can also use your own certificate or just use http:// (without the s ). If you would like to specify a custom password for the initial administrator user ( root ), check the documentation. If a password is not specified, a random password will be automatically generated.*

4. Output (partial) of the installation process:
    ```
    Notes:
    Default admin account has been configured with following details:
    Username: root
    Password: You didn't opt-in to print initial root password to STDOUT.
    Password stored to /etc/gitlab/initial_root_password. This file will be cleaned up in first reconfigure run after 24 hours.

    NOTE: Because these credentials might be present in your log files in plain text, it is highly recommended to reset the password following https://docs.gitlab.com/ee/security/reset_user_password.html#reset-your-root-password.

    gitlab Reconfigured!

        *.                  *.
        ***                 ***
        *****               *****
        .******             *******
        ********            ********
    ,,,,,,,,,***********,,,,,,,,,
    ,,,,,,,,,,,*********,,,,,,,,,,,
    .,,,,,,,,,,,*******,,,,,,,,,,,,
        ,,,,,,,,,*****,,,,,,,,,.
            ,,,,,,,****,,,,,,
                .,,,***,,,,
                    ,*,.



        _______ __  __          __
        / ____(_) /_/ /   ____ _/ /_
    / / __/ / __/ /   / __ `/ __ \
    / /_/ / / /_/ /___/ /_/ / /_/ /
    \____/_/\__/_____/\__,_/_.___/


    Thank you for installing GitLab!
    GitLab should be available at http://gitlab.sub09012145440.livelab.oraclevcn.com

    For a comprehensive list of configuration options please see the Omnibus GitLab readme
    https://gitlab.com/gitlab-org/omnibus-gitlab/blob/master/README.md

    Help us improve the installation experience, let us know how we did with a 1 minute survey:
    https://gitlab.fra1.qualtrics.com/jfe/form/SV_6kVqZANThUQ1bZb?installation=omnibus&release=15-3


    Verifying        : gitlab-ee-15.3.2-ee.0.el8.x86_64                                                                                                                                                                                   1/1

    Installed:
    gitlab-ee-15.3.2-ee.0.el8.x86_64

    Complete!

    ```




3. Get the default password for the root user
    ```
    <copy>sudo cat /etc/gitlab/initial_root_password</copy>
    # WARNING: This value is valid only in the following conditions
    #          1. If provided manually (either via `GITLAB_ROOT_PASSWORD` environment variable or via `gitlab_rails['initial_root_password']` setting in `gitlab.rb`, it was provided before database was seeded for the first time (usually, the first reconfigure run).
    #          2. Password hasn't been changed manually, either via UI or via command line.
    #
    #          If the password shown here doesn't work, you must reset the admin password following https://docs.gitlab.com/ee/security/reset_user_password.html#reset-your-root-password.

    Password: F0Wv53Vuu2/TDf+gF+9KzoBlvYrliIPiMnYiKhwsaIE=

    # NOTE: This file will be automatically deleted in the first reconfigure run after 24 hours.
    ```

## Task 3: Browse to the hostname and login

1. Point the URL to the **http://``<Public IP Address>``** of the compute instance and login, using the *root* username and the *default password* generated by the installation 

![Login](images/loginScreen.png)

2. To change the password of the root user, navigate to the **Menu** in the upper Left, navigate to **Admin** and select **Users**, and click on the user *Administrator* and then **Edit**. Specify the new password and log back in using the new password. 

![Config](images/password.png)

## Task 4: Recreate another Compute for GitLab Runner Installation

1. Use the same process to create compute for GitLab Runner Installation. Instance with 2 OCPUs and 16GB of RAM should be sufficient for the installation to succeed. After successful creation of the compute, we should have two compute instances up and running. GitLab software has already been installed and configured on the compute named *gitlab*, whereas compute named *runner* will be used in the next Lab for accessing Kubernetes cluster. 

  | Hostname | VCN Subnet | OCPUs | Memory (GB) |
  | --- | --- | --- | --- |
  | gitlab | Public Subnet | 4  | 64 GB RAM  |
  | runner | Public Subnet | 2  |  32 GB RAM |
  

## Learn More

* [Gitlab: Installation system requirements](https://docs.gitlab.com/ee/install/requirements.html)
* [Deploy GitLab to enable CI/CD pipelines on OCI](https://docs.oracle.com/en/solutions/deploy-gitlab-ci-cd-oci/index.html)
* [GitLab with OCI ARM-based compute instances](https://about.gitlab.com/blog/2021/05/25/gitlab-oracle-cloud-arm-based/)
* [Quick Start: Deploy to Oracle Cloud](https://github.com/oracle-quickstart/oci-gitlab-ce)
* [Deploy GitLab Runners on Oracle Container Engine for Kubernetes with autoscaling](https://docs.oracle.com/en/solutions/git-lab-runners-on-oke)

* [GitLab Environment Toolkit](https://gitlab.com/gitlab-org/gitlab-environment-toolkit)

## Acknowledgements
* **Author** - Farooq Nafey, Princiapl Cloud Architect
* **Last Updated By/Date** - Farooq Nafey, August 2022

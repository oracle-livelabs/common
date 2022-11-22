# QA checks and steps

## Introduction

Quality checks and review of your workshop are to ensure the users enjoy the workshops and provide the best experience with the Oracle technologies. Some of the QA steps are to ensure the LiveLabs standards, and hopefully most of these checks have been done throughout the development of the workshop.

### Objectives

* Request for a review
* Test your content

### What Do You Need?
* Git Environment Setup
* GitHub Desktop client

This lab assumes that you have completed **Lab 4: Develop Markdown and content** in the **Contents** menu on the right.

Watch this video below on how to self-QA your workshop.
[](youtube:8tirP-hibsk)


## Task 1: Share your workshop for review

After you have successfully set up your GitHub pages, you can share your workshop for review.
To share and view your workshop:
1. In the browser, enter the URL of your GitHub Pages. For example, if I want to share a workshop in the *em-omc* folder for review, the GitHub Pages URL is [https://arabellayao.github.io/em-omc/](https://arabellayao.github.io/em-omc/). Please replace *em-omc* with the repository of your workshop.

2. Append the URL with the details of your workshop.
    The complete URL will look similar to this: [https://arabellayao.github.io/em-omc/enterprise-manager/emcc/workshops/freetier/index.html](https://arabellayao.github.io/em-omc/enterprise-manager/emcc/workshops/freetier/index.html), which can be shared for review.


## Task 2: Change your status
Now that your workshop is in the repositories inside the Oracle LiveLabs GitHub project, set your workshop status in WMS to the appropriate status: **In Development** or **Self QA**.
1. Go to the WMS (Oracle employees only - [bit.ly/oraclelivelabs](https://bit.ly/oraclelivelabs)) and click **Edit My Workshops**.

  ![Edit Workshop](images/edit-my-workshop.png " ")

2.  Go to the row for your workshop and click the **WMS ID** of your workshop.
    >**Note:** If your workshop is already in production, you will need to contact livelabs-admin_us@oracle.com to edit it.

    ![WMS ID](images/wms-id.png " ")

3.  On the *Workshop Details* page, update your **Workshop Status**. If you are finished and ready to QA, change the status to **Self QA**. If you still have some work to do, change the status to **In Development**.

  ![Statuses](images/workshop-status.png " ")

## Task 3: Self QA
You have finished developing your workshop. To publish your workshop, you still need to perform self-QA on the workshop.

1.  On the *Workshop Details* page, ensure **Workshop Title** matches the workshop title in development, and **Short Description**, **Long Description**, **Workshop Outline**, and **Workshop Prerequisites** are all up-to-date. Click **?** beside each field to see its details.

  ![Basic Information](images/description.png " ")
  ![Detailed Workshop Information](images/outline-description.png " ")

2.  Update **Development GitHub/GitLab URL** to your personal GitHub page address, which we identified at Task 4. After your workshop has been added to oracle-livelabs/repository (your pull request has been merged), update the **Production GitHub/GitLab URL**. You need to construct the Production URL by replacing your username in the **Development GitHub/GitLab URL** with **oracle-livelabs**.

3. Click the **Tags** tab. Make sure you have selected the correct tags for **Level**, **Role**, **Focus Area**, and **Product**. Click **Save**. Tags help people find your workshop in LiveLabs.
  ![Tags](images/tags.png " ")

4.  If you have changed your Status to **Self QA**, you will receive a **Self QA form** from your *stakeholder* (livelabs-help-xx_us@oracle.com) of your workshop. You can also download the [document](https://objectstorage.us-ashburn-1.oraclecloud.com/p/MKKRgodQ0WIIgL_R3QCgCRWCg30g22bXgxCdMk3YeKClB1238ZJXdau_Jsri0nzP/n/c4u04/b/qa-form/o/QA.docx) here. Check your workshop against the form and fill it out. Update your workshop and create a new pull request if necessary for the workshop to follow LiveLabs standards.

  Workshop teams and stakeholders can watch this video below on how to self-QA or verify the QA of a workshop.
  [](youtube:8tirP-hibsk)

5. After you finish Self QA, and your changes are reflected on the oracle.github.io page, set your **Workshop Status** to **Self QA Complete** in WMS.
  ![Self QA Complete](images/self-qa-complete.png " ")

6. Then, email your completed Self QA document to your stakeholder email address. The stakeholder is who sent you the Self QA form. You can also find your stakeholder by going into WMS and looking at your *Workshop Details* page.

7. Your stakeholders will verify the QA within 2 business days. They will reach out to you via WMS if there are more changes needed. Otherwise, they will move the workshop into **Completed** status. If you have not heard back from your stakeholders 2 business days after you submit the Self QA form, please message them via WMS. While you are waiting to hear back from your stakeholder, you can go to Task 9 and request publishing.

  ![Message](images/message-team.png " ")

8. Questions?  Go to your workshop and find your stakeholder email address, and contact them.  You can also ask in the #workshops-authors-help Slack channel.

  ![Stakeholder](images/stakeholder.png " ")


## Acknowledgements

* **Author:**
   * Michelle Malcher, Senior Manager, Oracle Database Product Management
* **Contributors:**
    * Lauran Serhal, Principal User Assistance Developer, Oracle Database and Big Data User Assistance
    * Anuradha Chepuri, Principal User Assistance Developer, Oracle GoldenGate
    * Aslam Khan, Senior User Assistance Manager, ODI, OGG, EDQ
    * Kamryn Vinson, Product Manager, Database
    * Anoosha Pilli, Product Manager, Database
    * Arabella Yao, Product Manager, Database
    * Madhusudhan Rao, Product Manager, Database

* **Last Updated By/Date:** Michelle Malcher, August 2022

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

You have finished developing your workshop. To publish your workshop, you still need to perform Self-QA on the workshop.

1.  On the *Workshop Details* page, ensure **Workshop Title** matches the workshop title in development, and **Short Description**, **Long Description**, **Workshop Outline**, and **Workshop Prerequisites** are all up-to-date. Click **?** beside each field to see its details.

  ![Basic Information](images/description.png " ")
  ![Detailed Workshop Information](images/outline-description.png " ")

2.  Update **Development GitHub/GitLab URL** to your personal GitHub page address, which we identified at Task 4. After your workshop has been added to oracle-livelabs/repository (your pull request has been merged), update the **Production GitHub/GitLab URL**. You need to construct the Production URL by replacing your username in the **Development GitHub/GitLab URL** with **oracle-livelabs**.

3. Click the **Tags** tab. Make sure you have selected the correct tags for **Level**, **Role**, **Focus Area**, and **Product**. Click **Save**. Tags help people find your workshop in LiveLabs.

  ![Tags](images/tags.png " ")

4.  If you have changed your Status to **Self QA** or **Quarterly Self QA**, click on the **Self QA Checklist** tab and check your workshop against the form and check all the checkboxes and upload the images. Click **Save** to the changes made to the Self QA Checklist form in WMS. Update your workshop and create a new pull request if necessary for the workshop to follow LiveLabs standards.

  ![Self QA Checklist](./images/self-qa-checklist-1.png " ")
  ![Self QA Checklist](./images/self-qa-checklist-2.png " ")

  Workshop teams and stakeholders can watch this video below on how to self-QA or verify the QA of a workshop.
  [](youtube:8tirP-hibsk)

5. After you finish Self QA, and your changes are reflected on the oracle.github.io page, set your **Workshop Status** to **Self QA Complete** in WMS.
  
  ![Self QA Complete](images/self-qa-complete.png " ")

6. Your stakeholders will verify the QA within 2 business days. They will reach out to you via WMS if there are more changes needed. Otherwise, they will move the workshop into **Completed** status. If you have not heard back from your stakeholders 2 business days after you submit the Self QA form, please message them via WMS. While you are waiting to hear back from your stakeholder, you can go to Lab 6 Task 2 and request publishing.

  ![Message](images/message-team.png " ")

8. Questions?  Go to your workshop and find your stakeholder email address, and contact them.  You can also ask in the #workshops-authors-help Slack channel.

  ![Stakeholder](images/stakeholder.png " ")

## Task 4: Quarterly QA

For the workshop in **Completed** or **Quarterly QA Complete** status and have published entries we want to ensure that customers benefit from workshops that contain up-to-date information. So, the workshop team needs to perform Quarterly QA of the workshop within every 90 days.

1. The workshop status will automatically update to Quarterly QA after 60 days and workshop team will receive an email to perform Quarterly QA of the workshop. At this point, the workshop team needs to follow the instructions in the email and complete the self QA Checklist as in Task 3 step 4 to perform the Quarterly QA of the workshop.

2. Once you save the filled out Self QA Checklist and have updated your workshop, create pull request if necessary with all your changes and set your **Workshop Status** to **Quarterly QA Complete** in WMS.

    ![Quarterly QA Complete](images/quarterly-qa-complete.png " ")

3. If the workshop team does not perform the Quarter QA within the 90 days period, the LiveLabs publishers will remove the published workshop from production. The workshop will remain in the WMS catalog and will be purged after 30 days.

  ![Entry Disabled](./images/entry-disabled.png " ")
  ![Disabled](./images/disabled.png " ")

4. Questions? Go to your workshop and find your stakeholder email address, and contact them. You can also ask in the #workshops-authors-help Slack channel.

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

* **Last Updated By/Date:** Anoosha Pilli, February 2023

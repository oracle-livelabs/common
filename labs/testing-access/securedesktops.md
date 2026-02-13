# Using Secure Desktops 

## Introduction

Use this guide to learn more about how to start with Secure Desktops! This guide will walk you through launching the desktop and provide a few tips to make using it easier. To ensure a smooth experience, please review the following requirements before you begin:

- Use Google Chrome as the browser. It's tools best support Secure Desktop. 
- Make sure you have pop-ups enabled in your browser. 
- You are logged out of any OCI tenants in the browser. 

### Objectives

* **Validate Connectivity:** Confirm that participants can reach and use Secure Desktops.

**Estimated Time:** 10 minutes


## Task 1: Open the workshop page

1. Start by navigating to your selected workshop sent to you by your account team.

2. Look for the green **START** button and click it to begin the reservation process.

    ![Start button](./images/start-button.png " ")

3. Next, you may see 2 option: ***Run on your own tenancy*** or ***Run on LiveLbs Sandbox***.

    Select the option to run the lab in the LiveLabs Sandbox environment.

    ![Run on LiveLabs Sandbox](./images/run-sandbox.png " ")

## Task 2: Log in with your Oracle SSO

1. Login using your **Oracle Single Sign-On (SSO) ID**.
If you don’t have one, follow the prompts to create a [free Oracle account](https://profile.oracle.com/myprofile/account/create-account.jspx).

    ![Create a free Oracle account](./images/new-oracle-account.png " ")

## Task 3: Reserve your workshop

1. In the Reserve Workshop window, toggle the **Start Workshop Now** option. Confirm your selection to begin provisioning the environment.

    ![Submit reservation](./images/submit-reservation.png " ")

2. *Note: You can Preview Sandbox Instructions before submitting your reservation.*

    ![Fill out form](./images/preview-instructions.png " ")

Now your reservation was submitted!

## Task 4: View your reservation

1. Once reserved, head to the **My Reservations** page. If you don’t see your workshop right away, simply refresh your browser.

    ![View reservation](./images/my-reservation.png " ")

## Task 5: Wait for the environment to be ready

1. It typically takes 10–20 minutes for the sandbox environment to be fully provisioned.

    ![View reservation](./images/reservation-waiting-time.png " ")

You’ll know it’s ready when the status shows as active.

## Task 6: Test the login process

1. Click **Launch Workshop**.

    ![Launch Workshop](./images/launch-workshop.png " ")

2. At the top-left of the page, a link labeled “View Login Info” will appear – click it to see your credentials.

    ![View Login Info](./images/view-login-info.png " ")


## Task 7: Login to Secure Desktops

1. Click the **Launch Secure Desktop** button in LiveLabs. 

    ![Secure Desktop Information](./images/livelabs-resinfo.png)

2. If you have another OCI session in your browser, you will need to click the "Sign in with a different user account" option after launching secure desktops. 

    ![Sign in with a different user](./images/signin-differentuser.png)

2. Enter the Desktop Tenancy name, found in the Secure Desktop Information section in LiveLabs. 

    ![Login to Secure Desktop](./images/securedesktoplogin.png)

4. If you have to select an identity domain for the tenancy, please select the **Default** domain. 

    ![Select the Default Identity Domain](./images/signin-domain.png)

3. Login with the Secure Desktop user information. You will have to provide a new password since this is the first login of the user. **NOTE:** If after logging in you see a blank page, simply refresh the page to reach the reset password screen.

    ![Login with User Info](./images/securedesktopuserlogin.png)

    ![Reset User Password](./images/userresetpassword.png)

4. Now you will see the Secure Desktops home page. You will see the desktops you have available to you. Click on the available desktop pool. This will begin provisioning a brand-new desktop for you to use. Please allow for 5-10 minutes for the compute instance to stand up. 

    **Note:** Secure Desktops use pop-ups. Please enable pop-ups in your browser settings before clicking on a Desktop Pool. 

    ![Select a Secure Desktop](./images/securedesktoppools.png)

    ![Secure Desktop Provisioning](./images/openingsecuredesktop.png)

5. Once the desktop has been created, a pop-up window will open and display your desktop. 

    **Note:** you will have to allow pop-ups in your browser settings if nothing pops up after the creation window closes. 

    If you notice that your desktop failed to open or otherwise has issues like the one below, try closing the window and click on the desktop pool again. After a bit more time, the desktop should open in another pop-up window. 

    ![Secure Desktop startup failure](./images/securedesktopfail.png)

6. Once the desktop has been opened, click through the Oracle Linux setup screens. 

    ![Linux Startup Language Select](./images/linuxstartup1.png)

    ![Linux Startup Keyboard Select](./images/linuxstartup2.png)

    ![Linux Starup Location Services](./images/linuxstartup3.png)

    ![Linux Startup Online Accounts](./images/linuxstartup4.png)

    ![Linus Startup Completion](./images/linuxstartup5.png)

    ![Gnome Get Started](./images/linuxstartup6.png)


7. After finishing setup, you can open the Firefox browser by going to Activities > Firefox. 

    ![Open Firefox](./images/linuxactivities.png)

8. With the browser open, you can navigate to **livelabs.oracle.com** to sign in and use your LiveLabs environment. 

    ![Go to LiveLabs](./images/livelabs-securedesktop.png)


## Appendix: Tips and Tricks for Secure Desktops 

1. You can use your local machine's clipboard by using the buttons on the left side of the screen. 

    - The top button imports your clipboard to the secure desktop. Use the top button to send information from your computer to the desktop.
        ![Import clipboard](./images/importclipboard.png)
    - The second button exports the secure desktop's clipboard to your local machine. Use the second button to get information from the desktop to your machine. 
        ![Export clipboard](./images/exportclipboard.png)

2. If you are using a NoVNC image in LiveLabs, you may be confused with multiple layers of browser and remote desktop views. In order to minimize these instructions, you can do the following: 

    - Go fullscreen with your browser. 
    - Remove the toolbar of your browser. In chrome, go to **View** and uncheck **Always Show Toolbar in Full Screen**. 

## Contact & Support

If you encounter any blocks or require further information regarding the OCI infrastructure, please contact the Oracle Workshop Coordinator.

## Acknowledgements

- **Created By/Date** - Ramona Magadan, Database Product Management, May 2025
- **Last Updated By/Date** - Matt Kowalik, February 2026
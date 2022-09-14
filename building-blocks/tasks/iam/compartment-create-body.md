<!--
    {
        "name":"Create an OCI Compartment",
        "description":"Create a new compartment using the OCI service console"
    }
-->
A compartment is a collection of cloud assets, like compute instances, load balancers, databases, and so on. By default, a root compartment was created for you when you created your tenancy (that is, when you registered for the trial account). It is possible to create everything in the root compartment, but Oracle recommends that you create sub-compartments to help manage your resources more efficiently.

<<<<<<< HEAD
If you are using an Oracle LiveLabs-provided sandbox, you don't have privileges to create a compartment and should skip this step. Oracle LiveLabs has already created a compartment for you and you should use that one. Even though you can't create a compartment, you can review the steps below to see how it is done.

=======
<if type="livelabs">Oracle LiveLabs created a compartment for you in your LiveLabs Sandbox. Since you don't have privileges to create your own compartment, you will create your Autonomous Database in the compartment that was provided to you. Even though you can't create a compartment, you can review the steps below to see how it is done.
</if>
>>>>>>> d55985721b3eda3e0a1965da470a05acf8c7a3f3

1. Click the three-line menu, which is on the top left of the console. Scroll down to the bottom of the menu, click **Identity & Security -> Compartments**. 

    ![Click Identity & Security then Compartments.](images/oci-navigation-compartments.png " ")

    Then, click the blue **Create Compartment** button to create a sub-compartment.

    ![Click the Create Compartment button.](images/compartment-create.png " ")

2. Give the compartment a name and description. Be sure your root compartment appears as the parent compartment. Press the blue **Create Compartment** button.

    ![Click the Create Compartment button.](images/compartment-click-create.png " ")

<<<<<<< HEAD
    The compartment is created and you can use it for your cloud services!
=======
    The compartment is created, in which you will create an Autonomous Database instance in the next steps.
>>>>>>> d55985721b3eda3e0a1965da470a05acf8c7a3f3


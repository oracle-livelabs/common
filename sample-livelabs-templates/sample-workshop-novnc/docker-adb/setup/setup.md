# Prepare Setup

## Introduction
This lab will show you how to pull, run, and start an Oracle Autonomous Database 23ai Docker image.

*Estimated Lab Time:* 10 minutes

### Prerequisites
This lab assumes you have:
- An Oracle account

## Task 1: Pull and start Docker image
1.  The terminal should be open, if not go to Activities and click Terminal.
 
2.  Run this command:

    ```
    <copy>
    podman login yyz.ocir.io
    </copy>
    ```

3. Now that you are prompted to login, type the username in the format of ***tenancy_name***/***username***. The password will be your ***auth_token***. You will find all the necessary information in the Login Details of your LiveLabs reservation. Hit enter, and it should say "Login Succeeded".

4. Run this following command, and it will pull down the latest version of the 23ai ADB image.

    ```
    <copy>
    podman pull yyz.ocir.io/c4u04/livelabs:latest-23ai
    </copy>
    ```

5. Validate that the image has been pulled down.

    ```
    <copy>
    podman images
    </copy>
    ```

6. Run the image. Replace the WALLET PASSWORD and ADMIN PASSWORD variables with your own.

    ```
    <copy>
    podman run -d \
    -p 1521:1522 \
    -p 1522:1522 \
    -p 8443:8443 \
    -p 27017:27017 \
    -e WORKLOAD_TYPE='ATP' \
    -e WALLET_PASSWORD='xxxxx' \
    -e ADMIN_PASSWORD='xxxxx' \
    --cap-add SYS_ADMIN \
    --device /dev/fuse \
    --name adb-free \
    yyz.ocir.io/c4u04/livelabs:latest-23ai
    </copy>
    ```

7. Take note of the container string that is output by the last command, and insert it into this following command before running.

    ```
    <copy>
    alias adb-cli="podman exec <container_string> adb-cli"
    </copy>
    ```

8. Now, the ADB container is live and you can run commands against it. You can view the list of available commands using the following command.

    ```
    <copy>
    adb-cli --help 
    </copy>
    ```

9. You can add a database.

    ```
    <copy>
    adb-cli add-database --workload-type "ADW" --admin-password "Welcome_1234"
    </copy>
    ```

10. You can change the admin password.

    ```
    <copy>
    adb-cli change-password --database-name "MYADW" --old-password "Welcome_1234" --new-password "Welcome_12345"
    </copy>
    ```

<!-- 11. 
mkdir /scratch/
podman cp adb-free:/u01/app/oracle/wallets/tls_wallet /scratch/tls_wallet

12. 

hostname fqdn -->


<!-- 11. This is how you connect to ORDS.

12. Finally, this is how you would connect to APEX. -->

## Acknowledgements
* **Author** - Kaylien Phan, Senior Product Manager
* **Contributors** - David Start
* **Last Updated By/Date** - Kaylien Phan, May 2024
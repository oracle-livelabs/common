# OptiShot User Manual

## Introduction

OptiShot is a cross-platform image optimization tool that resizes and compresses JPEG and PNG images recursively within a directory. It provides a simple graphical interface for users who prefer not to use the command line.

**Use OptiShot to ensure workshop screenshots comply with LiveLabs standards: images must not exceed 1,280 px in width or height.**

Estimated Time: 5 minutes

### About OptiShot

OptiShot automatically processes all images in a selected folder and its subfolders. JPEG images are resized and compressed with high quality settings (92% quality). PNG images are resized and optimized using oxipng for maximum compression without quality loss.

### Objectives

In this lab, you will:
* Launch OptiShot on Windows or macOS
* Select a folder containing images to optimize
* Understand the processing output and results
* Use command-line options for advanced control

### Prerequisites

This lab assumes you have:
* OptiShot application installed on your computer
* A folder containing JPEG or PNG images to optimize

## Task 0: Download OptiShot

Download the app and unzip.

MacOS (ARM): [OptiShot for MacOS](https://c4u04.objectstorage.us-ashburn-1.oci.customer-oci.com/p/EcTjWk2IuZPZeNnD_fYMcgUhdNDIDA6rt9gaFj_WZMiL7VvxPBNMY60837hu5hga/n/c4u04/b/livelabsfiles/o/optishot/OptiShot-MacOS-arm.zip)

Windows (x64): [OptiShot for Windows](https://c4u04.objectstorage.us-ashburn-1.oci.customer-oci.com/p/EcTjWk2IuZPZeNnD_fYMcgUhdNDIDA6rt9gaFj_WZMiL7VvxPBNMY60837hu5hga/n/c4u04/b/livelabsfiles/o/optishot/OptiShot-Windows.zip)

## Task 1: Launch OptiShot

Launch the OptiShot application on your operating system.

1. **Windows**: Navigate to the OptiShot folder and double-click **OptiShot.exe**.

2. **macOS**: Navigate to the OptiShot folder and double-click **OptiShot.app**.

   > **Note:** On macOS, you may need to right-click and select "Open" the first time you run the application if you see a security warning.

3. The folder picker dialog will appear automatically.

## Task 2: Select a Folder to Process

Choose the folder containing the images you want to optimize.

1. In the folder picker dialog, navigate to the folder containing your images.

2. Select the folder and click **Select Folder** (Windows) or **Open** (macOS).

   > **Note:** OptiShot processes all images recursively, including images in subfolders. The `.git` directory is automatically excluded.

3. The status window will appear showing the processing progress.

## Task 3: Understanding the Output

The status window displays real-time information about the image processing.

1. The output shows each image being processed:

    ```
    Found 25 images. Processing with 4 parallel jobs...
    Resizing: ./images/photo.jpg (2400x1600 → max 1280px)
      Saved: 0.45 MB (471859 bytes)
    ```

2. Images that are already smaller than the maximum dimension are skipped:

    ```
    Skipping (already <= 1280px): ./images/icon.png (256x256)
    ```

3. When processing completes, a summary is displayed:

    | Field | Description |
    | --- | --- |
    | Resized | Number of images that were resized |
    | Optimized | Number of PNG images optimized without resizing |
    | Skipped | Number of images already within size limits |
    | Failed | Number of images that could not be processed |
    | Before | Total size of all images before processing |
    | After | Total size of all images after processing |
    | Saved | Total space saved |

4. Click the **Close** button to exit OptiShot.

## Task 4: Using Drag and Drop

You can also use drag and drop to process images quickly.

1. Locate the folder containing images you want to optimize.

2. Drag the folder onto the OptiShot application icon:

    - **Windows**: Drag the folder onto **OptiShot.exe**
    - **macOS**: Drag the folder onto **OptiShot.app**

3. The status window will appear and processing will begin automatically.

## Task 5: Using Command-Line Options (Optional)

For advanced users, OptiShot supports command-line options.

1. Open a terminal or command prompt.

2. Navigate to the OptiShot directory.

3. Run OptiShot with options:

    **Windows:**
    ```
    <copy>OptiShot.exe C:\path\to\images -m 1920 -j 8</copy>
    ```

    **macOS:**
    ```
    <copy>./OptiShot.app/Contents/MacOS/OptiShot /path/to/images -m 1920 -j 8</copy>
    ```

4. Available command-line options:

    | Option | Default | Description |
    | --- | --- | --- |
    | directory | (folder picker) | Target directory to process |
    | -n, --dry-run | false | Preview changes without modifying files |
    | -j, --jobs | 4 | Number of parallel processing jobs |
    | -m, --max | 1280 | Maximum dimension in pixels |

    >> Note: LiveLabs supports images up to a maximum of 1280px!

5. Example: Preview what would be processed without making changes:

    **Windows:**
    ```
    <copy>OptiShot.exe C:\path\to\images --dry-run</copy>
    ```

    **macOS:**
    ```
    <copy>./OptiShot.app/Contents/MacOS/OptiShot /path/to/images --dry-run</copy>
    ```


## Acknowledgements
* **Author** - LiveLabs Team
* **Last Updated By/Date** - January 2026

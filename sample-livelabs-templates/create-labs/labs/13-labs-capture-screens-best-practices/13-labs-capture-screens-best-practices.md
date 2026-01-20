# Screen Capture: Essential Best Practices

## Introduction

Screen captures (screenshots) are vital for documentation, technical support, process training, product demonstrations, and error reporting. Taking high-quality and consistent static screen captures is important for clarity, security, and professionalism. 

Screen captures are powerful productivity and communication tools. By following established best practices—preparing the environment, ensuring data privacy and compliance, optimizing technical quality, and sharing responsibly—you can minimize risk and maximize clarity in your documentation.

This lab outlines best practices for creating LiveLabs workshops with screen captures. It highlights how to plan, capture, and edit images effectively, maintaining professionalism, security, and accessibility in line with Oracle standards.

### Objectives

* Obtain and use Techsmith Snagit to capture screens
* Review screen captures best practices at a high level
* Resize images in Snagit
* Edit and enhance screen captures
* Redact sensitive information in screen captures
* Use the check unused images tool to list unused and missing screen captures in a lab

### What Do You Need?
* Techsmith Snagit annual subscription which you can order using iProcurement. 
* Learn how to how use Snagit: https://www.techsmith.com/learn/tutorials/snagit/

Snagit's core components are the **Capture Window** (for selecting what to capture – image, video, scrolling, etc.) and the **Snagit Editor** (where you annotate, edit, and organize your captures), supported by a customizable Toolbar, the Library (for storage), and various Capture Presets and features like AI step capture, scrolling capture, and video recording tools, all working together for visual communication. 

The **Capture Window**.

![Sangit capturing software](./images/snagit.png " ")

The **Snagit Editor**.

![Sangit editor software](./images/snagit-editor.png " ")

## Task 1: Best Practices for Screen captures

Here are best practices steps to follow at a very high level which we will explain below in detail.

![Taking screen captures general guidelines](./images/screen-captures-general-guidelines.png =60%x*)

**1. Plan Your Screen Captures**    
- **Be Selective:** Only capture screens that add value to your content.
- **Focus on the Result:** For multi-step or complex tasks, prioritize showing the end state instead of every intermediate step.
- **Avoid Redundancy:** Don’t capture every basic or repetitive action; describe simple or repeated navigation steps with text instead.
- **Reuse When Possible:** If you already included a certain navigation screen, reuse it rather than capturing again.
- **Text Alternatives:** Use text instructions for repeated or simple navigation steps (such as navigating to ADB or SQL worksheet).

**2. Prepare Before Capturing**    
- **Resize for Clarity:** Avoid full-screen captures, especially on large/high-resolution monitors. Set captured windows to a maximum width of **1280 pixels or less** in line with the new LiveLabs screen captures guidance. Tools such as Snagit enables you to specify dimensions.
- **Clear Your Workspace:** Close unnecessary applications, tabs, and windows. Hide any personal bookmarks or sensitive browser elements to avoid accidental disclosure.
- **Crop to Content:** Capture only the relevant content. You can crop in your capture tool such as Snagit’s **Cut Out** tool to remove distractions and excess white space as needed.

**3. Capture Screens Effectively**
- **Use the Right Tool and Area:** Tools such as Snagit (**Capture > All-in-one or Image options**) let you select only what you need such as a window, scrolling window, panel, dialog box, menu, section and so on.

    **All-in-one** default option:
    ![Sangit tools](./images/snagit-all-in-one-option.png " ")

    **Image** option:
    ![Sangit tools](./images/snagit-image-tool.png " ")

- **Task-Based Images:** Every screen capture should have a clear instructional purpose. Capture with purpose. Only show what is needed for a task. For example, resize and select only the area illustrating the immediate objective.

    For example, to illustrate navigation to the SQL Worksheet, resize your Oracle AI Database page, click and highlight the **Database actions** drop-down list and the SQL option. For the red rectangle line thickness, use 4 pts on laptops or 3 pts on large monitors (we used shadow as well). To crop the rest of the page that is not relevant to the task at hand, we used the **Cut Out** tool in Snagit.

    ![Partial screen capture](./images/partial-screen.png " ")

**4. Edit and Enhance**     
- **Consistent Markups for Clarity:** Use the same editing software and styles across all content to maintain visual consistency among multiple authors and workshops. We highly recommend that you use Snagit to both capture and edit screens. This promotes consistency across all workshops.

- **Annotate with Purpose:**
    - Use the same editing software and styles across all content to maintain consistency among multiple authors and workshops.
    - Use simple shapes (rectangles, arrows, callouts, shapes, and so on) to highlight important elements.
    - Keep annotations simple and avoid overcrowding.
    - Add brief and clear text labels where/if helpful.
    - Check that annotation colors and fonts are high-contrast for accessibility.

    The following screen capture shows some favorite Snagit quick styles that we saved as our favorites. This makes it easier and faster to add consistent styles to the labs in a workshop.

    ![Favorite tools](./images/favorite-tools.png " ")

- **Redact Sensitive Information:** As per Oracle’s privacy and security standards, thoroughly remove, cover, and flatten (not blur) personal identifiers, emails, usernames, or sensitive data. This is covered in a later section.
- **Review thoroughly:** Before saving, double-check for clarity, relevance, and privacy compliance.

**5. Save and Share Consistently**

- **Choose the Right File Format:**
    - Use **`PNG`** for UI elements and text-heavy images.
    - Use **`JPEG`** only for photos or images with gradients.
- **Image Quality:** Avoid saving highly compressed or visibly low-quality images.
- **File Naming:** Use clear, standardized, and descriptive filenames such as adb-home-page.png or service-step02-nav.png.
- **Accessibility:**  Every image must have descriptive alt text (e.g., “Screen capture showing the Database Actions drop-down list with SQL highlighted”). See current Oracle Accessibility Guidelines, https:oracle.com/corporate/accessibility/, for more on writing alt text.
- **Maintain Consistency:** Ensure similar resolution, annotation styles, and borders throughout your workshop. This helps reinforce a professional and trustworthy experience.

**Quick Checklist**

- Only capture screens relevant to the step or instruction
- Resize windows to 1280px width or less
- Remove all distractions and any personal or sensitive data
- Use tool-consistent and accessible annotation styles
- Review all images for privacy, clarity, and accuracy
- Save images in appropriate formats (PNG for UI, JPEG for photos/gradients)
- Use clear, consistent filenames (e.g., feature-step-action.png) and manage versions
- Add accurate, descriptive alt text for each image
- Follow Oracle’s security, accessibility, and privacy protocols throughout

## Task 2: Resize images to the new max allowed size 1280 pixels

You can force image resizing in Snagit. Snagit provides several ways to resize images either during capture or after the image has been captured in the Snagit Editor.

### **How to Resize Images in Snagit**

**After Capturing (Snagit Editor)**

1. Open your image in Snagit Editor.   
2. Go to **Image > Resize Image**.   
3. In the **Resize Image** dialog box, you can set the new width and height. You may set the dimensions in pixels, percent, or inches. 
    > _**Important:** Make sure that you choose a max size of **1280 pixels** or less as this is the new LiveLabs requirement starting in 2026. If you don't, your image will be resized when you submit a pull request._

4. Click **Apply** to resize.

**During Capture (Presets)**

1. Snagit doesn’t resize during capture by default, but you can set up capture presets for specific capture dimensions.    
2. Use the Capture Window and choose the area to match your desired size, but automatic resizing to a specific size must be done post-capture in the editor for more precise control.

**Batch Image Resizing**

1. In Snagit Editor, go to **File > Batch Convert**.
2. Select images, then choose Image Size as a step in the batch process to uniformly resize multiple images.

## Task 3: Redact sensitive information in screen captures — The right way

Redacting information in a screenshot means making it truly disappear—so it can never be recovered by software, not just hidden from view. Here’s how to do it securely with TechSmith Snagit:

### **Skip Weak Redaction Tricks**
- Don't blur, pixelate, or use transparent overlays. These methods can often be undone.
- Don't use black rectangles or highlights on separate layers unless you flatten the image.

### **Redact Images Automatically Using Snagit Smart Redact Tool**    
Smart Redact is a feature in Snagit that automatically detects and redacts sensitive information such as email addresses, phone numbers, and other identifiable text from your images. 

>**Note:** Smart Redact is only available in Snagit 2023 and later versions. If you don’t see this option, you might need to update your version.

Here’s how to use **Smart Redact** in Snagit:

**1. Capture or Open an Image:** Capture a screenshot using Snagit, or open an existing image in the Snagit Editor.

**2. Select the Smart Redact Tool:** In the Snagit Editor, look for the **Smart Redact** tool in the toolbar on the right side (or within the “More” tools if you don't see it immediately).

**3. Apply Smart Redact:** Click the **Smart Redact** tool. Snagit will automatically scan the image for recognizable text (like email addresses, phone numbers, etc.) and apply a redaction effect (usually a black bar or box) over these elements.

**4. Review and Adjust:**
- Carefully review the redacted items.
- You can manually adjust or remove a redaction by selecting a box and deleting or resizing it.
- You can also **add additional redactions** by drawing a new redaction box over any region not caught automatically.

**5. Save:** Once you’re satisfied, save your redacted image as usual.

**Notes:**
- Smart Redact is available in Snagit 2023 and newer. If you don’t see the option, you might need to update your version.
- The feature works best with images that have clear, legible text.
- Always verify that all sensitive information has been properly redacted, as automated tools may sometimes miss less obvious data.

**Resources:**  
- For more detailed instructions, visit the [TechSmith Snagit help site](https://support.techsmith.com/hc/en-us/categories/360002219011-Snagit).

### **Redact Manually Using Snagit**
If you have an older version of Snagit, you can manually redact screen captures as follows:

1. Always work on a copy of the original image.
2. For **Extra security**, use Snagit’s **Rectangle Selection**, select the sensitive area, and then press **[Enter]** to delete it. This leaves a blank space.

    ![Select sensitive area and delete](./images/select-sensitive-field.png " ")

3. Fill the blank space with a solid, opaque color (never transparency). I don’t like black which makes the redaction looks like a government document redacted. I use another color for clarity.

    ![Shapes added over deleted fields](./images/shapes-over-deleted-fields.png " ")

4. Flatten all image layers, **Image > Flatten All**.

    ![Shapes added over deleted fields](./images/shapes-over-deleted-fields.png " ")
5. Save the edited capture as a new **`.PNG`** file to avoid leaving hidden data.

**Check and Share**
- Review your redacted screen capture to confirm nothing can be restored.
- Only share or store the redacted version.

**Remember:**
For true security, always erase or overwrite sensitive data, flatten the file, and save a new copy. Never rely on any method that just hides information from sight. 
 
## Task 4: Remove unused images from a lab using the Check Unused Images Tool

The Check Unused Images (CUI) tool helps you identify unused or missing images from the images folder that is associated with a LiveLabs Markdown file (your lab) that you specify in this tool. The tool:

* Lists all extra (unused) images in the images folder that is associated with your lab's .md file that you specify in this tool. 
* The unused images in the selected lab are displayed on the right-hand side of the page.
* Lists any images that are referenced in the lab (.MD) file that you select which are missing from the images folder. 
* The missing images are displayed on the left-hand side of the page.

**Summary:**
Good static screen captures should be clear, focused, free of sensitive data, and professionally annotated. 



You may now **proceed to the next lab**.

## Acknowledgements

* **Author:** Lauran Serhal, Consulting User Assistance Developer, Oracle Autonomous Database
* **Contributors:**
    * Kevin Lazarz, Senior Manager, Product Management
    * Ramona Magadan, Technical Program Manager

* **Last Updated By/Date:** Lauran K. Serhal, January 2026
# List of Building Blocks and Tasks
## Introduction

Review the list of Building Blocks and Tasks that are currently available. Become a contributor by creating reusable components!
## List of Building Blocks

Building Blocks are exposed to customers. You can use these same blocks in your own workshop by adding the block to your manifest.json file.
| Cloud Service | Block |  File | Description |
|---------------| ---- |  ---- |------------ |
| setup | [Add Workshop Utilities](\commonuilding-blocks/workshop/freetier/index.html?lab=add-workshop-utilities) |  \commonuilding-blocks /setup/add-workshop-utilities.md| Utilities for adding data sets and users |

[Go here for the customer view of Building Blocks](/building-blocks/workshop/freetier/index.html)
## List of Tasks

Listed below are the tasks that you can incorporate into your markdown. You can also use the navigation tree on the left to view the tasks. Again, contribute to the list of tasks!
| Cloud Service | Task |  File | Description |
|---------------| ---- |  ---- |------------ |

## Variable Defaults
You can use the default variables or copy the default file to your project and override the settings. See the **Authoring using Blocks and Tasks** topic for details.

[View default variable values](\commonuilding-blocks/variables/variables.json)


## manifest.json Template
The manifest.json template below includes all the tasks that are currently available. You can remove those that you do not plan to use - either directly or thru a Block

The template assumes you copied the default **variables.json** to the same directory as the **manifest.json** file.

```
<copy>
{
  "workshoptitle":"LiveLabs Workshop Template",
  "include": 
  },
  "help": "livelabs-help-db_us@oracle.com",
  "variables": ["./variables.json"],
  "tutorials": [  
    {
        "title": "Get Started",
        "description": "Get a Free Trial",
        "filename": "https://oracle-livelabs.github.io/common/labs/cloud-login/cloud-login.md"
    },
    {
        "title": "Provision Autonomous Database",
        "type": "freetier",
        "filename": "/common/building-blocks/blocks/adb/provision/provision-console.md"
    },
    {
        "title": "Your lab goes here",
        "type": "freetier",
        "filename": "/../../yourlab.md"
    }
  ]
}
</copy>
```
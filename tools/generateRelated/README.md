# generateRelated
Script to find all related sprints by traversing the manifest.json file.

The script looks for the "show_related.tags" key in the manifest.json and creates the related_sprints.json file in the ".../common/related" directory of the GitHub repository.

Please note that your local GitHub repo should have the latest files as per the production repo before you run this script.

## Version 0.3

### Requirements
Python 3.x
This version has only been tested under MacOs. 
It should also work on Linux and Windows.


### Usage
python3 generateRelatedFiles.py


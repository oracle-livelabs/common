# Author: Ashwin Agarwal
# Description: This scripts generates the related sprint/workshops list and stores it in a JSON file in the /common/related directory
# Last updated: 20-Apr-2022
# Requirement: Python 3
# OS: Tested in macOS only
# Version: 0.1

import os
import json
from pathlib import Path

# List of all supported tags. Add new supported tags here.
ALL_TAGS = ["adb", "db"]
# List of all supported files. Add new support files here.
ALL_FILES = ["related_sprints.json"]

# the directory from which the program should start looking for manifest.json files
START_DIR = "learning-library"
# The URL from which the workshop can be viewed
BASE_URL = os.path.join("https://oracle.github.io/", START_DIR)
LL = Path(os.path.realpath(__file__)).parents[3] # path to the learning library directory
OUTPUT_DIR = os.path.join(LL, "common/related/")

# Raise an exception if the start directory is not the same as START_DIR
if os.path.basename(LL) != START_DIR:
    print("ERROR: Exiting... The start directory must be the \"%s\" directory." % START_DIR)
    exit(0)

val = input("Please note that your local GitHub repo should have the latest files as per the production repo before you run this script. Enter \"y\" to continue: ")

if val.lower().strip() not in ("y", "yes"):
    print("Exiting... Since you entered \"%s\"" % val)
    exit(0)
    
def readManifestFileAsJSON(file_path):
    """
    Function reads the manifest file and returns.
    If the file has issues, then the function print the error and return a null JSON
    """
    manifest_file = open(file_path, 'r')
    manifest_raw = manifest_file.read()
    manifest_file.close()
    try:
        manifest_json = json.loads(manifest_raw)
    except:
        print('WARNING: Skipping... File does not follow JSON standards - \"%s\"' % file_path)
        return {}
    else:
        return manifest_json

related_json = {}
    
for folder_path, dirs, files in os.walk(LL):
    if 'index.html' not in files or 'manifest.json' not in files:
        continue
    file_path = os.path.join(folder_path, 'manifest.json')
    manifest_json = readManifestFileAsJSON(file_path)
    
    if 'show_related' in manifest_json:
        if 'workshoptitle' not in manifest_json or \
        'tutorials' not in manifest_json or \
        'title' not in manifest_json['tutorials'][0]:
            print('WARNING: Skipping... File does not have workshoptitle/tutorials/tutorials.title - \"%s\"' % file_path)
            continue
        
        tut_url = str(os.path.join(folder_path, 'index.html')).replace(str(LL), BASE_URL)
        tut_name = manifest_json['tutorials'][0]['title']
        workshop_name = manifest_json['workshoptitle']
        related = manifest_json['show_related']

        for r in related:                        
            if 'tags' not in r or \
            'filename' not in r or \
            'title' not in r:
                print('WARNING: Skipping... File does not have show_related.title/filename/tags - \"%s\"' % file_path)
                continue

            filename = r['filename']
            tags = r['tags']
            
            if filename not in related_json:
                if filename not in ALL_FILES:
                    print("WARNING: Skipping... Related file mentioned is not addded in the ALL_FILES list - Related file: \"%s\" mentioned in \"%s\"" % (filename, file_path))
                    continue
                related_json[filename] = {}
            
            for t in tags:
                if t not in ALL_TAGS:
                    print("WARNING: Skipping... Tag mentioned is not added in the ALL_TAGS list - Tag: \"%s\" mentioned in \"%s\"" % (t, file_path))
                    continue
                if t not in related_json[filename]:
                    related_json[filename][t] = {}
            
                related_title = workshop_name
                if related_title.lower() == "LiveLabs Sprints".lower():
                    related_title = tut_name
                related_json[filename][t] = {related_title: tut_url}
                
output_files = list(related_json.keys())
if len(output_files) > 0:
    print("\nCreating files:\n%s\n" % ",".join(output_files))
else:
    print("\nExiting... No files to create.")
    exit(0)

for related_filename, related_content in related_json.items():
    try:
        file_with_path = os.path.join(OUTPUT_DIR, related_filename)
        f = open(file_with_path, 'w')
        f.write(json.dumps(related_content, indent=3))
        f.close()
        print("SUCCESS: Proceeding... File successfully created! - \"%s\"" % file_with_path)
    except Exception as e:
        print("ERROR: Exiting... File could not be created! - \"%s\"\n%s" % (file_with_path, e))
        exit(0)

print("The script has executed successfully!")
# findManifest
Script to find all manifest for a specific .md.
Use this script to find all manifest.json (or in other words 'workshops') that are using a specific .md.
This is useful in cases such as:
- renaming of an .md file 
- doing massive changes of content in a .md
- just because you want to know in which workshops your .md is being used

It is important to know the potential impact of major changes .md changes on other workshops
Th script outputs manifest including path to stdoutput and also to a csv file located in users home directory (~)

## Version 0.8

### Requirements
Python 3.x
This version has only been tested under MacOs. 
It should also work on Linux.


### Usage
python3 findManifest.py <lab_file.md>


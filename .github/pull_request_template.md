# Add here your WMS ID

# General requirements
1. Information in workshop is adequate and updated
2. Code is correct and working
3. Links are correct
4. Make sure the help email link in your manifest.json is set


# Checklist

## General
- [ ] All filenames are lower case (including folders, images, files, etc.)
- [ ] Markdown filename matches the directory name
- [ ] Filenames are descriptive

## Workshop title & lab titles
- [ ] Titles use imperative verbs,for example use 'Provision a database' instead of 'Provisioning a database
- [ ] Titles use sentence case (unless for product names)
- [ ] Workshop title is the same in WMS, LiveLabs, and manifest.json
- [ ] Lab titles in the sidebar (defined in manifest.json) shoudl generally match titels used in markdown files

## Lab section
- [ ] Each lab has a level 1 titles (#)
- [ ] Each lad has an 'Introduction' using a level-2 header (##)
  - [ ] The introduction includes: 'Estimated time:'
- [ ] Each lab has an 'Objective' identified by a level-3 header (###)
- [ ] Each lab has 'Prerequisites' (use level-3 header ###)
- [ ] Each lab contains numbered tasks a user has to complete
  - [ ] Images should be indented in munbered lists
  - [ ] Code snippets should be indented in numbered lists
- [ ] 'You may now proceed to the next lab' at the end of every lab (do not use links)
- [ ] Each lab has an 'Acknowledgements' section identified by a level-2 header (##)

## Folder structure
- [ ] Your workshop folder structure should be similar to the one used in the sample workshop (https://github.com/oracle-livelabs/common/tree/main/sample-livelabs-templates/sample-workshop)
- [ ] Are you using multiple versions (desktop/, sandbox/, tenancy/)? Make sure that each of them contain a manifest.json and an index.html

## Get started
- [ ] Every workshop contains a 'Get started' lab after the 'Introduction' lab

Check here:
- Tenancy/Free Tier: https://oracle-livelabs.github.io/common/labs/cloud-login/cloud-login.md
- Sandbox/LiveLabs https://oracle-livelabs.github.io/common/labs/cloud-login/- cloud-login-livelabs2.md
- Desktop/noVNC: https://oracle-livelabs.github.io/common/labs/remote-desktop/using-novnc-remote-desktop.md


## Need help
- [ ] Every workshop contains a 'GNeed help?' lab at the end

Check here:
- Tenancy/Free Tier: https://oracle-livelabs.github.io/common/labs/need-help/need-help-freetier.md
- Sandbox/LiveLabs: https://oracle-livelabs.github.io/common/labs/need-help/need-help-livelabs.md
- Desktop: https://oracle-livelabs.github.io/common/labs/need-help/need-help-livelabs.md

## Screenshots
- [ ] Screenshots are current
- [ ] Screenshots have a decent resolution
- [ ] Screenshots are cropped and use highlights
- [ ] Personal/sensitive information is blurred (email addressesm, IP addressesm tenancy names, etc.)
- [ ] Image names are descriptive
- [ ] Image names are lower case
- [ ] Image referneces in markdown contain an alternate text

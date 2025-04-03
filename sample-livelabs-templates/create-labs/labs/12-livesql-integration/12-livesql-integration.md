# Live SQL Integration

## Introduction

This lab walks you through the steps to setup a LiveLabs workshop on the Live SQL platform.

### What is Oracle Live SQL?

With the LiveLabs x Live SQL integration, users can easily execute a workshop’s SQL code in real-time. For workshops, users can get hands-on while avoiding the provisioning period or expense of a Sandbox Environment (Green Button). For sprints, this introduces an integrated hands-on option. 

Our new LiveSQL button can link to a Live SQL Worksheet or a custom Live SQL Tutorial. The worksheet link is dynamically built for you. The URL contains the code you’d like users to run themselves and auto-populates the worksheet with it (example). This is a great option for SQL heavy sprints. However, please note that the code must be able to fit within a 2048 character URL. If your code can’t fit, you should consider creating a LiveSQL Tutorial (instructions in Task 1B). 

### Objectives

* Create a Tutorial in Live SQL
* Add Tasks as Modules
* View and Edit Content
* Publish to LiveLabs

## Task 1A. Add the LiveSQL Button (linked to a LiveSQL Worksheet) to Your Lab

1. Paste the following HTML tag on the line immediately after the lab title.

```
<copy>
<livesql-button>
<copy>
```

2. Enclose the SQL code to be included in the worksheet between <livesql> tags, as shown below. Repeat this step for every code block you want to include.

```
<copy>
<livesql>
create table DEPARTMENTS (
    deptno        number,
    name          varchar2(50) not null,
    location      varchar2(50),
    constraint pk_departments primary key (deptno)
);
</livesql>
<copy>
```

3. If your code modifies the database, please notify your users that they will need to sign into LiveSQL to do so via your markdown instructions or in the code commentary.

## Task 1B. Add the LiveSQL Button (linked to a LiveSQL Tutorial) to Your Lab

1. Create a LiveSQL Tutorial and copy its share link. Instructions on how to do so here.

2. Paste the following HTML tag on the line immediately after the lab title.

```
<copy>
<livesql-button src=“{tutorial-url}”>
<copy>
```

## Task 2. Test Your Live SQL Button

1. If you haven’t already, open your workshop folder in VS Code.

2. Click on the index.html file.

3. Click ‘Go Live’ in the bottom right.

4. Click the ‘Try It Now w/ Live SQL’ button.

5. Ensure the link takes you to LiveSQL and all of the content you expect to see is present.

6. Execute your entire worksheet or tutorial and ensure everything is operating as expected.

## Acknowledgements

* **Author** - Brianna Ambler, Database Product Management
* **Last Updated By/Date** - Brianna Ambler, April 2025
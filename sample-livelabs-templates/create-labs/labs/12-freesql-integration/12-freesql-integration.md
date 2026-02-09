# FreeSQL Integration

## Introduction

This lab walks you through the steps to set up a LiveLabs workshop on the FreeSQL platform.

### What Is Oracle FreeSQL?

With the LiveLabs x FreeSQL integration, users can execute a workshop's SQL code in real-time. For workshops, users get hands-on experience while avoiding the provisioning period or expense of a Sandbox Environment (Green Button). For sprints, this introduces an integrated hands-on option.

Our new FreeSQL button can link to a FreeSQL Worksheet or a custom FreeSQL Tutorial. The worksheet link is dynamically built for you. The URL contains the code you want users to run and auto-populates the worksheet with it (example). This is a great option for SQL-heavy sprints. However, note that the code must fit within a 2048-character URL. If your code exceeds this limit, create a FreeSQL Tutorial (instructions in Task 1B).

Estimated Time: x

### Objectives

* Create a Tutorial in FreeSQL
* Add Tasks as Modules
* View and Edit Content
* Publish to LiveLabs

## Task 1A: Add the FreeSQL Button (Linked to a FreeSQL Worksheet) to Your Lab

1. Paste the following HTML tag on the line immediately after the lab title.

```
<copy>
&lt;freesql-button&gt;
</copy>
```

2. Enclose the SQL code to be included in the worksheet between &lt;freesql&gt; tags, as shown below. Repeat this step for every code block you want to include.

```
<copy>
&lt;freesql&gt;
create table DEPARTMENTS (
    deptno        number,
    name          varchar2(50) not null,
    location      varchar2(50),
    constraint pk_departments primary key (deptno)
);
&lt;/freesql&gt;
</copy>
```

3. If your code modifies the database, notify users that they need to sign into FreeSQL via your markdown instructions or code commentary.

## Task 1B: Add the FreeSQL Button (Linked to a FreeSQL Tutorial) to Your Lab

1. Create a FreeSQL Tutorial and copy its share link. Instructions on how to do so here.

2. Paste the following HTML tag on the line immediately after the lab title.

```
<copy>
&lt;freesql-button src="{tutorial-url}"&gt;
</copy>
```

## Task 2: Test Your FreeSQL Button

1. If you haven't already, open your workshop folder in VS Code.

2. Click on the index.html file.

3. Click 'Go Live' in the bottom right.

4. Click the 'Try It Now w/ FreeSQL' button.

5. Ensure the link takes you to FreeSQL and all expected content is present.

6. Execute your entire worksheet or tutorial and ensure everything operates as expected.

## Acknowledgements

* **Last Updated By/Date:** LiveLabs Team, January 2026

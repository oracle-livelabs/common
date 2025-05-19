<!--
    {
        "name":"Visualize your data in OML notebooks",
        "description":"Learn how to visualize your data using different types of graphs"
    }
-->
# Introduction to Oracle Machine Learning Notebooks 

## Introduction

This lab walks you through the steps to sign into Oracle Machine Learning UI, create an Oracle Machine Learning (OML) notebook from scratch using the notebook environment, and explore the features.

Estimated Time: 15 minutes

### About Oracle Machine Learning Notebooks


The Oracle Machine Learning Notebooks provides:
* Faster notebook loading time than the original notebook interface.
* The Oracle look and feel as it based on the Oracle Redwood theme.
* Enriched visualization in its line chart, area chart, bar chart, pyramid chart, pie chart, donut chart, funnel chart, tag Cloud, treemap diagram, sunburst diagram, scatter plot, box plot.
* Comments in notebook paragraphs to support team collaboration.
* Paragraph Dependencies, which allows you to add runtime sequence dependencies between paragraphs. The child paragraph automatically run after the parent paragraph is run.
* Simplified service level selection of High, Medium, Low through drop-down menu.
* Layout style of Zeppelin or Jupyter notebook interfaces.
* On-page versioning, viewing of version history, and version comparison.

### Objectives

In this lab, you will learn how to visualiza your data in:
* Tables
* Area Chart
* Bar Chart
* Funnel Chart
* Line Chart
* Pie-chart
* Pyramid Chart
* Box Plot
* Scatter Plot 

### Prerequisites

This lab assumes you have:
* An Oracle Machine Learning account
* Access to Oracle Machine Learning USER account.

## Task 1: Visualiza Data in a Table

A table is an arrangement of information or data in rows and columns. Using OML Notebooks, you can create database tables, and also view the information in a tabular format. 

**Dataset:** `CUSTOMER_INSURANCE_LTV`
In these examples, we will use the example template notebook OML-Run-me-first.

1. On the OML UI homepage, click **Examples.** 

	Or, open the left navigation menu by clicking the Cloud menu icon click ![Cloud menu icon](images/icon-cloud.png). Click **Templates** and then click **Examples.** 

2. The OML-Run-Me-First example is listed. If you are unable to view it, type the name in the Filter field. 

3. Click on the `OML Run-me-first tile` (and not on the name) to highlight it in blue. Then click the Create Notebook icon. 

4. In the Create Notebook Dialog, click **OK.**

5. Click **Open Notebook** in the confirmation dialog to open the notebook.


6. Click the Run Paragraph icon in the notebook to run all the paragraphs. This will also create the CUSTOMER_INSURANCE_LTV:


7. To view the data in a table format, run the following script:

	```
	<copy>
	<code>

	%sql

	SELECT * FROM OMLUSER.CUSTOMER_INSURANCE_LTV
	</code>
	</copy>
	```
8. The script presents the data in a tabular format as shown in the screenshot:




9. In this table, you can customize your views and settings.
	a) Sort the columns in ascending or descending order: Click on the down arrow or up arrow against the columns to sort the data in ascending or descending order. 


	b) Use the horizontal scroll bar to scroll horizontally to view the columns on the right.


	c) Filter specific search terms. In the Search field, type the entry or term that you are looking for. In this example, the term "Single" is entered. All the rows that contain the term SINGLE in the column `MARITAL_STATUS` are filtered for display.
	
	**>>Note:** Rows that do not contain this term are hidden from the view and the remaining rows highlight the location of the search term within the row


	d) By default, 5 rows are displayed. If you want to view more rows or customize the table settings, click on the Settings icon  to open the Settings dialog.


	e) In the Settings dialog, you can edit the following:



		* **Height:** This parameter changes the height of the visualization. Click on the up or down arrow to increase or decrease the visualization height. 


		* **Number of Items on Page:** Click on the up or down arrow, as applicable, to set the number of rows to be displayed on the page. By default, 5 rows are displayed.


		* **Columns to Display:** By default, all the columns are listed. If you want to remove any column from displaying, click on the X in the column name. To view the column again, click inside the Columns to Show field. The hidden columns are displayed. Click on the column that you want to view again. In this example the column MARITAL_STATUS was removed. Clicking on the Columns to Show field displays it; click on it to include in the display. 



## Task 2: Visualiza Data in an Area Chart
An area chart uses lines to connect the data points and fills the area below these lines to the x-axis. Each data series contributes to the formation of a distinct shaded region. This emphasizes its contribution to the overall trend. 

As the data points fluctuate, the shaded areas expand or contract. The shaded regions in an area chart imply significant meaning.

**When to use this chart:** Use this chart to gain visual insight into the changes within the dataset.

**Dataset:** CUSTOMER_INSURANCE_LTV

Let's use the previous example to explore the area chart. 

1. To view the data in an area chart icon, click the area chart icon. 

2. The data in the CUSTOMER_INSURANCE_LTV table is now presented in an area chart. 

3. In the Settings dialog, under Setup, you can change the entries in these fields to view the data

	* Series to Show field: Lists the values of the column CREDIT_BALANCE. This value is plotted against the y-axis. You can change the entry in this field to view the data. You can select an additional entry also. Let's change the values in the Series to Show and select BANK_FUNDS and MORTGAGE_AMOUNT.  The area chart is now a stacked chart, and shows the average of BANK_FUNDS and MORTGAGE_AMOUNT along the Y-axis. The data is grouped by MARITAL_STATUS (along the x-axis).

	* Group By field. Lists the values of the column MARITAL_STATUS. This value is plotted along the x-axis. You can select an additional entry also.

	* Height: Click on the up or down arrow, as applicable, to increase or decrease the paragraph height

	* Aggregate Duplicates: Displays the statistical computations of the selected columns in the Series to Show and Group By fields. You can choose to view any one of the following computations in the graphical output - Average, Sum, Maximum, Minimum, Last, and Count. 

4. Under Customization in the Settings dialog, you can customize the following parameters of the graph: 

* Visualizations: 
	 **Cartesian Coordinate:** By default, the data points of the area chart are plotted on a cartesian coordinate grid.  A cartesian coordinate is a system in which the location of a point is given by coordinates that represent its distances from perpendicular lines that intersect at a point called the origin. You can view the same data points on a polar coordinate grid as well.

	**Polar Coordinates:** Polar Coordinates do not apply to time-oriented data
	**Orientation:** The chart orientation. Either horizontal or vertical.
	**Stack:** Defines whether the data items are stacked. Supported Values: on, off.
	**Sorting:** Specifies the sorting of the data. It should only be used for pie charts, bar/line/area charts with one series, or stacked bar/area charts.
 
* Series: Click Series to expand the options of the series.
    * Line Type: Use this option to redefine the look of the lines in the chart. The available types are Straight, Curved, Stepped, and Center Stepped.
    * Fill Color: Use this option to fill in the color of the series element in the chart.
    * Pattern: Use this option to fill the pattern of the series element in the chart.
    * Border Width: Use this option to edit the border width of the series element in pixels.
    * Border Color: Use this option to edit the border color of the series element.

* X-Axis: Expand this field to edit texts and visual settings related to the X-axis. You can enter a name for the X-axis in the Title field, and edit the color and font size under Text. 
 You can also edit the X-axis line color and width in the fields under Line. 
 * Y-Axis: Expand this field to edit the texts and visual settings related to the Y-axis. You can enter a name for the Y-axis in the Text field, and edit the color and font size. You can also edit the Y-axis line color and width. 

 * Description: In the description field, you can provide a name for the chart, subtitles and footnote for the chart. 







## Task 3: Visualiza Data in a Bar Chart

A bar graph is a graphical representation of data in rectangular bars. The length or height  of the bars, depending on the horizontal or vertical orientation, depict the dataset distribution. One axis represents a category, while the other represents values or counts.

**When to use this chart:** Use bar charts to show a distribution of data points, and perform a comparison of metric values across different subgroups of your data. 

**Dataset:** CUSTOMER_INSURANCE_LTV

To visualize data in a bar chart:

1. Click on the bar chart icon.

2. By default, it shows CREDIT_BALANCE along the Y-axis and the data is grouped by Profession along the X-axis. 


3. Click on the Settings icon to get a different view of this data. Under Setup:

	a) In **Series to Show**, select CREDIT_BALANCE, MORTGAGE_AMOUNT, and BANK_FUNDS.

	b) In **Group By**, select MARITAL_STATUS

4. The average of CREDIT_BALANCE, MORTGAGE_AMOUNT, and BANK_FUNDS are each represented by adjacent bar charts, and the bar charts are grouped by MARITAL_STATUS - single, married, divorced, widowed, and others. The bar chart now looks like this, as shown in the screenshot below:


5. Once again, click on the Settings icon and click Customization:

	a) **Coordinate System:** The coordinate system of the chart. Supported Values: Polar Coordinates, Cartesian Coordinates. Click Cartesian Coordinates

	b) **Layout:** The chart orientation. Either horizontal or vertical.

	c) **Stack:** Defines whether the data items are stacked or not. Click Stacked.

	d) **Sorting:** Specifies the sorting of the data. It should only be used for pie charts, bar/line/area charts with one series, or stacked bar/area charts. Sorting will not apply when using a hierarchical group axis. Click Ascending. 

	e) **Zoom:** Specifies the zoom and scroll behavior of the chart. Live behavior means that the chart will be updated continuously as it is being manipulated, while "delayed" means that the update will wait until the zoom/scroll action is done. While "live" zoom and scroll provides the best end user experience, no guarantees are made about the rendering performance or usability for large data sets or slow client environments. If performance is an issue, "delayed" zoom and scroll should be used instead.

The bar chart now presents the data in a stacked manner, and in ascending order, as shown in the screenshot below:


## Task 4: Visualiza Data in a Funnel Chart

A funnel chart is a graphical representation that resembles the shape of a funnel where each segment gets progressively narrower. The segments are arranged vertically and depict a hierarchy. Within the funnel chart, each segment corresponds to a step or stage in a sequential process.

**When to use this chart:* Use this chart to visualize a linear sequential process, mostly in business and sales contexts. For example, you can use a funnel chart to track the sales process, order fulfillment, website visitor trends, and so on.   

**Dataset:** CUSTOMER_INSURANCE_LTV 

To view the data in a funnel chart:
1. Click on the Funnel chart icon

2. The data is displayed as below:


3. Hover your cursor to view the series that is plotted in the funnel chart for each of the 5 groups.


4. Let's compare a few attributes CREDIT_BALANCE, MORTGAGE_AMOUNT and INCOME the same groups. Click Settings and edit the following:


5. The three series are displayed in three funnel charts for each of the 5 groups. 








## Task 5: Visualiza Data in a Line Chart
A line chart is a graphical representation used to display data points connected by straight lines.

When to use this chart: Use this chart to visualize trends, changes, and relationships in data over a continuous period.

For visualizing data in a line chart, we'll use the SALES table that is present in the SH schema. 

About the dataset: The sales dataset comprises 

1. In a sql paragraph in your notebook, run the following command:

	<copy>
	<code>
	%sql
	select * from SH.SALES
	</code>
	</copy>

2. By default, the dataset is displayed in a table. Click on the line chart icon.

3. By default, the Line chart shows the average amount sold from the year 1998 till 2001, as shown in the screenshot below. Click on the Settings icon to view the attributes that are plotted along the X and Y axis.  The dates on which the product was sold from the year 1998 till 2001 are plotted along the X-axis. Corresponding to each sale date, the average of the amount sold is plotted along the Y-axis.

4. Click on the Settings icon and edit the following:
	Under **Setup:**
	a) **Aggregate Duplicate:** Decides what should happen with values that are within the same group. Select Sum. This will show the sum of the amount sold for the product with PROD_ID 13, from 1998 to 2001. 
    b) **Series to Show:** All fields in the result-set that are of type number can be selected. Selecting multiple fields will add additional diagrams to the visualization. Select AMOUNT SOLD.
    c) **Group By:** All fields in the result-set can be selected. The more groups exist, the more the dataset shrinks since it collects all fields and concatenates same values. Select TIME_ID

	Under **Customization:**
	a) X-axis: Enter Time: 1998 - 2001. The dates on which the product was sold from the year 1998 till 2001 are plotted along the X-axis. 
	b) Y-axis: Enter Amount Sold. Corresponding to each sale date, the sum of the amount sold is plotted along the Y-axis.
	c) Description: Enter Sales trend of product ABC 
	
	The Line chart now displays the sum of the amount sold from the year 1998 to 2001, as shown below. Hover your cursor over the highest point in the line chart to view the values. You can see that on 5/30/2000, the product recorded the highest sale in terms of the sum of the amount sold. 


. 
## Task 6: Visualiza Data in a Pie Chart

A pie chart is a graphical representation of data in a circular form, with each slice of the circle representing a fraction that is a proportionate part of the whole.

**When to use this chart:** Use this chart to visualize the numerical proportion of the parts to the whole. 

**About the data set:** The iris data set contains 3 classes (three different Iris species - Setosa, Versicolor, and Virginica) along with 50 samples each, and four numeric properties about those classes: Sepal Length, Sepal Width, Petal Length, and Petal Width.

To visualize data in a pie chart
1. Run the following script in an R paragraph to create the Iris dataset:






2. Run the following SQL command to view the dataset.




3. By default, the dataset is displayed in a table. Click on the pie chart icon. 



4. The data is now displayed in a pie chart. By default, the pie chart shows the average of the sepal length for each of the three species of iris. It also shows a 5% threshold for others.  


5. Click on the settings icon. In the Settings dialog, click Customization. 
	* Under Variant, click Donut. 
	* Inner Radius: Click the up arrow and set it to 40
	* Label: Type Sepal Length of the 3 iris species.   Close the dialog. The data is now rendered in a donut chart, as shown below:

6. Once again, click on the settings icon. In the Settings dialog, 

	a) **Setup:** Under Series to Show, select Petal Length while retaining Sepal Length. 
	b) **Customization:** Under Variant, click Pie.
	c) **Customization:** Under Dimension, click 3D
	d) **Customization:** Under Sorting, click Ascending.
	
	The data is now displayed in two 3D pie charts, one showing the average sepal length, and the other showing the average petal length for each of the three species of the iris flower.  
7. 

## Task 7: Visualiza Data in Pyramid Chart

Pyramid charts present your data in a distinctive triangular configuration, horizontally segmented into partitions. Each segment in the pyramid charts represents points or steps in ascending or descending order. 

**When to use this chart:**  Use this chart to depict hierarchical structures and the relative proportions of different values. They are typically used for displaying demographic data, market segmentation, or organizational structures. In any case, the data must have a progressive order. 

To visualize data in a pyramid chart, let's use the CUSTOMER_INSURANCE_LTV table. 

1. In the OML-Run-Me-First notebook, go to the paragraph where you viewed the CUSTOMER_INSURANCE_LTV.

2. Click on the pyramid chart icon.


3. Click the settings icon. Under Setup:

	a) Aggregate Duplicates: Select Average
	b) Series to Show: Select INCOME and MORTGAGE_AMOUNT
	c) Group By: Select MARITAL_STATUS

	d) Click the settings icon. Under Customization expand Visualization and click click 3D under Dimension

	e) Under Setup, change Group By to GENDER. 

	The pyramid chart shows a clear correlation between the two genders, and their income level and mortgage amount. For both the categories, the average income and mortgage amount taken is higher for Females.


## Task 8: Visualiza Data in a Box Plot
A box plot provides an overview of data distributions in numeric data. It provides general information about the symmetry, skewness, variance, and outliers in a dataset. The box plot uses boxes and lines to depict the data distribution. The box plot has the following components:


* Central Box - Inter-quartile range and quartiles:
    * Q1 (First Quartile): This is the value below which 25% of the data falls. It represents the boundary between the lowest 25% and highest 75% of values.
    * Q3 (Third Quartile): This represents the value below which 75% of the data falls, serving as a border between the lowest 75% and highest 25% of values.
    * Interquartile Range (IQR): The IQR is the range in which the central 50% of the values fall. IQR = Q3 - Q1
 * Whiskers: The whiskers of the box plot extend from the central box to the minimum and maximum data values that are not considered outliers. They provide a graphical representation of the majority of the data's distribution.
* Outliers: Outliers are data points that deviate significantly from other data points, typically due to data variability or errors.
* Median: The median is the value that divides the dataset into two halves, with 50% of the values falling below it and 50% falling above it. In the box plot, a line or a mark inside the central frame represents the median.

**When to use this chart:** Use this chart to show distributions of numeric data, especially if you want to compare them between multiple groups. 

To visualize data in a box plot, let's consider the iris data set.

**About the data set:** The iris data set contains 3 classes (three different Iris species - Setosa, Versicolor, and Virginica) alongwith 50 samples each, and four numeric properties about those classes: Sepal Length, Sepal Width, Petal Length, and Petal Width.



1. Run the following script in an R paragraph to create the Iris dataset:

%r

library(ORE)

if (ore.exists("IRIS_R")) ore.drop(table="IRIS_R")

ore.create(iris, table = "IRIS_R", overwrite=TRUE)

ore.exec("ANALYZE TABLE IRIS_R COMPUTE STATISTICS")

z.show(cat("Shape:", dim(IRIS_R)))


2. Run the following SQL command to view the dataset. 



3. By default, the dataset is displayed in a table. Click the box plot icon



4. The dataset is now displayed in a box plot. 


	As you can see, by default the data is grouped by the 3 species (classes) - Setosa, Versicolor, and Virginca along the X-axis, and the sepal length along the Y axis. Hover your cursor over each box plot to view the count.

5. Click on Settings to view how the data is plotted. Under Settings > Setup > Series to show, click to add the other three numeric properties.


6. Under Settings > Customizations, edit the following settings:
	a) Visualization: Click Show Outliers
	b) X-Axis: Text Enter Iris Species; Color enter 7, 17, 215, 0.88
	c) Y-Axis: Text Enter Petal & Sepal Properties; Color: Enter 7, 17, 215, 0.88
	d) Once done, close the dialog. 



7. The box plot now displays the dataset as below: 

	a) Hover your cursor over each box plot to view the values. In the screenshot here, the cursor is over the Sepal Length series for the species Virginica. The length ranges from 5.6 to 7.9. There is also an outlier for this, and it is indicated by the dot below the box plot whisker. 


	b) Hover your cursor over the dot that indicates the outlier for the group virginica. It shows the outlier value at 4.9 for Virginica sepal length. This means that in the species Virginica, there are sepals whose length is significantly below the lower count (5.6).



## Task 9: Visualiza Data in a Scatter Plot
Scatter plots represent the relationship between two numeric variables in a data set. It represents data points on a two-dimensional plane and show how much one variable is affected by another. The independent variable is plotted on the X-axis, while the dependent variable is plotted on the Y-axis. You can display points by one or more grouping variables such that each group has a distinct color and shape. 

**When to use this chart:** Use the scatter plot when you have paired numerical data, and you want to determine the relationship between the related variables in certain scenarios, identifying correlations and trends (linear and non-linear relationships), detecting outliers, understanding data distribution, identifying groupings or clusters of data. Scatterplots can also be useful when comparing multiple datasets where each datasets values are represented as a different group. Scatterplots are also useful for evaluating regression models by plotting, e.g., actual versus predicted values, 

**Dataset:** CUSTOMER_INSURANCE_LTV.

To visualize data in a scatter plot, we will use the table CUSTOMER_INSURANCE_LTV. For this, we will use the example template OML-Run-me-first notebook.  

1. Click on the Scatter plot icon. A default scatter plot is shown that you will customize in the next step. 

2. Click the settings icon. In the Settings dialog, under Setup:

a) **Series to show on X-axis:** Click and select INCOME.
b) **Series to show on Y-axis:** Click and select MORTGAGE_AMOUNT.
c) **Group By:** Select MARITAL_STATUS
d) Click **Customization.** Under Visualization, retain the default settings.  Under **Description,** under Title Setup, enter Scatter plot to show the correlation between income and mortgage amount. 
The scatter plot shows a strong correlation between Income and Mortgage amount in the income range 50k to 80k.



## Learn More

* [Oracle Machine Learning UI](https://docs.oracle.com/en/database/oracle/machine-learning/oml-notebooks/)


## Acknowledgements

* **Author** -  Moitreyee Hazarika, Principal User Assistance Developer, Database User Assistance Development
* **Contributors** -   Mark Hornick, Senior Director, Data Science and Machine Learning; Marcos Arancibia Coddou, Product Manager, Oracle Data Science; Sherry LaMonica, Consulting Member of Tech Staff, Machine Learning
* **Last Updated By/Date** - Moitreyee Hazarika, November 2024

## Update_Building_Outlines.py 
This script can be used to update the building outlines that feed into the Seattle Building Dashboard.

### Conda Environment needed to run script
The conda environment that is used to run this script includes installation of the following package versions:

python v.3.11.0

pandas v1.5.2

geopandas v0.12.2

### Seattle Buildings Dashboard data download
The CartoDB database that feeds into the Seattle Buildings Dashboard is downloaded each time an updated is needed (just building id and geometry fields) and saved internally: 
P:\proj_p_s\Seattle Building Dashboard\2023 update\Original_Dashboard_Data\seattle_building_outlines_2023.shp
Please create a new folder for next year's update.

### Source Data for Geometry Updates
All building outlines are updated either by making use of the 2015 Seattle Open Data Building Outlines shapefile provided by OSE Seattle or via a manually digitized shapefile of about 20 footprints (for those that were not in the Open Data).  Internal paths to those files:
2015 Open Data Building Outlines: P:\proj_p_s\Seattle Building Dashboard\2023 update\Building_Outline_2015\Building_Outlines___2015.shp"
Digitized file: P:\proj_p_s\Seattle Building Dashboard\2023 update\DigitizingFootprints_20230921\DigitizedFootprints_20230926.shp"

### Input Data for Script
The script relies on four different csv files in order to update the building outlines. These files are produced as a summary from the manual building outlines review process.
The internal root path to the files is P:\proj_p_s\Seattle Building Dashboard\2023 update\csv_updates\.  

These two csv files provide a list of all the building ids that need additions to their footprint..

`add_missing_buildings_from_digitized.csv`: ..using data from the digitized file

`add_missing_buildings_from_opendata.csv`: ..using data from the 2015 Open Data file

These two csv files provide a list of all the building ids to have their footprint replaced..

`replace_missing_buildings_from_digitized.csv`: ..using data from the digitized file

`replace_missing_buildings_from_opendata.csv`: ..using data from the 2015 Open Data file


### Output
A shapefile with updated building footprints (again, just building id and geometry fields) is saved internally to P:\proj_p_s\Seattle Building Dashboard\2023 update\seattle_building_outlines_2023_updated.shp.

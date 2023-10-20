# -*- coding: utf-8 -*-
"""
Created on Fri Sep 29 10:46:11 2023

@author: orizaba / Dariya Draganova

This script can be used to update the building outlines that feed into the Seattle Building Dashboard.

Conda Environment needed to run script
The conda environment that is used to run this script includes installation of the following package versions: python v.3.11.0 pandas v1.5.2 geopandas v0.12.2

Seattle Buildings Dashboard data download
The CartoDB database that feeds into the Seattle Buildings Dashboard is downloaded each time an updated is needed (just building id and geometry fields) and saved internally: P:\proj_p_s\Seattle Building Dashboard\2023 update\Original_Dashboard_Data\seattle_building_outlines_2023.shp Please create a new folder for next year's update.

Source Data for Geometry Updates
All building outlines are updated either by making use of the 2015 Seattle Open Data Building Outlines shapefile provided by OSE Seattle or via a manually digitized shapefile of about 20 footprints (for those that were not in the Open Data). Internal paths to those files: 2015 Open Data Building Outlines: P:\proj_p_s\Seattle Building Dashboard\2023 update\Building_Outline_2015\Building_Outlines___2015.shp" Digitized file: P:\proj_p_s\Seattle Building Dashboard\2023 update\DigitizingFootprints_20230921\DigitizedFootprints_20230926.shp"

Input Data for Script
The script relies on four different csv files in order to update the building outlines. These files are produced as a summary from the manual building outlines review process. The internal root path to the files is P:\proj_p_s\Seattle Building Dashboard\2023 update\csv_updates.

These two csv files provide a list of all the building ids that need additions to their footprint..

add_missing_buildings_from_digitized.csv: ..using data from the digitized file

add_missing_buildings_from_opendata.csv: ..using data from the 2015 Open Data file

These two csv files provide a list of all the building ids to have their footprint replaced..

replace_missing_buildings_from_digitized.csv: ..using data from the digitized file

replace_missing_buildings_from_opendata.csv: ..using data from the 2015 Open Data file

Output
A shapefile with updated building footprints (again, just building id and geometry fields) is saved internally to P:\proj_p_s\Seattle Building Dashboard\2023 update\seattle_building_outlines_2023_updated.shp.
"""

# ===================================================================== #
# ------------------------------- SETUP ------------------------------- #
# ===================================================================== #

import pandas
import geopandas
import ast

#set the display options to display all columns
pandas.set_option('display.max_columns', None)

# ------------------------ USER INPUT REQUIRED ------------------------ #

# paths to shapefiles
root_shp_path = r"P:\proj_p_s\Seattle Building Dashboard\2023 update"
seattle_buildings_path = rf"{root_shp_path}\Original_Dashboard_Data\seattle_building_outlines_2023.shp"
seattle_opendata_path = rf"{root_shp_path}\Building_Outline_2015\Building_Outlines___2015.shp"
digitized_path = rf"{root_shp_path}\DigitizingFootprints_20230921\DigitizedFootprints_20230926.shp"
output_path = rf"{root_shp_path}\seattle_building_outlines_2023_updated.shp"

# paths to csvs
root_csv_path = r"P:\proj_p_s\Seattle Building Dashboard\2023 update\csv_updates"
add_from_opendata = rf"{root_csv_path}\add_missing_buildings_from_opendata.xlsx"
add_from_digitized = rf"{root_csv_path}\add_missing_buildings_from_digitized.xlsx"
replace_from_opendata = rf"{root_csv_path}\replace_missing_buildings_from_opendata.xlsx"
replace_from_digitized = rf"{root_csv_path}\replace_missing_buildings_from_digitized.xlsx"


# ===================================================================== #
# ----------------------------- FUNCTIONS ----------------------------- #
# ===================================================================== #

def create_master(input_df):
    master = pandas.DataFrame()
    for i in range(0,len(input_df.index)):
        #print(i)
        df = pandas.DataFrame(data={'opendataid':[input_df['opendataid'][i]]})
        df['opendataid'] = df['opendataid'].apply(ast.literal_eval)
        df1 = pandas.DataFrame(data={'opendataid':df['opendataid'][0]})
        df1['buildingid'] = input_df['buildingid'][i]
        master = pandas.concat([df1,master])
    master['source'] = 'Seattle Open Data 2015'
    #print(master)
    return master


def create_gdf(master):
    opendata_limited = opendata[opendata.OBJECTID.isin(master.opendataid.tolist())][['OBJECTID', 'geometry']]
    opendata_limited = opendata_limited.rename(columns={"OBJECTID":"opendataid"})
    master_data = master.merge(opendata_limited, how='left', on='opendataid')
    gdf_master = geopandas.GeoDataFrame(data=master_data, geometry=master_data['geometry'], crs=opendata.crs)
    return gdf_master

def digitized_update(df_digi):
    df = digitized[digitized.buildingid.isin(df_digi.buildingid.tolist())]
    return df


# ===================================================================== #
# ---------------------------- MAIN SCRIPT ---------------------------- #
# ===================================================================== #


# IMPORT SHAPEFILES --------------------------------------------------- #
# import shapefiles
print("Importing shapefiles")
buildings = geopandas.read_file(seattle_buildings_path)
opendata = geopandas.read_file(seattle_opendata_path)
digitized = geopandas.read_file(digitized_path)


# IMPORT EXCEL FILES ------------------------------------------------- #
print("Importing excel files")
# opendata geom to add to seattle buildings
add_open = pandas.read_excel(add_from_opendata)
# digitized geom to add to seattle buildings
add_digi = pandas.read_excel(add_from_digitized) 
# opendata geom to replace seattle buildings
replace_open = pandas.read_excel(replace_from_opendata)
# digitized geom to replace seattle buildings
replace_digi = pandas.read_excel(replace_from_digitized)


# REPROJECT TO 4326 CRS, UPDATE FIELD NAMES -------------------------- #
print("Reprojecting to epsg 4326, Updating field names")
opendata = opendata.to_crs(4326)
digitized = digitized.to_crs(4326)
digitized['source'] = 'Digitized'
digitized = digitized[['buildingid', 'source', 'geometry']]
buildings = buildings.rename(columns={'opendataID':'opendataid'})


# CREATE MASTER GEO/DATAFRAMES FROM opendata DATA THAT ADDS TO / REPLACES
# CURRENT building id GEOMETRY -------------------------------------- # 
print("Creating Dataframes and Geodataframes from add_open and replace_open")
df_add_master = create_master(add_open)
df_replace_master = create_master(replace_open)

gdf_add_master = create_gdf(df_add_master)
gdf_replace_master = create_gdf(df_replace_master)


# CREATE GEO/DATAFRAMES OF DIGITIZED FOOTPRINTS TO ADD TO / REPLACE 
# CURRENT building id GEOMETRY -------------------------------------- #
print("Creating Dataframes and Geodataframes from add_digi and replace_digi")
digitized_add = digitized_update(add_digi)
digitized_replace = digitized_update(replace_digi) 

gdf_digi_add = geopandas.GeoDataFrame(data=digitized_add, geometry=digitized_add['geometry'], crs=digitized.crs)
gdf_digi_replace = geopandas.GeoDataFrame(data=digitized_replace, geometry=digitized_replace['geometry'], crs=digitized.crs)


# REMOVE building ids THAT NEED TO BE REPLACED WITH NEW GEOMETRY
list1 = gdf_replace_master.buildingid.tolist()
list2 = gdf_digi_replace.buildingid.tolist()
removeIDs = [list1,list2]

buildings_updated = buildings[~buildings.buildingid.isin(removeIDs[0])]
buildings_updated = buildings_updated[~buildings_updated.buildingid.isin(removeIDs[1])]

# ADD ALL OPENDATA AND DIGITIZED GEOMETRY TO SEATTLE BUILDINGS SHP
gdf_list = [buildings_updated, gdf_add_master, gdf_replace_master, gdf_digi_add, gdf_digi_replace]
buildings_updated = pandas.concat(gdf_list)

# SAVE UPDATED SHAPEFILE
buildings_updated.to_file(output_path)

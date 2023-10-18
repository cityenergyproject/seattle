# Update Building Energy data

Bulding Energy data are served from a single data table on the Seattle Energy [CARTO account](https://cityenergy-seattle.carto.com/dashboard/datasets/). This document describes how to update this dataset.

The bulk of the data update work takes place in an R script managed by the city outside of this repository. The end result of this R script is a data CSV, with field names exactly matching the current set of field names. Other requirements for this data CSV, all managed in R, include: 
- Blanks (empty) for "nodata", not "N/A" or any other "nodata" representation
- Field names that match the current set of field names exactly (case and spelling)
- Field types appropriate to each field (interger, float, string)

Once a data update is delivered, there are a few steps to get this live on the City Energy website
1. Upload to CARTO
2. Local Testing
3. Staging
3. Live deployment

## Upload to CARTO
* From the [dataset landing page](https://cityenergy-seattle.carto.com/dashboard/datasets/) on CARTO, select "New Dataset"
* Upload the CSV, taking note of the filename
* You can review the table in CARTO for any obvious errors or discrepencies

## Local Testing
* Follow the instructions in [the README](../README.md) for installing the local development environment
* Open [seattle.json](../src/cities/seattle.json), look for the "years" block, and add or edit the table name for the year that you are updating. There is an example showing this at the bottom of this document. 
* Save [seattle.json](../src/cities/seattle.json) and reload the locally running copy of the application. 
* Test all relevant app features, including the map, building reports, building comparisons, building filters, etc. 

## Staging
* Follow the instructions in [the README](../README.md) for deploying the app to GH Pages. This provides another environment for testing the funcationality of the new/updated dataset  

At this point, if everything checks out, it is possible to rename the new table in CARTO, to overwrite the old table in CARTO, and no further action is necessary (it is wise to download a copy of the old table prior to renaming). The live application will now load the updated data.  

## Deployment
* Follow the instructions in [the README](../README.md) for building the application distribution. 
* Share a copy of the files in `/dist/`, with Seattle IT for deployment on Seattle infrastructure. 
* NOTE: If nothing else has changed, they should be able to simply update `seattle.json` that you edited in a previous step. 


## Old data update notes below (pre 2018)
Here is how the data was updated in November/December 2018 when 2017 data was added to the map:

1. **Before you upload the data to Carto**, make sure it is consistent with the data that is already in Carto:
    1. Delete `cartodb_id` column from update data if present.
    2. Delete all `NA` values in the update data if present.
    3. Otherwise, ensure each column that is present in the master dataset is in our new data and has the same name.
2. Upload update data to Carto as a new dataset. We'll use `seattle_buildings_2017_update`, but you should update the year accordingly.
3. In the uploaded dataset, make everything that should be numeric is numeric. Look at the master dataset and if any columns are text but should be numeric, update them::

 ```sql
 ALTER TABLE seattle_buildings_2017_update
   ALTER COLUMN energy_star_score TYPE integer,
   ALTER COLUMN site_eui TYPE float,
   ALTER COLUMN site_eui_wn TYPE float,
   ALTER COLUMN amount_save TYPE float
 ```

4. Create a copy of the master dataset that we will modify. We will call it `seattle_buildings_master_copy_for_update`.
5. Insert data to the copy of the master dataset:

 ```sql
 INSERT INTO seattle_buildings_master_copy_for_update (the_geom, the_geom_webmercator, higher_or_lower, cost_annual, amount_save, total_kbtu, other_pct, other_ghg, ess_cert, year, id, xepaid, zip, councildistrict, yearbuilt_string, yearbuilt, reported_gross_floor_area, numbuildings, numfloors, numunits, energy_star_score, other_ghg_percent, id1, property_type, property_name, reported_address, city, state, neighborhood, comments, percent_from_median, percent_save, cost_sq_ft, total_ghg_emissions_intensity, total_ghg_emissions, electricity_pct, gas_pct, steam_pct, building_type_eui_wn, latitude, longitude, cos_median_eui, building_type_eui, site_eui, site_eui_wn, source_eui, source_eui_wn, electricity, steam, gas, electricity_ghg, gas_ghg, steam_ghg, electricity_ghg_percent, gas_ghg_percent, steam_ghg_percent, pct_sum)
 SELECT the_geom, the_geom_webmercator, higher_or_lower, cost_annual, amount_save, total_kbtu, other_pct, other_ghg, ess_cert, year, id, xepaid, zip, councildistrict, yearbuilt_string, yearbuilt, reported_gross_floor_area, numbuildings, numfloors, numunits, energy_star_score, other_ghg_percent, id1, property_type, property_name, reported_address, city, state, neighborhood, comments, percent_from_median, percent_save, cost_sq_ft, total_ghg_emissions_intensity, total_ghg_emissions, electricity_pct, gas_pct, steam_pct, building_type_eui_wn, latitude, longitude, cos_median_eui, building_type_eui, site_eui, site_eui_wn, source_eui, source_eui_wn, electricity, steam, gas, electricity_ghg, gas_ghg, steam_ghg, electricity_ghg_percent, gas_ghg_percent, steam_ghg_percent, pct_sum
 FROM seattle_buildings_2017_update
 ```

 This inserts each row from the updated data into our copy of the master dataset.

6. (Optional) the 2017 data had new addresses and names for many properties. For consistency we copied these new values back to the old data. We did this with the following SQL:

 ```sql
 WITH new_data AS (
   SELECT id, property_name, property_type, reported_address, city
   FROM seattle_buildings_master_copy_for_update
   WHERE year = 2017
 )
 UPDATE seattle_buildings_master_copy_for_update b1
 SET property_name = new_data.property_name,
  property_type = new_data.property_type,
   reported_address = new_data.reported_address,
   city = new_data.city
 FROM new_data
 where b1.id=new_data.id and year != 2017
 ```

7. Rename our master dataset for copy to `seattle_buildings_master_20191015` where the date on the end matches the current date.
8. On your computer, in a local copy of this repository, edit the configuration file `src/cities/seattle.json`:
    1. Replace any instance of the old name for the master dataset with the new master dataset name (`seattle_buildings_master_20191015`).
    2. Find `years` and add a new entry under the most recent year. If this is currently

   ```json
   "years": {
        "2015": {
            "table_name": "seattle_buildings_master_20181218",
            "default_layer": "energy_star_score"
        },
        "2016": {
            "table_name": "seattle_buildings_master_20181218",
            "default_layer": "energy_star_score"
        },
        "2017": {
            "table_name": "seattle_buildings_master_20181218",
            "default_layer": "energy_star_score"
        }
    },
   ```

   update it to:
   
   ```json
   "years": {
        "2015": {
            "table_name": "seattle_buildings_master_20191015",
            "default_layer": "energy_star_score"
        },
        "2016": {
            "table_name": "seattle_buildings_master_20191015",
            "default_layer": "energy_star_score"
        },
        "2017": {
            "table_name": "seattle_buildings_master_20191015",
            "default_layer": "energy_star_score"
        },
        "2018": {
            "table_name": "seattle_buildings_master_20191015",
            "default_layer": "energy_star_score"
        }
    },
   ```

   That is, change the `table_name` entries and add the latest year.

    3. Under `eui` and each category of building, add a year entry for the latest year. For example, if you have:

   ```json
   "Distribution Center": {
     "2015": [18.8,27.2,40.7],
     "2016": [18.7,30.7,43.9],
     "2017": [18.7,30.7,43.9]
   },
   ```

   add a new entry:

   ```json
   "Distribution Center": {
     "2015": [18.8,27.2,40.7],
     "2016": [18.7,30.7,43.9],
     "2017": [18.7,30.7,43.9],
     "2018": [18.7,30.7,43.9]
   },
   ```

   You need one of these for each year, and you can update the breaks as needed.

9. Still on your computer, test the updated configuration file and master dataset. In a console, move to the directory that contains the project for the map code, including your updated configuration file. Run the following:

  ```bash
  python -m http.server
  ```

10. Open the local version of the site in a browser:

  ```
  http://localhost:8000
  ```

  and confirm that the site works as expected, including the data for the latest year.

11. Once you are satisfied with the updates to the data and the configuration file, put your changes to the configuration file (`src/cities/seattle.json`) in GitHub.
12. Deploy the new version of the site by either updating the configuration file on the server or zipping up the entire code bundle and deploying that.

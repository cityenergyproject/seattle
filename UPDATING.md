Uploading or updating data on CARTO
===

Preparing the data:

Ideally the number fields will not have any commas in them.
Also, adding N/A to numeric fields is unnecessary, it causes CARTO to detect columns as string instead of numeric.

Export the Excel sheet as a CSV file.

Use field delimieter `,` to make sure it's comma separated.
Use text delimiter `"` to make sure any commas _in_ field values won't be treated as column breaks.

Upload to CARTO using the "New Dataset" button

After the upload completes, view the table on CARTO. Note that CARTO might change the order of the columns, but this is okay, the order doesn't matter.

Now we need to make sure the column names and column types are correct. In particular, the column names on CARTO need to match the column names in the config file (in this case, `src/cities/seattle.json`).


**These should be "number" type:**

* numunits
* numfloors
* numbuildings
* yearbuilt
* energy_star_score
* reported_gross_floor_area
* site_eui
* source_eui
* total_ghg_emissions
* total_ghg_emissions_intensity
...

**These should be "string" type:**

* councildistrict
* zip
* id
...

**Field name conversions:**
(this depends on what your field names are in the original Excel file)
From: To:

* number_of_units numunits
* number_of_floors numfloors
* number_of_buildings numbuildings
* district councildistrict
* seattle_benchmarking_id id
* emissions_intensity total_ghg_emissions_intensity
* total_emissions total_ghg_emissions
* property_size reported_gross_floor_area
* yearbuilt_date yearbuilt
* building_name property_name
* address reported_address

**Changed data type:**

* councildistrict to string
* zip to string
* id to string
* total_ghg_emissions_intensity to number
* total_ghg_emissions to number
* source_eui to number
* site_eui to number  (if any of these had N/A in them it's better just to leave it blank in the Excel)
* energy_star_score to number
* reported_gross_floor_area to number
* yearbuilt to number


Finally, after uploading to CARTO and fixing the field names and types:

Rename the table in CARTO to `table_2015_stamen_phase_i_final` (remember to back up the previous table by renaming it first!).
Alternatively, you could change the name of the table in the config file to match the table name in CARTO.


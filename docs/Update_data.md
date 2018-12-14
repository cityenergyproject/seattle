# Update data

Here is how the data was updated in November/December 2018 when 2017 data was added to the map:

1. Delete `cartodb_id` column from update data if present.
2. Delete all `NA` values in the update data if present.
3. Upload update data to Carto as a new dataset.
4. Make everything that should be numeric numeric:

 ```sql
 ALTER TABLE seattle_buildings_2017_update
   ALTER COLUMN energy_star_score TYPE integer,
   ALTER COLUMN site_eui TYPE float,
   ALTER COLUMN site_eui_wn TYPE float,
   ALTER COLUMN amount_save TYPE float
 ```

5. Insert data

 ```sql
 INSERT INTO seattle_buildings_master_copy_for_update (the_geom, the_geom_webmercator, higher_or_lower, cost_annual, amount_save, total_kbtu, other_pct, other_ghg, ess_cert, year, id, xepaid, zip, councildistrict, yearbuilt_string, yearbuilt, reported_gross_floor_area, numbuildings, numfloors, numunits, energy_star_score, other_ghg_percent, id1, property_type, property_name, reported_address, city, state, neighborhood, comments, percent_from_median, percent_save, cost_sq_ft, total_ghg_emissions_intensity, total_ghg_emissions, electricity_pct, gas_pct, steam_pct, building_type_eui_wn, latitude, longitude, cos_median_eui, building_type_eui, site_eui, site_eui_wn, source_eui, source_eui_wn, electricity, steam, gas, electricity_ghg, gas_ghg, steam_ghg, electricity_ghg_percent, gas_ghg_percent, steam_ghg_percent, pct_sum)
 SELECT the_geom, the_geom_webmercator, higher_or_lower, cost_annual, amount_save, total_kbtu, other_pct, other_ghg, ess_cert, year, id, xepaid, zip, councildistrict, yearbuilt_string, yearbuilt, reported_gross_floor_area, numbuildings, numfloors, numunits, energy_star_score, other_ghg_percent, id1, property_type, property_name, reported_address, city, state, neighborhood, comments, percent_from_median, percent_save, cost_sq_ft, total_ghg_emissions_intensity, total_ghg_emissions, electricity_pct, gas_pct, steam_pct, building_type_eui_wn, latitude, longitude, cos_median_eui, building_type_eui, site_eui, site_eui_wn, source_eui, source_eui_wn, electricity, steam, gas, electricity_ghg, gas_ghg, steam_ghg, electricity_ghg_percent, gas_ghg_percent, steam_ghg_percent, pct_sum
 FROM seattle_buildings_2017_update
 ```

6. Fix property names and addresses from previous year

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

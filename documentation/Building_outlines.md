# Building Outlines

Building outlines (or footprints) are displayed on the map at higher zoom levels. Ideally, there is one building outline for each building location, and the aim is to have every location and outline accurately reflect the current building location and footprint. Note: Unlike building energy data, building outline data is only provided for the current year, we do not have or maintain historic building outlines. 

## Latest process for updating building outlines (2023)

The latest process to update the building outlines / footprints involves multiple steps, as detailed below.  In the final step, a script is run to update all the building outlines necessary.  As long as the proper format is followed, the script is able to target and update different buildings, and can be used for future updates.  Please follow the process below:   

### Step 1: Review Buildings
First, determine all the buildings/records that need their footprint updated.  This step requires manual review of the buildings data to determine which records need to have their attributes and/or geometry updated.  After the review, separate updates into Attribute Updates and Geometry/Outline Updates, noting the unique building id associated with each record that needs updates.  One example of how the buildings were reviewed and the notes that were taken is [here](https://docs.google.com/spreadsheets/d/1Uu3OiZqaJau9jNAGF7zjal-XunqhKVkR/edit#gid=500738303).  An example of the final table produced with all buildings that need updates, separated into several categories, is [here](https://docs.google.com/spreadsheets/d/1S3ftokz4nCtDrrEmpBPLNyr5fnd0YlbnjasbCqZTiHI/edit#gid=0).

### Step 2: Attribute Updates
The Master Data Updates table shows that the updates are separated into different cases. In some cases there is a need to correct the address and correct the latitude and longitude coordinates. For each of those two scenarios, a list of building ids and correction values is provided. 

### Step 3: Geometry Updates
These updates require a correction to the building outline and fall into three categories:
- Complete redo: A building footprint is entirely wrong (e.g. building was rebuilt) and the footprint needs to be redrawn.
- Additions: Multiple buildings comprise the record, however, some are missing and need to be added (often the case for apartment condominiums)
- Deletions: Sometimes footprints accidentally include buildings or structures that should not be part of the record and need to be removed.

Much of the data necessary to correct the building outlines for 2023 is obtained from the 2015 Seattle Open Data Building Outlines shapefile provided by OSE Seattle. However, in about 20 cases, manual digitization was required since the 2015 Open Data shapefile did not have the necessary outlines.  

Again, as for the attribute updates, the geometry updates are summarized into [separate lists](https://docs.google.com/spreadsheets/d/1S3ftokz4nCtDrrEmpBPLNyr5fnd0YlbnjasbCqZTiHI/edit#gid=0) depending on the specific type of geometry edit required.  The lists contain the building id that needs its footprint corrected, along with the ID of the associated correct building outline from the 2015 Seattle Open Data Building Outlines shapefile, or the manually digitized outlines shapefile.  

### Step 4: Run Update_Building_Outlines.py
The geometry lists mentioned above are used as input for the `Update_Building_Outlines.py` script which automates the entire building outlines update process.  Please refer to the documentation in the scripts folder for further detail.


## Original building outline process notes (pre 2018)

Original building outlines were created using the following process:

 1. The city's [2009 building outlines](https://data.seattle.gov/dataset/2009-Building-Outlines/y7u8-vad7) were combined with the data using the parcel ids. Around 80% of the building outlines were found this way.
 1. [Mapzen](https://mapzen.com/)'s (RIP) Metro Extracts were used along with a spatial join with the buildings' latitudes and longitudes to get many more building outlines, leaving around 500 buildings without outlines.

Going forward, would consider doing a nearest neighbor search of the outline data from OSM with the buildings that are missing outlines. Geocoding the building data might also get more consistent matches with outlines using centroids.

### Updating outlines

Find the buildings missing outlines:

```sql
SELECT b.*
FROM seattle_buildings_master b
LEFT OUTER JOIN seattle_building_outlines_20181126 o ON b.id = o.buildingid
WHERE o.buildingid IS NULL
```

We can use a CTE for our convenience

```sql
WITH
  outlineless_buildings AS (
  	SELECT b.*
    FROM seattle_buildings_master b
    LEFT OUTER JOIN seattle_building_outlines_20181126 o ON o.buildingid = b.id
    WHERE o.buildingid IS NULL
  )
SELECT *
FROM outlineless_buildings
```

Update outlines with the nearest outline for every building that doesn't have an outline:

```sql
WITH
  outlineless_buildings AS (
  	SELECT b.*
    FROM seattle_buildings_master b
    LEFT OUTER JOIN seattle_building_outlines_20181126 o ON o.buildingid = b.id
    WHERE o.buildingid IS NULL
  ),
  matched_buildings AS (
    SELECT DISTINCT ON (b.id) b.id, o.cartodb_id
    FROM seattle_building_outlines_20181126 o, outlineless_buildings b
    WHERE ST_DWithin(o.the_geom_webmercator, b.the_geom_webmercator, 25) AND o.buildingid IS NULL
    ORDER BY b.id, ST_Distance(o.the_geom, b.the_geom)
  )
UPDATE seattle_building_outlines_20181126
SET buildingid = m.id
FROM matched_buildings m
WHERE seattle_building_outlines_20181126.cartodb_id = m.cartodb_id
```

Buildings that still don't have outlines fall into three types:

 1. Building point is in the wrong place and is too far from an outline to be found. For example, `id=388` (Rainier Tower) seems to clearly be in the wrong place.
 2. Building point is in or near an outline already in use. For example, `id=352` (Abraham Lincoln Building) overtaken by `id=295` but they seem to be in the same building.
 3. Building point is accurate but building outline doesn't exist.

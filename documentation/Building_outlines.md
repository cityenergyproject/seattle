# Building Outlines

Building outlines (or footprints) are displayed on the map at higher zoom levels. Ideally, there is one building outline for each building location, and the aim is to have every location and outline accurately reflect the current building location and footprint. Note: Unlike building energy data, building outline data is only provided for the current year, we do not have or maintain historic building outlines. 

## Latest process for updating building outlines (2023)



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

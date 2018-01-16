## City Energy Seattle Citywide scorecard data
Citywide scorecard data for the Seattle city energy app is pulled from a dataset in the [cityenergy-seattle carto account](https://cityenergy-seattle.carto.com/dashboard/datasets).  The `carto` dataset name must be set in the [configuration (seattle.json)](../src/cities/seattle.json) file.

### Configure citywide dataset name
Locate the "scorecard" block in the `seattle.json` file mentioned above.  Within this block, find the `citywide` sub-block.  Set the `table` field with name of the dataset containing citywide data in Carto.

### Citywide data
All data will be pulled from the Carto dataset that is set for the `citywide.table` field in the configuration file.  New data will be automatically picked up the next time the web app is reloaded.

It's **important to remember** that any changes made to the `seattle.json` file will need to be "re-deployed" to be active in the production version.  See the documentation in the main [README](../README.md) file for how to deploy to production.

## City Energy Seattle Links
Seattle city energy app allows for links to be shown in the building scorecard view. The configuration for these are located in the [seattle.json](../src/cities/seattle.json) file. The data for the links are located in the [cityenergy-seattle carto account](https://cityenergy-seattle.carto.com/dashboard/datasets).

### Configure Links
Locate the "scorecard" block in the `seattle.json` file mentioned above.  Set the `links_table` field with name of the dataset containing link data in Carto.

### Links data
All data will be pulled from the Carto dataset that is set for the `links_table` field in the configuration file.  New data will be automatically picked up the next time the web app is reloaded.

It's **important to remember** that any changes made to the `seattle.json` file will need to be "re-deployed" to be active in the production version.  See the documentation in the main [README](../README.md) file for how to deploy to production.

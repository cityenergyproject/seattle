## City Energy Seattle Links
Seattle city energy app allows for links to be shown at the bottom of the building scorecard view. The configuration for these are located in the [seattle.json](../src/cities/seattle.json) file. The data for the links are located in the [links.csv](../src/data/links) file.

### Configure Links data file location
Locate the "scorecard" block in the `seattle.json` file mentioned above.  Set the `links_table` field with name of the file containing link data. Generally, there should be no reason to change the file name.

### Links data
Each building type can support from one to three links. Each link can be formatted with a header, additional text, link text, and the link href or URL.

After cloning the repository, edit the CSV, then save and commit back to the repository. 

It's **important to remember** that any changes made to the `seattle.json` or the `links.csv` file will need to be "re-deployed" to be active in the production version.  See the documentation in the main [README](../README.md) file for how to deploy to production.

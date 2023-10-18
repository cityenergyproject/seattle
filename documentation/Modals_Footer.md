## City Energy Seattle Modal & Footer documentation
Seattle city energy app contains modals and a custom footer module. The configuration for these are located in the [seattle.json](../src/cities/seattle.json) file.  The data for the modals are located in the [cityenergy-seattle carto account](https://cityenergy-seattle.carto.com/dashboard/datasets).

### Configure Modals
Locate the "modals" block in the `seattle.json` file mentioned above.  Each modal is linked to a particular dataset located in `Carto`.  The datasets have already been configured to work with each module so do not change the column names. The fields of a modal configuration block are as follows:
* **title:** Title of the modal
* **desc:** Short description of the modal which will appear under title
* **file:** Name of the CSV file in `../src/data/` that contains the modal data.  **very important**
* **label:** Name used for the button
* **reflinks** Lets the modal know if there is an "reflinks" column.  Only used for the glossary modal.

### Adding data to the modals
Go to the CSV file located in [data](../src/data/). Once the appropriate dataset is open in a text editor or spreadsheet, add a row and fill in the values. The new data will be automatically picked up the next time the web app is reloaded.

### Currently supported modals
Currently, the app supports the following modals:
[FAQ](../src/data/faq.csv): Edit this file to add or change the FAQs
[Glossary](../src/data/glossary.csv): Edit this file to add or change the Glossary

### Configure footer links
Locate the "footer" block in the `seattle.json` file mentioned at the top. There are two fields in this block:
* **about_link:** Link for "About the program"
* **download_link:** Link for "Download data"

It's **important to remember** that any changes made to the `seattle.json` file will need to be "re-deployed" to be active in the production version.  See the documentation in the main [README](../README.md) file for how to deploy to production.

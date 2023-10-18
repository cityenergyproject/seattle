# City Energy Project Building Map System

This repository contains the code for a highly configurable system to map buildings according to various kinds of energy efficiency data, to make critical data about urban sustainability and conservation visible and accessible to a wide array of potential audiences.

The site was commissioned by the [City Energy Project](http://www.cityenergyproject.org), a joint effort of the Natural Resources Defense Council (NRDC) and the Institute for Market Transformation (IMT). The City Energy Project is a national initiative to create healthier and more prosperous American cities by improving the energy efficiency of buildings. Working in partnership, the Project and cities will support innovative, practical solutions that cut energy waste, boost local economies, and reduce harmful pollution.

In close collaboration with partners at the City Energy Project, [Stamen Design](http://stamen.com) and [Ministry of Velocity](http://www.ministryofvelocity.com) designed and built the system in summer 2015. Stamen is a leading innovator in data visualization, with a long history of direct collaborations with industry leaders, universities, museums, and humanitarian organizations. Ministry of Velocity is an agile software engineering consultancy with decades of combined experience in building immersive experiences alongside startups, nonprofit organizations, and design agencies.

In 2021, [GreenInfo Network](https://www.greeninfo.org) was brought on to help manage the project and data updates

## Dependencies

### Software
This project uses gulp for build scripts.
Other dependencies are contained in `package.json` and `bower.json`.

City data is hosted on CartoDB. Each city data table is specified in its respective JSON file contained in src/cities.

#### Development

  Start webserver
  ```
    $ npm run dev
  ```

  Sometimes a `gulp` process gets stuck, so you may need to run `killall gulp` every once in awhile.

### Static Assets

Source files are in `src/`. The compiled files are in `dist/`.

```bash
npm run dist
```

to compile, and copy all site files to the `dist/` folder

## How do I install it?

  * clone the repo
  * make sure you have [node](https://nodejs.org/) and [bower](http://bower.io/) installed
  * Do `nvm use` to set node version 
  * in the root of the repo, run ```npm install```
  * in the root of the repo, run ```bower install```
  * in a separate terminal window run ```npm run dev```
  * point your browser to http://localhost:8080/

## How do I deploy it to the world?

You can fork a copy of the repository, and the `dist` directory will turn into your own version of the site via [Github Pages](https://pages.github.com).  Alternatively, you can host your own copy of the `dist` directory on your own web server.

Doing `npm run deploy` will compile the `dist` artifacts and push them to the `gh-pages` branch of the repo, to update the site if you are serving that way.

For setup and configuration instructions, see the [Setup and Configuration guide](https://github.com/cityenergyproject/cityenergy/wiki/Setup-and-Configuration).

## Modals & footers
Please see the [Modals_Footer.md](./docs/Modals_Footer.md) file.

## Links
Please see the [Links.md](./docs/Links.md) file.

## PDF generator

There are some tools to help you create PDF scorecards for buildings. These can run on both a local machine or through a server. Note: This feature is unused and have been moved into [deprecated/](./deprecated) Read more in [the README](deprecated/pdf-generator/README.md).

## Multi-building campuses
The system can manage and display data for multi-building "campuses", provided that the building footprints share a building id. In general there are two kinds of campus data
1. A campus made up of buildings that each report their own benchmarking data. Each of these buildings should have a separate row in the building energy dataset, and a separate outline in the building outline dataset. 
2. A campus made up of buildings that together report benchmarking data. For this type of campus, there should be only one row of data in the benchmarking energy dataset, and multiple rows in the building outline dataset. Each of the building outlines should have the same parent `buildingid`.

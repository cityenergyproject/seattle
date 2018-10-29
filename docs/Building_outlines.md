# Building outlines

Building outlines were created using the following process:

 1. The city's [2009 building outlines](https://data.seattle.gov/dataset/2009-Building-Outlines/y7u8-vad7) were combined with the data using the parcel ids. Around 80% of the building outlines were found this way.
 1. [Mapzen](https://mapzen.com/)'s (RIP) Metro Extracts were used along with a spatial join with the buildings' latitudes and longitudes to get many more building outlines, leaving around 500 buildings without outlines.

Going forward, would consider doing a nearest neighbor search of the outline data from OSM with the buildings that are missing outlines. Geocoding the building data might also get more consistent matches with outlines using centroids.

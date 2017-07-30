define([
  'underscore',
  'd3'
], function(_, d3) {
  const BuildingBucketCalculator = function(buildings, fieldName, buckets, filterRange, thresholds) {
    this.buildings = buildings;
    this.fieldName = fieldName;
    this.buckets = buckets;
    this.thresholds = thresholds;
    this.filterRange = filterRange || {};
  };

  BuildingBucketCalculator.prototype.getScale = function() {
    const extent = this.toExtent();
    const maxBuckets = this.buckets - 1;

    let scale = d3.scale.linear()
                  .domain(extent)
                  .rangeRound([0, maxBuckets]);

    // stuff maxBuckets into scale, for future reference
    scale._maxBuckets = maxBuckets;

    return scale;
  };

  BuildingBucketCalculator.prototype.toExtent = function() {
    const fieldValues = this.buildings.pluck(this.fieldName);
    const extent = d3.extent(fieldValues);
    let min = this.filterRange.min;
    let max = this.filterRange.max;

    if (_.isNaN(min)) min = extent[0];
    if (_.isNaN(max)) max = extent[1];

    return [min, max];
  };

  // Allow for extent & scale to be passed in,
  // speeds up the "toBuckets" function
  BuildingBucketCalculator.prototype.toBucket = function(value, extent, scale) {
    extent = extent || this.toExtent();
    scale = scale || this.getScale();

    return _.min([_.max([scale(value), 0]), scale._maxBuckets]);
  };

  BuildingBucketCalculator.prototype.toBuckets = function() {
    const scale = this.getScale();
    const extent = scale.domain();


    if (this.thresholds) {
      const thresholdsLength = this.thresholds.length;

      return this.buildings.reduce((acc, building) => {
        const value = building.get(this.fieldName);

        if (!value) { return acc; }

        let bucket = _.findIndex(this.thresholds, d => value < d);

        if (bucket === -1) bucket = thresholdsLength;

        acc[bucket] = acc[bucket] + 1 || 1;
        return acc;
      }, {});
    }


    return this.buildings.reduce((acc, building) => {
      const value = building.get(this.fieldName);

      if (!value) { return acc; }

      let bucket = this.toBucket(value, extent, scale);
      acc[bucket] = acc[bucket] + 1 || 1;

      return acc;
    }, {});
  };

  return BuildingBucketCalculator;
});

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

    this._extent = null;
    this._tobuckets = null;
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
    if (this._extent) return this._extent;
    const fieldValues = this.buildings.pluck(this.fieldName);
    const extent = d3.extent(fieldValues);

    let min = this.filterRange.min;
    let max = this.filterRange.max;

    if (!_.isNumber(min) || _.isNaN(min)) min = extent[0];
    if (!_.isNumber(max) || _.isNaN(max)) max = extent[1];

    this._extent = [min, max];

    return this._extent;
  };

  // Allow for extent & scale to be passed in,
  // speeds up the "toBuckets" function
  BuildingBucketCalculator.prototype.toBucket = function(value, extent, scale) {
    extent = extent || this.toExtent();
    scale = scale || this.getScale();

    return _.min([_.max([scale(value), 0]), scale._maxBuckets]);
  };

  BuildingBucketCalculator.prototype.toBuckets = function() {
    if (this._tobuckets) return this._tobuckets;

    const scale = this.getScale();
    const extent = scale.domain();
    const range = scale.range();

    let buckets;

    let init = {};
    d3.range(range[0], range[1]+1).forEach(x => {
      return init[x] = 0;
    });

    if (this.thresholds) {
      const thresholdsLength = this.thresholds.length;

      buckets = this.buildings.reduce((acc, building) => {
        const value = building.get(this.fieldName);

        if (!value) { return acc; }

        let bucket = _.findIndex(this.thresholds, d => value < d);

        if (bucket === -1) bucket = thresholdsLength;

        acc[bucket] = acc[bucket] + 1 || 1;
        return acc;
      }, init);
    } else {
      buckets = this.buildings.reduce((acc, building) => {
        const value = building.get(this.fieldName);

        if (!_.isNumber(value)) { return acc; }

        let bucket = this.toBucket(value, extent, scale);
        acc[bucket] = acc[bucket] + 1 || 1;

        return acc;
      }, init);
    }

    this._tobuckets = buckets;

    return this._tobuckets;
  };

  return BuildingBucketCalculator;
});

'use strict';

define(['underscore', 'd3'], function (_, d3) {
  var BuildingBucketCalculator = function BuildingBucketCalculator(buildings, fieldName, buckets, filterRange, thresholds) {
    this.buildings = buildings;
    this.fieldName = fieldName;
    this.buckets = buckets;
    this.thresholds = thresholds;
    this.filterRange = filterRange || {};
  };

  BuildingBucketCalculator.prototype.getScale = function () {
    var extent = this.toExtent();
    var maxBuckets = this.buckets - 1;

    var scale = d3.scale.linear().domain(extent).rangeRound([0, maxBuckets]);

    // stuff maxBuckets into scale, for future reference
    scale._maxBuckets = maxBuckets;

    return scale;
  };

  BuildingBucketCalculator.prototype.toExtent = function () {
    var fieldValues = this.buildings.pluck(this.fieldName);
    var extent = d3.extent(fieldValues);
    var min = this.filterRange.min;
    var max = this.filterRange.max;

    if (_.isNaN(min)) min = extent[0];
    if (_.isNaN(max)) max = extent[1];

    return [min, max];
  };

  // Allow for extent & scale to be passed in,
  // speeds up the "toBuckets" function
  BuildingBucketCalculator.prototype.toBucket = function (value, extent, scale) {
    extent = extent || this.toExtent();
    scale = scale || this.getScale();

    return _.min([_.max([scale(value), 0]), scale._maxBuckets]);
  };

  BuildingBucketCalculator.prototype.toBuckets = function () {
    var _this = this;

    var scale = this.getScale();
    var extent = scale.domain();

    if (this.thresholds) {
      var thresholdsLength = this.thresholds.length;

      return this.buildings.reduce(function (acc, building) {
        var value = building.get(_this.fieldName);

        if (!value) {
          return acc;
        }

        var bucket = _.findIndex(_this.thresholds, function (d) {
          return value < d;
        });

        if (bucket === -1) bucket = thresholdsLength;

        acc[bucket] = acc[bucket] + 1 || 1;
        return acc;
      }, {});
    }

    return this.buildings.reduce(function (acc, building) {
      var value = building.get(_this.fieldName);

      if (!value) {
        return acc;
      }

      var bucket = _this.toBucket(value, extent, scale);
      acc[bucket] = acc[bucket] + 1 || 1;

      return acc;
    }, {});
  };

  return BuildingBucketCalculator;
});
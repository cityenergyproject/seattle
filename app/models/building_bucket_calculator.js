'use strict';

define(['underscore', 'd3'], function (_, d3) {
  var BuildingBucketCalculator = function BuildingBucketCalculator(buildings, fieldName, buckets, filterRange, thresholds) {
    this.buildings = buildings;
    this.fieldName = fieldName;
    this.buckets = buckets;
    this.thresholds = thresholds;
    this.filterRange = filterRange || {};

    this._extent = null;
    this._tobuckets = null;
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
    if (this._extent) return this._extent;
    var fieldValues = this.buildings.pluck(this.fieldName);
    var extent = d3.extent(fieldValues);

    var min = this.filterRange.min;
    var max = this.filterRange.max;

    if (!_.isNumber(min) || _.isNaN(min)) min = extent[0];
    if (!_.isNumber(max) || _.isNaN(max)) max = extent[1];

    this._extent = [min, max];

    return this._extent;
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

    if (this._tobuckets) return this._tobuckets;

    var scale = this.getScale();
    var extent = scale.domain();

    var buckets = void 0;

    if (this.thresholds) {
      var thresholdsLength = this.thresholds.length;

      buckets = this.buildings.reduce(function (acc, building) {
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
    } else {
      buckets = this.buildings.reduce(function (acc, building) {
        var value = building.get(_this.fieldName);

        if (!value) {
          return acc;
        }

        var bucket = _this.toBucket(value, extent, scale);
        acc[bucket] = acc[bucket] + 1 || 1;

        return acc;
      }, {});
    }

    this._tobuckets = buckets;

    return this._tobuckets;
  };

  return BuildingBucketCalculator;
});
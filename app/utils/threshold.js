'use strict';

define(['underscore', 'd3'], function (_, d3) {

  var getThresholds = function getThresholds(thresholds, proptype, yr) {
    if (!thresholds[proptype]) return {
      error: 'No threshold for property type'
    };

    if (!thresholds[proptype][yr]) return {
      error: 'No thresholds for year'
    };

    return {
      data: thresholds[proptype][yr]
    };
  };

  //
  var makeLabels = function makeLabels(thresholds) {
    return _.reduce(thresholds, function (acc, item, idx) {
      if (thresholds[idx + 1]) {
        var max = thresholds[idx + 1] - 0.1;
        acc.push(item + '-' + max.toFixed(1));
      } else {
        acc.push('\u2265' + item);
      }

      return acc;
    }, ['<' + thresholds[0]]);
  };

  //
  var thresholdIndexScale = function thresholdIndexScale(thresholds) {
    return d3.scale.threshold().domain(thresholds).range(d3.range(0, thresholds.length + 1));
  };

  return {
    getThresholds: getThresholds,
    makeLabels: makeLabels,
    thresholdIndexScale: thresholdIndexScale
  };
});
define([
  'underscore',
  'd3'
], function(_, d3) {
  var BuildingColorBucketCalculator = function(buildings, fieldName, buckets, colorStops) {
    this.buildings = buildings;
    this.fieldName = fieldName;
    this.buckets = buckets;
    this.colorStops = colorStops;


    this.memoized = {};
    this.memoized.fieldValues = {};
    this.memoized.colorGradients = {};
    this.memoized.cartoCSS = {};
    this.memoized.histogram = {};
    this.memoized.bucketStops = this.calcBucketStops();
    this.memoized.gradientStops = this.calcGradientStops();
  };



  BuildingColorBucketCalculator.prototype.calcBucketStops = function() {
    var range = this.colorStops,
        buckets = this.buckets,
        rangeCount = _.max([range.length - 1, 1]),
        domain = _.range(0, buckets, buckets / rangeCount).concat(buckets);

    return _.map(domain, function(bucket) { return _.max([0, bucket - 1]); });
  };


  BuildingColorBucketCalculator.prototype.calcGradientStops = function() {
    var range = this.colorStops,
        buckets = this.buckets,
        bucketStops = this.toBucketStops(),
        gradientScale = d3.scale.linear().range(range).domain(bucketStops);

    return _.map(_.range(buckets), gradientScale);
  };

  BuildingColorBucketCalculator.prototype.cartoCSS = function() {
    if (this.memoized.cartoCSS.hasOwnProperty(this.fieldName)) {
      return this.memoized.cartoCSS[this.fieldName];
    }

    var stops = this.toGradientStops(),
        fieldName = this.fieldName,
        fieldValues = this.getFieldValues(),
        gradient = this.colorGradient();
    /*
    console.log('FieldName: ', fieldName);
    console.log("CartoCSS stops", stops);
    console.log("CartoCSS stops", _.map(stops, function(stop) { return gradient.invertExtent(stop);}));
    */

    var css = this.memoized.cartoCSS[this.fieldName] = _.map(stops, function(stop){
      var min = _.min(gradient.invertExtent(stop));
      return "[" + fieldName + ">=" + min + "]{marker-fill:" + stop + "}";
    });

    return css;
  }

  BuildingColorBucketCalculator.prototype.getFieldValues = function() {
    if (this.memoized.fieldValues.hasOwnProperty(this.fieldName)) {
      return this.memoized.fieldValues[this.fieldName];
    }

    var fieldValues = this.memoized.fieldValues[this.fieldName] = this.buildings.pluck(this.fieldName);

    return fieldValues;
  };

  BuildingColorBucketCalculator.prototype.colorGradient = function() {
    if (this.memoized.colorGradients.hasOwnProperty(this.fieldName)) {
      return this.memoized.colorGradients[this.fieldName];
    }

    // This is how we calculate the colors for the dots on the map.
    // But they don't line up with the colors in the histogram. Why not?

    // The domain is "fieldValues", which is an unordered list of all of the building value for this field.
    // But the domain for the histogram color ramp is just linear max and min for the given field.
    // And more importantly, it needs to be the max and min that's set according to the config file. That's how the colors get determined in the histogram,
    var stops = this.toGradientStops();
    var fieldValues = this.getFieldValues();

    //var scale = this.memoized.colorGradients[this.fieldName] = d3.scale.linear().domain(fieldValues).range(stops);
    var scale = this.memoized.colorGradients[this.fieldName] = d3.scale.quantile().domain(fieldValues).range(stops);

    return scale;
  }

  // Calculated in constructor
  BuildingColorBucketCalculator.prototype.toBucketStops = function() {
    return this.memoized.bucketStops;
  }

  // Calculated in constructor
  BuildingColorBucketCalculator.prototype.toGradientStops = function() {
    return this.memoized.gradientStops;
  }

  BuildingColorBucketCalculator.prototype.toCartoCSS = function() {
    return this.cartoCSS();
  };

  BuildingColorBucketCalculator.prototype.toColor = function(value) {
    var gradient = this.colorGradient();

    return gradient(value);
  };

  return BuildingColorBucketCalculator;
});

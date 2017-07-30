'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

define(['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {

  var HistogramView = Backbone.View.extend({
    className: 'histogram',

    initialize: function initialize(options) {

      this.aspectRatio = options.aspectRatio || 7 / 1;
      this.height = 100;
      this.width = this.height * this.aspectRatio;

      this.selected_value = options.selected_value || null;
      this.gradients = options.gradients;
      this.colorScale = options.colorScale;
      this.filterRange = options.filterRange;
      this.fieldName = options.fieldName;
      this.slices = options.slices; // Not sure why we have slices, when that value can be extrapulated from this.gradients

      this.chart = d3.select(this.el).append('svg').style({ width: '100%', height: '100%' }).attr('viewBox', '0 0 ' + this.width + ' ' + this.height).attr('preserveAspectRatio', "xMinYMin meet").style('background', 'transparent');

      this.g = this.chart.append('g');
    },

    update: function update(options) {
      var _this = this;

      Object.keys(options).forEach(function (k) {
        if (_this.hasOwnProperty(k)) {
          _this[k] = options[k];
        }
      });
    },

    findQuantileIndexForValue: function findQuantileIndexForValue(val, quantiles) {
      if (!quantiles) {
        quantiles = this.colorScale.quantiles ? [].concat(_toConsumableArray(this.colorScale.quantiles())) : [].concat(_toConsumableArray(this.colorScale.domain()));
      }

      var len = quantiles.length - 1;

      return _.reduce(quantiles, function (prev, curr, i) {
        // bail if we found an index
        if (prev > -1) return prev;

        // special case first index
        if (i === 0 && val < quantiles[0]) return i;

        // check if val is within range
        if (val >= quantiles[i - 1] && val < quantiles[i]) return i;

        // if no match yet, return index for the last bar
        if (i === len) return i + 1;

        // return current index
        return prev;
      }, -1);
    },

    updateHighlight: function updateHighlight(val) {
      if (!this.chart || this.selected_value === val) return;
      this.selected_value = val;
      this.chart.selectAll('rect').call(this.highlightBar, this);
    },

    highlightBar: function highlightBar(bars, context) {
      var ctxValue = context.selected_value;

      var quantiles = context.colorScale.quantiles ? [].concat(_toConsumableArray(context.colorScale.quantiles())) : [].concat(_toConsumableArray(context.colorScale.domain()));

      var highlightIndex = ctxValue !== null ? context.findQuantileIndexForValue(ctxValue, quantiles) : null;

      bars.classed('highlight', function (d, i) {
        return i === highlightIndex;
      });
    },

    render: function render() {
      var colorScale = this.colorScale;
      var isThreshold = colorScale.quantiles ? false : true;

      var gradients = this.gradients;
      var counts = _.pluck(gradients, 'count');
      var height = this.height;

      var yScale = d3.scale.linear().domain([0, d3.max(counts)]).range([0, this.height]);

      var xScale = d3.scale.ordinal().domain(d3.range(0, this.slices)).rangeBands([0, this.width], 0.2, 0);

      // threshold types use rounded bands for convienence
      if (isThreshold) {
        xScale.rangeRoundBands([0, this.width], 0.1, 0);
      }

      var bardata = xScale.domain().map(function (d, i) {
        return _extends({}, gradients[i], {
          idx: i,
          data: d,
          xpos: xScale(d)
        });
      });

      var filterValueForXpos = d3.scale.linear().range(this.filterRange).domain([0, this.width]);

      // make scale available to caller
      this.xScale = xScale;

      // draw
      var bars = this.g.selectAll('rect').data(bardata, function (d) {
        return d.color;
      });

      bars.enter().append('rect');

      bars.style('fill', function (d, i) {
        // not on a continous scale
        // so just need the color from data
        if (isThreshold) return d.color;

        // mapping the color continously
        // so need to calculate the color for
        // this xpos
        return colorScale(filterValueForXpos(d.xpos));
      }).attr({
        width: function width() {
          return xScale.rangeBand();
        },
        'stroke-width': 0,
        height: function height(d) {
          return yScale(d.count);
        },
        x: function x(d, i) {
          return xScale(d.data);
        },
        y: function y(d) {
          return height - yScale(d.count);
        }
      });

      bars.exit().remove();

      bars.call(this.highlightBar, this);

      this.g.selectAll('rect').filter(function (bucket, index) {
        return bucket.current === index;
      }).classed('current', true);

      return this.el;
    }
  });

  return HistogramView;
});
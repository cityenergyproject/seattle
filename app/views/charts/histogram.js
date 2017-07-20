'use strict';

define(['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {

  var HistogramView = Backbone.View.extend({
    className: "histogram",

    initialize: function initialize(options) {
      this.aspectRatio = options.aspectRatio || 7 / 1;
      this.height = 100;
      this.selected_value = options.selected_value || null;
      this.width = this.height * this.aspectRatio;
      this.gradients = options.gradients;
      this.qScale = options.quantileScale;
      this.filterRange = options.filterRange;
      this.slices = options.slices; // Not sure why we have slices, when that value can be extrapulated from this.gradients
      this.chart = d3.select(this.el).append('svg').style({ width: '100%', height: '100%' }).attr('viewBox', '0 0 ' + this.width + ' ' + this.height).attr('preserveAspectRatio', "xMinYMin meet").style('background', 'transparent').append('g');
    },

    findQuantileIndexForValue: function findQuantileIndexForValue(val, quantiles) {
      quantiles = quantiles || this.qScale.quantiles();
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

      this.chart.selectAll("rect").call(this.highlightBar, this);
    },

    highlightBar: function highlightBar(bars, context) {
      var highlightIndex = context.selected_value !== null ? context.findQuantileIndexForValue(context.selected_value, context.qScale.quantiles()) : null;

      bars.classed('highlight', function (d, i) {
        return i === highlightIndex;
      });
    },

    render: function render() {
      var qScale = this.qScale;
      var quantiles = qScale.quantiles();
      var gradients = this.gradients,
          counts = _.pluck(gradients, 'count'),
          height = this.height,
          yScale = d3.scale.linear().domain([0, d3.max(counts)]).range([0, this.height]);

      var xScale = d3.scale.ordinal().domain(d3.range(0, this.slices)).rangeBands([0, this.width]);

      var colorizer = d3.scale.linear().range(this.filterRange).domain([0, this.width]);

      var bars = this.chart.selectAll("rect").data(gradients);

      bars.enter().append('rect').style({ fill: function fill(d, i) {
          var val = xScale(i);
          return qScale(colorizer(val));
        } }).attr({
        width: function width() {
          return xScale.rangeBand() - xScale.rangeBand() / 3;
        },
        'stroke-width': function strokeWidth() {
          return xScale.rangeBand() / 6;
        },
        height: function height(data) {
          return yScale(data.count);
        },
        x: function x(data, i) {
          return xScale(i);
        },
        y: function y(data) {
          return height - yScale(data.count);
        }
      });

      bars.exit().remove();

      bars.call(this.highlightBar, this);

      this.chart.selectAll('rect').filter(function (bucket, index) {
        return bucket.current === index;
      }).classed("current", true);

      return this.el;
    }
  });

  return HistogramView;
});
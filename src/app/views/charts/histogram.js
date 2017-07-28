define([
  'jquery',
  'underscore',
  'backbone',
], function($, _, Backbone){

  var HistogramView = Backbone.View.extend({
    className: "histogram",

    initialize: function(options){
      this.aspectRatio = options.aspectRatio || 7/1;
      this.height = 100;
      this.selected_value = options.selected_value || null;
      this.width = this.height * this.aspectRatio;
      this.gradients = options.gradients;
      this.quantileScale = options.quantileScale;
      this.filterRange = options.filterRange;
      this.fieldName = options.fieldName;
      this.slices = options.slices; // Not sure why we have slices, when that value can be extrapulated from this.gradients
      this.chart = d3.select(this.el).append('svg')
                      .style({width: '100%', height: '100%'})
                      .attr('viewBox', '0 0 ' + this.width + ' ' + this.height)
                      .attr('preserveAspectRatio', "xMinYMin meet")
                      .style('background', 'transparent')
                      .append('g');
    },

    update: function(options) {
      Object.keys(options).forEach(k => {
        if (this.hasOwnProperty(k)) {
          this[k] = options[k];
        }
      });
    },

    findQuantileIndexForValue: function(val, quantiles) {
      quantiles = quantiles || this.quantileScale.quantiles();
      const len = quantiles.length - 1;

      return _.reduce(quantiles, function(prev, curr, i){
        // bail if we found an index
        if (prev > -1) return prev;

        // special case first index
        if (i === 0 && val < quantiles[0]) return i;

        // check if val is within range
        if (val >= quantiles[i-1] && val < quantiles[i]) return i;

        // if no match yet, return index for the last bar
        if (i === len) return i + 1;

        // return current index
        return prev;
      }, -1);
    },

    updateHighlight: function(val) {
      if (!this.chart || this.selected_value === val) return;
      this.selected_value = val;

      this.chart.selectAll('rect').call(this.highlightBar, this);
    },

    highlightBar: function(bars, context) {
      const ctxValue = context.selected_value;

      const highlightIndex = (ctxValue !== null)
          ? context.findQuantileIndexForValue(ctxValue, context.quantileScale.quantiles()) :
            null;

      bars.classed('highlight', function(d,i) {
        return i === highlightIndex;
      });
    },

    render: function(){
      const quantileScale = this.quantileScale;
      const isThreshold = quantileScale.quantiles ? true : false;

      const quantiles = quantileScale.quantiles ?
                [0, ...quantileScale.quantiles()] :
                [0, ...quantileScale.domain()];

      const gradients = this.gradients;
      const counts = _.pluck(gradients, 'count');
      const height = this.height;

      const yScale = d3.scale.linear()
                     .domain([0, d3.max(counts)])
                     .range([0, this.height]);

      const xScale = d3.scale.ordinal()
                     .domain(quantiles)
                     .rangeBands([0, this.width]);


      if (!isThreshold) {
        xScale.domain([0, ...quantileScale.domain()]);
        xScale.rangeRoundBands([0, this.width], 0.1);

        console.log(xScale.range());
        console.log(xScale.rangeBand());
      }

      this.xScale = xScale;

      const bardata = xScale.domain().map((d,i) => {
        return {
          ...gradients[i],
          idx: i,
          pt: d,
          xpt: xScale(d)
        }
      });

      let xBuckets = xScale.range().slice(1);
      xBuckets = xBuckets.map(d => Math.floor(d));

      const findIndex = (x) => {

        let bucket = _.findIndex(xBuckets, d => x < d);

        if (bucket === -1) bucket = xBuckets.length;

        return bucket;
      };

      this.extentFromValue = function(x) {
        return findIndex(x);
      };

      const bars = this.chart.selectAll('rect')
          .data(bardata, function(d){return d.color;});

      bars.enter().append('rect');

      bars
      .style('fill', d => quantileScale(d.pt))
      .attr({
        width: () => {
          if (!isThreshold) {
            return xScale.rangeBand();
          }
          return xScale.rangeBand() - (xScale.rangeBand() / 3);
        },
        'stroke-width': () => xScale.rangeBand() / 6,
        height: (d) => yScale(d.count),
        x: (d, i) => xScale(d.pt),
        y: d => (height - yScale(d.count))
      });

      bars.exit().remove();

      if (!isThreshold) bars.call(this.highlightBar, this);

      this.chart.selectAll('rect')
                .filter(function(bucket, index) { return bucket.current === index; })
                .classed('current', true);

      return this.el;
    }
  });

  return HistogramView;
});

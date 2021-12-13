define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  '../../../../lib/wrap',
  'text!templates/scorecards/charts/performance_standard.html'
], function($, _, Backbone, d3, wrap, PerformanceStandardTemplate) {
  var PerformanceStandardView = Backbone.View.extend({
    className: 'performance-standard-chart',

    initialize: function(options) {
      this.template = _.template(PerformanceStandardTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.building_name = options.name || '';
      this.viewParent = options.parent;
      this.current_eui = options.current_eui;
      this.target_eui = options.target_eui;
      this.compliance_year = options.compliance_year;
      this.cbps_flag = options.cbps_flag;
      this.cbps_flag_but_no_cbps_euit = options.cbps_flag_but_no_cbps_euit;
    },

    chartData: function() {
      return {
        current_eui: this.current_eui,
        target_eui: this.target_eui,
        compliance_year: this.compliance_year,
        cbps_flag: this.cbps_flag,
        cbps_flag_but_no_cbps_euit: this.cbps_flag_but_no_cbps_euit,
      };
    },

    renderBarChart: function(data) {
      const parent = d3.select('div#performance-standard-bar-chart');
      if (!parent.node()) return;

      // const margin = { top: 20, right: 30, bottom: 20, left: 30 };
      const outerWidth = parent.node().offsetWidth;
      const outerHeight = parent.node().offsetHeight;
      const margin_right = 15;
      const margin_left = 5;
      const chartWidth = outerWidth - margin_left - margin_right;

      // barchart height and offset
      const barHeight = 30;
      // vertically center the bar chart in the middle of the overall SVG
      const chartOffset = (outerHeight / 2) - (barHeight / 2);
      // place the text just below the chart
      const tickOffset = (outerHeight / 2) + barHeight;

      const svg = parent.append('svg')
        .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`);

      const chartGroup = svg.append('g')
        .attr('transform', `translate(${margin_left}, ${chartOffset})`);

      const tickGroup = svg.append('g')
        .attr('transform', `translate(${margin_left}, ${tickOffset})`);

      const labelGroup = svg.append('g')
        .attr('transform', `translate(${margin_left}, ${tickOffset})`);

      // now some maths to work out a simple scale
      // we want the midpoint between two data points to be roughly the middle of the bar
      // then we figure out the max bar value from that
      const chart_midpoint = (data.current_eui + data.target_eui ) / 2;
      const chart_maxvalue = chart_midpoint * 2;
      const quartile_rough = chart_maxvalue / 5;
      let quartile = this.roundQuartile(quartile_rough);

      // add the background bar, which is just a 100% width rect, with margin on the left to support the final label
      chartGroup.append('rect')
        .attr('class', 'bar-outline')
        .attr('height', barHeight)
        .attr('width', chartWidth);

      // add the red bar, no need for a data/enter type pattern
      // as there is just one bar and we can calc the width directly
      let barWidth = (data.current_eui * chartWidth) / (quartile * 5);
      chartGroup.append('rect')
        .attr('class', 'bar-eui')
        .attr('height', barHeight)
        .attr('width', barWidth)
        .attr('text', barWidth);

      let quartiles = [0, quartile, quartile * 2, quartile * 3, quartile * 4, quartile * 5];
      let quartileWidth = chartWidth / 5;

      // add the tick values
      let tickGroupInnerGroup = tickGroup.selectAll('g')
          .data(quartiles)
        .enter().append('g')
          // we use this class to hide the first tick line (at 0) and the last tick line (at 100%)
          .classed('hide-line', function(d, i) { return i == 5 || i == 0; })
          .attr('transform', function(d, i) {
            let dx = (quartileWidth * i);
            return `translate(${dx}, 0)`;
          });

      tickGroupInnerGroup.selectAll('.tick-label')
          .data(function(d) { return [d]; })
        .enter()
          .append('text')
          .attr('class', 'tick-label')
          .attr('dx', function(d) {
            // offset the label according to its length
            // to more closely center it on the tick mark
            let chars = d.toString().length;
            return chars * -3.25;
          })
          .text(function(d) { return d; });

      tickGroupInnerGroup.selectAll('.tick-line')
          .data(function(d) { return [d]; })
        .enter()
          .append('line')
          .attr('class', 'tick-line')
          .attr('x1', 0)
          .attr('y1', -15)
          .attr('y2', -barHeight - 15);

      // append a group to hold the ticks for the current and target EUI
      let euiLabelGroup = labelGroup.append('g')
        .attr('transform', function() {
          return `translate(${barWidth - 1}, 0)`;
        });

      // now append the tick for the current EUI
      euiLabelGroup.append('line')
        .attr('class', 'data-line')
        .attr('x1', 0)
        .attr('y1', 10)
        .attr('y2', -17);

      // append a group to hold the tick for the target EUI
      let targetWidth = (data.target_eui * chartWidth) / (quartile * 5);
      let targetLabelGroup = labelGroup.append('g')
        .attr('transform', function() {
          return `translate(${targetWidth}, 0)`;
        });

      // now append the tick for the target EUI
      targetLabelGroup.append('line')
        .attr('class', 'data-line')
        .attr('x1', 0)
        .attr('y1', -45)
        .attr('y2', -72)
        .attr('dx', 5);

      // append a div to hold the label for target EUI
      // div is more flexible, auto-sizes, has border radius, etc.
      d3.select('#performance-standard-bar-chart')
        .append('div')
        .text(`${data.target_eui} (Estimated EUI Target)`)
        .attr('class', 'chart-label')
        .style('left', targetWidth - 20 + 'px')
        .style('bottom', '116px');

      // append a div to hold the label for current EUI
      d3.select('#performance-standard-bar-chart')
        .append('div')
        .text(`${data.current_eui.toLocaleString()} (Current EUI)`)
        .attr('class', 'chart-label')
        .style('left', barWidth - 20 + 'px')
        .style('bottom', '14px');

      // append a div to hold a lable for "Meets target"
      d3.select('#performance-standard-bar-chart')
        .append('div')
        .text('Meets EUI Target')
        .attr('class', 'chart-label-meets-target')
        .style('left', targetWidth - 120 + 'px')
        .style('bottom', '93px');

      // append a div to hold a lable for "Misses target"
      d3.select('#performance-standard-bar-chart')
        .append('div')
        .text('Doesn\'t Meet EUI Target')
        .attr('class', 'chart-label-misses-target')
        .style('left', targetWidth + 20 + 'px')
        .style('bottom', '93px');
    },

    roundToNearest: function(nearest, number) {
      // Math.ceil would take the upper?
      return Math.round(number/nearest) * nearest;
    },

    roundQuartile: function(quartile_rough) {
      // round the quartile according to the following rules
      let quartile;
      if (quartile_rough > 1000) {
        quartile = this.roundToNearest(50, quartile_rough);
      } else if (quartile_rough > 100 && quartile_rough <= 1000) {
        quartile = this.roundToNearest(25, quartile_rough);
      } else if (quartile_rough > 50 && quartile_rough <= 100) {
        quartile = this.roundToNearest(25, quartile_rough);
      } else if (quartile_rough > 30 && quartile_rough <= 50) {
        quartile = this.roundToNearest(10, quartile_rough);
      } else if (quartile_rough <= 30) {
        quartile = this.roundToNearest(5, quartile_rough);
      }
      return quartile;
    },

    render: function() {
      return this.template(this.chartData());
    },

    afterRender: function() {
      if (!this.isCity) {
        const chartData = this.chartData();
        this.renderBarChart(chartData);
      }
    }
  });

  return PerformanceStandardView;
});

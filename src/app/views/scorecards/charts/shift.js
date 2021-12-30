define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  '../../../../lib/wrap',
  'text!templates/scorecards/charts/shift.html'
], function($, _, Backbone, d3, wrap, ShiftTemplate){
  var ShiftView = Backbone.View.extend({
    className: 'shift-chart',

    initialize: function(options) {
      this.template = _.template(ShiftTemplate);
      this.formatters = options.formatters;
      this.data = options.data || [];
      this.view = options.view;
      this.no_year = options.no_year || false;
      this.single_year = options.single_year || false;
      this.selected_year = options.selected_year;
      this.previous_year = options.previous_year;
      this.isCity = options.isCity || false;
    },

    validNumber: function(x) {
      return _.isNumber(x) && _.isFinite(x);
    },

    calculateChange: function(years) {
      if (!this.data || !this.data.length) return null;

      const yearData = this.data
        .filter(d => d.influencer)
        .filter(d => years.indexOf(d.year) >= 0)
        .map(d => {
          return {
            yr: d.year,
            val: d.value
          };
        });

      yearData.sort((a, b) => a.yr - b.yr);

      if (yearData.length < 2) return null;

      const previousValue = yearData[0].val;
      const selectedValue = yearData[1].val;
      if (previousValue == null || selectedValue == null) return null;
      return ((selectedValue - previousValue) / previousValue) * 100;
    },

    extractChangeData: function() {
      this.data.sort((a, b) => a.year - b.year);

      const years = [parseInt(this.previous_year), parseInt(this.selected_year)];
      const change = this.calculateChange(years);
      const direction = (change < 0) ? 'decreased' : change === 0 ? '': 'increased';
      const isValid = this.validNumber(change);

      return {
        chart: this.data,
        template: {
          isValid,
          direction,
          years,
          change,
          noyear: false,
          isCity: this.isCity,
          pct: this.formatters.fixedOne(Math.abs(change)) + '%'
        }
      };
    },

    getGradientId: function(base, field) {
      return `${base}_${field}`;
    },

    setSVGGradient: function(rootElm, id, data) {
      const defs = rootElm.select('svg').append('defs');

      const fields = data.filter(d => d.colorize).reduce((a, b) => {
        if (!a.hasOwnProperty(b.field)) {
          a[b.field] = {
            min: b.year,
            max: b.year,
            minclr: b.clr,
            maxclr: b.clr
          };

          return a;
        }

        if (b.year < a[b.field].min) {
          a[b.field].min = b.year;
          a[b.field].minclr = b.clr;
        } else if (b.year > a[b.field].max) {
          a[b.field].max = b.year;
          a[b.field].maxclr = b.clr;
        }

        return a;
      }, {});

      Object.keys(fields).forEach(k => {
        const field = fields[k];

        const gradient = defs.append('linearGradient')
          .attr('id', this.getGradientId(id, k))
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', field.minclr)
            .attr('stop-opacity', 1);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', field.maxclr)
            .attr('stop-opacity', 1);
      });
    },

    renderChangeChart: function(isValid, data, selector) {
      const container = d3.select(selector);
      const rootElm = container.select('#change-chart-vis');

      if (!isValid) return;

      const years = [parseInt(this.previous_year), parseInt(this.selected_year)];
      const filteredData = data.filter(d => (
        d.year >= years[0] && d.year <= years[1] && d.value
      ));
      const valueExtent = d3.extent(filteredData, d => d.value);

      const baseWidth = rootElm.node().offsetWidth;
      const baseHeight = rootElm.node().offsetHeight;
      const margin = { top: 20, right: 150, bottom: 0, left: 50 };
      let width = baseWidth - margin.left - margin.right;
      let height = baseHeight - margin.top - margin.bottom;

      const svg = rootElm.append('svg')
        .attr('viewBox', `0 0 ${baseWidth} ${baseHeight}`)
        .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      const x = d3.scale.linear()
        .range([0, width])
        .domain(years);

      const y = d3.scale.linear()
        .domain(valueExtent)
        .range([height, 0]);

      const line = d3.svg.line()
        .x(d => x(d.year))
        .y(d => y(d.value));

      const xAxis = svg.append('g')
        .classed('x-axis', true)
        .attr('transform', 'translate(0, -30)');

      xAxis.selectAll('.year')
        .data(d3.set(filteredData.map(d => d.year)).values().sort())
        .enter().append('text')
        .classed('year', true)
        .text(d => d)
        .style('text-anchor', 'middle')
        .attr('transform', d => `translate(${x(d)}, 0)`);

      const gradientID = 'gradient-' + this.view;
      this.setSVGGradient(rootElm, gradientID, filteredData);

      const connections = d3.nest()
        .key(d => d.label)
        .entries(filteredData);

      svg.selectAll('.line')
        .data(connections)
      .enter().append('path')
        .attr('class', d => {
          const colorize = d.values[0].colorize ? '' : ' no-clr';
          const field = d.values[0].field;

          return `line shift-line-${field} ${colorize}`;
        })
        .style('stroke', d => {
          const colorize = d.values[0].colorize;
          if (!colorize) return null;

          const field = d.values[0].field;
          return 'url(#' + this.getGradientId(gradientID, field) + ')';
        })
        .attr('d', d => line(d.values));

      var dotGroup = svg.selectAll('.dot')
          .data(filteredData)
        .enter().append('g')
          .attr('class', d => {
            const colorize = d.colorize ? '' : ' no-clr';
            const field = d.field;

            return `dot shift-dot-${field} ${colorize}`;
          })
          .attr('transform', d => { return 'translate(' + x(d.year) + ',' + y(d.value) + ')'; });

      dotGroup.append('circle')
        .attr('r', 5)
        .attr('fill', d => d.clr);

      const dotText = dotGroup.append('text')
        .style('fill', d => d.clr || '#acacac');

      dotText.append('tspan')
        .classed('value', true)
        .text(d => this.formatters.fixedOne(d.value));

      dotText.append('tspan')
        .attr('x', 0)
        .attr('dy', '1em')
        .classed('metric small', true)
        .text(d => d.unit);

      dotText
        .attr('transform', (d, i) => {
          return `translate(${-dotText[0][i].getBBox().width - 5}, 0)`;
        });

      // hacky way to attempt fixing label collisions after the fact
      this.detectAndCorrectLabelCollisions();

      const lastyear = x.domain().slice(-1)[0];
      dotGroup.filter(d => d.year === lastyear)
        .append('text')
        .classed('building', true)
        .classed('selected-building', d => d.colorize)
        .style('fill', d => d.clr || '#acacac')
        .attr('transform', `translate(10, 0)`)
        .text(d => d.label)
        .call(wrap, 120);
    },

    // look for label groups that overlap (defined as within 10px of each other)
    // and when found, update the transforms on the text within them, moving them +/- 15px
    detectAndCorrectLabelCollisions: function() {
      const group_a = d3.selectAll('g.dot.shift-dot-site_eui_wn');
      const group_b = d3.selectAll('g.dot.shift-dot-building_type_eui_wn');

      // sometimes the series are not the same length, and we don't try and accomodate that
      // everything that follows assumes pairs of labels on the same plane
      if (group_a.size() !== group_b.size()) return;

      let diffs = [];
      group_a.each(function(d, i) {
        let t1 = d3.transform(d3.select(this).attr('transform'));
        let x1 = t1.translate[0];
        let y1 = t1.translate[1];
        diffs[i] = { ax: x1, ay: parseFloat(y1) };
      });
      group_b.each(function(d, i) {
        let t1 = d3.transform(d3.select(this).attr('transform'));
        let x1 = t1.translate[0];
        let y1 = t1.translate[1];
        diffs[i]['bx'] = x1;
        diffs[i]['by'] = parseFloat(y1);
      });

      diffs.forEach(function(d, i) {
        let diff = d.ay - d.by;
        if (Math.abs(diff) < 10) {
          let a = group_a.filter(function(d, j) { return j === i; });
          let a_text = a.select('text');
          let at = d3.transform(a_text.attr('transform'));
          let at_x = at.translate[0];
          let at_y = at.translate[1];

          let b = group_b.filter(function(d, j) { return j === i; });
          let b_text = b.select('text');
          let bt = d3.transform(b_text.attr('transform'));
          let bt_x = bt.translate[0];
          let bt_y = bt.translate[1];

          let change_y = 15 + diff;

          if (diff < 0) {
            a_text.attr('transform', `translate(${at_x}, ${at_y - change_y})`);
            b_text.attr('transform', `translate(${bt_x}, ${bt_y + change_y})`);
          } else {
            a_text.attr('transform', `translate(${at_x}, ${at_y + change_y})`);
            b_text.attr('transform', `translate(${bt_x}, ${bt_y - change_y})`);
          }
        }
      });
    },

    chartData: function(cb) {
      cb(this.extractChangeData());
    },

    render: function(cb, viewSelector){
      if (this.single_year) {
        cb(this.template({
          isValid: false,
          isCity: this.isCity,
          noyear: false,
        }));
        return;
      }

      if (this.no_year) {
        cb(this.template({
          noyear: true,
          year_needed: this.previous_year,
          isCity: this.isCity
        }));
        return;
      }

      this.chartData(d => {
        cb(this.template(d.template));
        this.renderChangeChart(d.template.isValid, d.chart, viewSelector);
      });
    }
  });

  return ShiftView;
});

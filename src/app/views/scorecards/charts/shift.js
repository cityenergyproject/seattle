define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/scorecards/charts/shift.html'
], function($, _, Backbone, d3, ShiftTemplate){
  var ShiftView = Backbone.View.extend({
    className: 'shift-chart',

    initialize: function(options){
      this.template = _.template(ShiftTemplate);
      this.formatters = options.formatters;
      this.data = options.data || [];
      this.view = options.view;
      this.no_year = options.no_year || false;
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
      return ((selectedValue - previousValue) / selectedValue) * 100;
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
      const yearsElm = container.select('#change-chart-years');

      if (!isValid) return;

      const diameter = 10;
      const yearExtent = d3.extent(data, d => d.year);
      const valueExtent = d3.extent(data, d => d.value);

      const yearWidth = yearsElm.select('p').node().offsetWidth;
      let baseWidth = yearsElm.node().offsetWidth - (yearWidth * 2);

      baseWidth += diameter;

      rootElm.style('margin-left', (yearWidth - diameter/2) + 'px');

      const margin = { top: 0, right: 0, bottom: 0, left: 0 };
      let width = baseWidth - margin.left - margin.right;
      let height = rootElm.node().offsetHeight - margin.top - margin.bottom;

      const svg = rootElm.append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
        .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      const gradientID = 'gradient-' + this.view;
      this.setSVGGradient(rootElm, gradientID, data);

      const x = d3.scale.linear()
        .range([0, width])
        .domain(yearExtent);

      const y = d3.scale.linear()
        .domain(valueExtent)
        .range([height, 0]);

      const line = d3.svg.line()
        .x(d => x(d.year))
        .y(d => y(d.value));

      const connections = d3.nest()
        .key(d => d.label)
        .entries(data);

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

      var bar = svg.selectAll('.dot')
          .data(data)
        .enter().append('g')
          .attr('class', d => {
            const colorize = d.colorize ? '' : ' no-clr';
            const field = d.field;

            return `dot shift-dot-${field} ${colorize}`;
          })
          .attr('transform', d => { return 'translate(' + x(d.year) + ',' + y(d.value) + ')'; });

      bar.append('circle')
        .attr('r', 5)
        .attr('fill', d => d.clr);

      var firstyear = x.domain()[0];
      var lastyear = x.domain().slice(-1)[0];

      var label = rootElm.selectAll('.label')
        .data(data)
      .enter().append('div')
        .attr('class', 'label')
        .attr('class', d => {
          const colorize = d.colorize ? '' : ' no-clr';
          const field = d.field;

          return `label shift-label-${field} ${colorize}`;
        })
        .style('color', d => d.clr)
        .style('left', d => {
          if (d.year === firstyear) return x(d.year) + 'px';
          return x(d.year) + 10 +'px';
        })
        .style('top', d => { return y(d.value) + 'px'; });

      var innerLabel = label.append('table').append('td');

      innerLabel
        .append('p')
        .text(d => this.formatters.fixedOne(d.value));
      innerLabel
        .append('p')
        .attr('class', 'metric small')
        .text(d => d.unit);

      label.each(function(d) {
        var el = d3.select(this);
        var w = el.node().offsetWidth;

        if (d.year === firstyear) {
          el.style('margin-left', -(w + 10) + 'px');
        }
      });

      label.filter(d => d.year === lastyear)
        .select('table')
        .append('td')
        .append('span')
          .attr('class', 'building')
          .text(d => d.label);

      const me = this;
      let prev;
      label.each(function(d) {
        if (prev) {
          let rect1 = me.makeRect(prev);
          let rect2 = me.makeRect(this);
          let attempts = 10;

          let rect1Delta = -2;
          let rect2Delta = 2;

          if (d3.select(prev).data() && d3.select(this).data()) {
            const rect1Data = d3.select(prev).data()[0];
            const rect2Data = d3.select(this).data()[0];
            if (rect1Data.value != undefined && rect2Data.value != undefined) {
              rect1Delta = (rect1Data.value < rect2Data.value) ? 2 : -2;
              rect2Delta = -(rect1Delta);
            }
          }

          while (me.collision(rect1, rect2) && attempts > 0) {
            attempts--;
            prev.style.top = (rect1.top + rect1Delta) + 'px';
            this.style.top = (rect2.top + rect2Delta) + 'px';

            rect1 = me.makeRect(prev);
            rect2 = me.makeRect(this);
          }
        }
        prev = this;
      });
    },

    makeRect: function(el) {
      const t = el.offsetTop;
      const l = el.offsetLeft;

      return {
        top: t,
        right: l + el.offsetWidth,
        bottom: t + el.offsetHeight,
        left: l
      };
    },

    collision: function(rect1, rect2) {
      return !(rect1.right < rect2.left ||
              rect1.left > rect2.right ||
              rect1.bottom < rect2.top ||
              rect1.top > rect2.bottom);
    },

    chartData: function(cb) {
      cb(this.extractChangeData());
    },

    render: function(cb, viewSelector){
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

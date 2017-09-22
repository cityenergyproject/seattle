'use strict';

define(['jquery', 'underscore', 'backbone', 'd3', 'text!templates/scorecards/charts/shift.html'], function ($, _, Backbone, d3, ShiftTemplate) {

  var ShiftView = Backbone.View.extend({
    className: 'shift-chart',

    initialize: function initialize(options) {
      this.template = _.template(ShiftTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.view = options.view;
    },

    calculateChange: function calculateChange() {
      var years = [];

      var change_key = 'emissions';
      this.data.filter(function (o) {
        return o.key === change_key;
      }).forEach(function (o) {
        years.push({
          yr: o.year,
          val: o.value
        });
      });

      years.sort(function (a, b) {
        return a.yr - b.yr;
      });

      var last = years.length - 1;
      return (years[last].val - years[last - 1].val) / years[last].val * 100;
    },

    extractChangeData: function extractChangeData() {
      this.data.sort(function (a, b) {
        return a.year - b.year;
      });

      var years = d3.extent(this.data, function (d) {
        return d.year;
      });

      var change = this.calculateChange();

      var direction = change < 0 ? 'decreased' : 'increased';

      return {
        chart: this.data,
        template: {
          pct: this.formatters.fixedOne(Math.abs(change)) + '%',
          direction: direction,
          years: years
        }
      };
    },

    renderChangeChart: function renderChangeChart(data, selector) {
      var _this = this;

      var container = d3.select(selector);

      var rootElm = container.select('#change-chart-vis');
      var yearsElm = container.select('#change-chart-years');

      var diameter = 10;
      var yearExtent = d3.extent(data, function (d) {
        return d.year;
      });
      var valueExtent = d3.extent(data, function (d) {
        return d.value;
      });

      var yearWidth = yearsElm.select('p').node().offsetWidth;
      var baseWidth = yearsElm.node().offsetWidth - yearWidth * 2;

      baseWidth += diameter;

      rootElm.style('margin-left', yearWidth - diameter / 2 + 'px');

      var margin = { top: 0, right: 0, bottom: 0, left: 0 },
          width = baseWidth - margin.left - margin.right,
          height = rootElm.node().offsetHeight - margin.top - margin.bottom;

      var svg = rootElm.append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var gradientID = 'gradient-' + this.view;
      var gradient = rootElm.select('svg').append('defs').append('linearGradient').attr('id', gradientID).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%').attr('spreadMethod', 'pad');

      gradient.append('stop').attr('offset', '0%').attr('stop-color', '#0c0').attr('stop-opacity', 1);

      gradient.append('stop').attr('offset', '100%').attr('stop-color', '#c00').attr('stop-opacity', 1);

      var x = d3.scale.ordinal().range([0, width]).domain(yearExtent);

      var y = d3.scale.linear().domain(valueExtent).range([height, 0]);

      var line = d3.svg.line().x(function (d) {
        return x(d.year);
      }).y(function (d) {
        return y(d.value);
      });

      var connections = d3.nest().key(function (d) {
        return d.label;
      }).entries(data);

      svg.selectAll('.line').data(connections).enter().append('path').attr('class', 'line').attr('d', function (d) {
        return line(d.values);
      });

      var bar = svg.selectAll('.dot').data(data).enter().append('g').attr('class', 'dot').classed('avg', function (d) {
        return d.isAvg;
      }).attr('transform', function (d) {
        return 'translate(' + x(d.year) + ',' + y(d.value) + ')';
      });

      bar.append('circle').attr('r', 5);

      var firstyear = x.domain()[0];
      var lastyear = x.domain()[1];

      var label = rootElm.selectAll('.label').data(data).enter().append('div').attr('class', 'label').classed('avg', function (d) {
        return d.isAvg;
      }).style('left', function (d) {
        if (d.year === firstyear) return x(d.year) + 'px';
        return x(d.year) + 10 + 'px';
      }).style('top', function (d) {
        return y(d.value) + 'px';
      });

      label.append('p').text(function (d) {
        return _this.formatters.fixedOne(d.value);
      });
      label.append('p').attr('class', 'metric small').text('kbtu/sf');

      label.each(function (d) {
        var el = d3.select(this);
        var w = el.node().offsetWidth;

        if (d.year === firstyear) {
          el.style('margin-left', -(w + 10) + 'px');
        }
      });

      label.filter(function (d) {
        return d.year === lastyear;
      }).append('span').attr('class', 'building').classed('avg', function (d) {
        return d.isAvg;
      }).text(function (d) {
        return d.label;
      });

      var me = this;
      var prev = void 0;
      label.each(function (d) {
        if (prev) {
          var rect1 = me.makeRect(prev);
          var rect2 = me.makeRect(this);
          var attempts = 10;

          while (me.collision(rect1, rect2) && attempts > 0) {
            attempts--;
            prev.style.top = rect1.top - 2 + 'px';
            this.style.top = rect2.top + 2 + 'px';

            rect1 = me.makeRect(prev);
            rect2 = me.makeRect(this);
          }
        }
        prev = this;
      });
    },

    makeRect: function makeRect(el) {
      var t = el.offsetTop;
      var l = el.offsetLeft;

      return {
        top: t,
        right: l + el.offsetWidth,
        bottom: t + el.offsetHeight,
        left: l
      };
    },

    collision: function collision(rect1, rect2) {
      return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    },

    query: function query() {
      return 'SELECT year,SUM(total_ghg_emissions) as emissions,SUM(total_kbtu) as consumption FROM (SELECT year, COALESCE(total_ghg_emissions, 0) as total_ghg_emissions, COALESCE(total_kbtu, 0) as total_kbtu FROM table_2015_stamen_phase_ii_v2_w_year)q GROUP BY year';
    },

    loadData: function loadData(cb) {
      d3.json('https://cityenergy-seattle.carto.com/api/v2/sql?q=' + this.query(), function (d) {
        return cb(d);
      });
    },

    chartData: function chartData(cb) {
      var _this2 = this;

      if (!this.data) {
        this.loadData(function (data) {
          if (!data) {
            console.error('Problem loading citywide change data!');
            return;
          }

          _this2.data = [];
          data.rows.forEach(function (obj) {
            _this2.data.push({
              label: 'Citywide GHG emissions',
              key: 'emissions',
              value: +obj.emissions.toFixed(1),
              year: obj.year,
              isAvg: false
            });

            _this2.data.push({
              label: 'Citywide Total Energy Consumption',
              key: 'consumption',
              value: +obj.consumption.toFixed(1),
              year: obj.year,
              isAvg: false
            });
          });

          cb(_this2.extractChangeData());
        });
      } else {
        cb(this.extractChangeData());
      }
    },

    render: function render(cb, viewSelector) {
      var _this3 = this;

      this.chartData(function (d) {
        cb(_this3.template(d.template));
        _this3.renderChangeChart(d.chart, viewSelector);
      });
    }
  });

  return ShiftView;
});
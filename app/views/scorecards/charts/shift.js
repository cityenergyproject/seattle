'use strict';

define(['jquery', 'underscore', 'backbone', 'd3', '../../../../lib/wrap', 'text!templates/scorecards/charts/shift.html'], function ($, _, Backbone, d3, wrap, ShiftTemplate) {
  var ShiftView = Backbone.View.extend({
    className: 'shift-chart',

    initialize: function initialize(options) {
      this.template = _.template(ShiftTemplate);
      this.formatters = options.formatters;
      this.data = options.data || [];
      this.view = options.view;
      this.no_year = options.no_year || false;
      this.selected_year = options.selected_year;
      this.previous_year = options.previous_year;
      this.isCity = options.isCity || false;
    },

    validNumber: function validNumber(x) {
      return _.isNumber(x) && _.isFinite(x);
    },

    calculateChange: function calculateChange(years) {
      if (!this.data || !this.data.length) return null;

      var yearData = this.data.filter(function (d) {
        return d.influencer;
      }).filter(function (d) {
        return years.indexOf(d.year) >= 0;
      }).map(function (d) {
        return {
          yr: d.year,
          val: d.value
        };
      });

      yearData.sort(function (a, b) {
        return a.yr - b.yr;
      });

      if (yearData.length < 2) return null;

      var previousValue = yearData[0].val;
      var selectedValue = yearData[1].val;
      if (previousValue == null || selectedValue == null) return null;
      return (selectedValue - previousValue) / selectedValue * 100;
    },

    extractChangeData: function extractChangeData() {
      this.data.sort(function (a, b) {
        return a.year - b.year;
      });

      var years = [parseInt(this.previous_year), parseInt(this.selected_year)];
      var change = this.calculateChange(years);
      var direction = change < 0 ? 'decreased' : change === 0 ? '' : 'increased';
      var isValid = this.validNumber(change);

      return {
        chart: this.data,
        template: {
          isValid: isValid,
          direction: direction,
          years: years,
          change: change,
          noyear: false,
          isCity: this.isCity,
          pct: this.formatters.fixedOne(Math.abs(change)) + '%'
        }
      };
    },

    getGradientId: function getGradientId(base, field) {
      return base + '_' + field;
    },

    setSVGGradient: function setSVGGradient(rootElm, id, data) {
      var _this = this;

      var defs = rootElm.select('svg').append('defs');

      var fields = data.filter(function (d) {
        return d.colorize;
      }).reduce(function (a, b) {
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

      Object.keys(fields).forEach(function (k) {
        var field = fields[k];

        var gradient = defs.append('linearGradient').attr('id', _this.getGradientId(id, k)).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');

        gradient.append('stop').attr('offset', '0%').attr('stop-color', field.minclr).attr('stop-opacity', 1);

        gradient.append('stop').attr('offset', '100%').attr('stop-color', field.maxclr).attr('stop-opacity', 1);
      });
    },

    renderChangeChart: function renderChangeChart(isValid, data, selector) {
      var _this2 = this;

      var container = d3.select(selector);
      var rootElm = container.select('#change-chart-vis');

      if (!isValid) return;

      var years = [parseInt(this.previous_year), parseInt(this.selected_year)];
      var filteredData = data.filter(function (d) {
        return d.year >= years[0] && d.year <= years[1] && d.value;
      });
      var valueExtent = d3.extent(filteredData, function (d) {
        return d.value;
      });

      var baseWidth = rootElm.node().offsetWidth;
      var baseHeight = rootElm.node().offsetHeight;
      var margin = { top: 20, right: 150, bottom: 0, left: 50 };
      var width = baseWidth - margin.left - margin.right;
      var height = baseHeight - margin.top - margin.bottom;

      var svg = rootElm.append('svg').attr('viewBox', '0 0 ' + baseWidth + ' ' + baseHeight).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var x = d3.scale.linear().range([0, width]).domain(years);

      var y = d3.scale.linear().domain(valueExtent).range([height, 0]);

      var line = d3.svg.line().x(function (d) {
        return x(d.year);
      }).y(function (d) {
        return y(d.value);
      });

      var xAxis = svg.append('g').classed('x-axis', true).attr('transform', 'translate(0, -30)');

      xAxis.selectAll('.year').data(d3.set(filteredData.map(function (d) {
        return d.year;
      })).values().sort()).enter().append('text').classed('year', true).text(function (d) {
        return d;
      }).style('text-anchor', 'middle').attr('transform', function (d) {
        return 'translate(' + x(d) + ', 0)';
      });

      var gradientID = 'gradient-' + this.view;
      this.setSVGGradient(rootElm, gradientID, filteredData);

      var connections = d3.nest().key(function (d) {
        return d.label;
      }).entries(filteredData);

      svg.selectAll('.line').data(connections).enter().append('path').attr('class', function (d) {
        var colorize = d.values[0].colorize ? '' : ' no-clr';
        var field = d.values[0].field;

        return 'line shift-line-' + field + ' ' + colorize;
      }).style('stroke', function (d) {
        var colorize = d.values[0].colorize;
        if (!colorize) return null;

        var field = d.values[0].field;
        return 'url(#' + _this2.getGradientId(gradientID, field) + ')';
      }).attr('d', function (d) {
        return line(d.values);
      });

      var dot = svg.selectAll('.dot').data(filteredData).enter().append('g').attr('class', function (d) {
        var colorize = d.colorize ? '' : ' no-clr';
        var field = d.field;

        return 'dot shift-dot-' + field + ' ' + colorize;
      }).attr('transform', function (d) {
        return 'translate(' + x(d.year) + ',' + y(d.value) + ')';
      });

      dot.append('circle').attr('r', 5).attr('fill', function (d) {
        return d.clr;
      });

      var dotText = dot.append('text').style('fill', function (d) {
        return d.clr || '#acacac';
      });

      dotText.append('tspan').classed('value', true).text(function (d) {
        return _this2.formatters.fixedOne(d.value);
      });

      dotText.append('tspan').attr('x', 0).attr('dy', '1em').classed('metric small', true).text(function (d) {
        return d.unit;
      });

      dotText.attr('transform', function (d, i) {
        return 'translate(' + (-dotText[0][i].getBBox().width - 5) + ', 0)';
      });

      var lastyear = x.domain().slice(-1)[0];
      dot.filter(function (d) {
        return d.year === lastyear;
      }).append('text').classed('building', true).classed('selected-building', function (d) {
        return d.colorize;
      }).style('fill', function (d) {
        return d.clr || '#acacac';
      }).attr('transform', 'translate(10, 0)').text(function (d) {
        return d.label;
      }).call(wrap, 120);
    },

    chartData: function chartData(cb) {
      cb(this.extractChangeData());
    },

    render: function render(cb, viewSelector) {
      var _this3 = this;

      if (this.no_year) {
        cb(this.template({
          noyear: true,
          year_needed: this.previous_year,
          isCity: this.isCity
        }));
        return;
      }

      this.chartData(function (d) {
        cb(_this3.template(d.template));
        _this3.renderChangeChart(d.template.isValid, d.chart, viewSelector);
      });
    }
  });

  return ShiftView;
});
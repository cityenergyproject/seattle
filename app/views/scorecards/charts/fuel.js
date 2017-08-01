'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

define(['jquery', 'underscore', 'backbone', 'd3', 'text!templates/scorecards/charts/fueluse.html'], function ($, _, Backbone, d3, FuelUseTemplate) {

  var FuelUseView = Backbone.View.extend({
    className: 'fueluse-chart',

    TYPICAL_CAR_EMMISSION: 4.7,

    initialize: function initialize(options) {
      this.template = _.template(FuelUseTemplate);
      this.formatters = options.formatters;
      this.data = options.data;

      this.fuels = [{
        label: 'Natural Gas',
        key: 'gas'
      }, {
        label: 'Electric',
        key: 'electricity'
      }, {
        label: 'Steam',
        key: 'steam'
      }];
    },

    getMean: function getMean(key, data) {
      if (data.pluck) {
        return d3.mean(data.pluck(key));
      } else {
        return d3.mean(data.map(function (d) {
          return d[key];
        }));
      }
    },

    getSum: function getSum(key, data) {
      if (data.pluck) {
        return d3.sum(data.pluck(key));
      } else {
        return d3.sum(data.map(function (d) {
          return d[key];
        }));
      }
    },

    pctFormat: function pctFormat(n) {
      var val = n * 100;
      return d3.format('.0f')(val);
    },

    chartData: function chartData() {
      var _this = this;

      var data = this.data;
      var fuels = [].concat(_toConsumableArray(this.fuels));

      fuels.forEach(function (d) {
        d.emissions = {};
        d.emissions.pct = _this.pctFormat(_this.getMean(d.key + '_ghg_percent', data));
        d.emissions.amt = _this.getMean(d.key + '_ghg', data);

        d.usage = {};
        d.usage.pct = _this.pctFormat(_this.getMean(d.key + '_pct', data));
        d.usage.amt = _this.getMean(d.key, data);
      });

      fuels = fuels.filter(function (d) {
        return d.usage.amt > 0 && d.emissions.amt > 0;
      });

      var total_ghg_emissions = this.getSum('total_ghg_emissions', data);

      var totals = {
        usage: this.formatters.fixed(this.getSum('total_kbtu', data)),
        emissions: this.formatters.fixed(total_ghg_emissions)
      };

      return {
        fuels: fuels,
        totals: totals,
        cars: this.formatters.fixedOne(total_ghg_emissions / this.TYPICAL_CAR_EMMISSION)
      };
    },

    getLabelSizes: function getLabelSizes(labels) {
      var sizes = [];

      labels.each(function () {
        var pw = this.offsetWidth;
        var cw = this.firstChild.offsetWidth;

        if (pw === 0) return;

        sizes.push({
          elm: this,
          pw: pw,
          cw: cw,
          dirty: cw > pw,
          pct: +this.style.width.replace('%', '')
        });
      });

      return sizes;
    },

    adjSizes: function adjSizes(labels, ct) {
      var sizes = this.getLabelSizes(labels);
      if (!sizes.length) return;

      var ctr = ct || 0;
      ctr += 1;
      if (ctr > 10) return;

      var dirty = _.findIndex(sizes, function (d) {
        return d.dirty;
      });

      if (dirty > -1) {
        var available = sizes.filter(function (d) {
          return !d.dirty;
        });

        var additional = 0;

        available.forEach(function (d) {
          additional += 1;
          d3.select(d.elm).style('width', d.pct - 1 + '%');
        });

        d3.select(sizes[dirty].elm).style('width', sizes[dirty].pct + additional + '%');

        this.adjSizes(labels, ctr);
      }
    },

    hideLabels: function hideLabels(labels) {
      var sizes = this.getLabelSizes(labels);
      sizes.forEach(function (d) {
        if (d.dirty) {
          d3.select(d.elm.firstChild).style('display', 'none');
        }
      });
    },

    fixlabels: function fixlabels(selector) {
      var chart = d3.select(selector).select('#fuel-use-chart');

      var headerLabels = chart.select('.fc-bars').selectAll('.fc-header');
      this.adjSizes(headerLabels, 0);

      var barLabels = chart.select('.fc-bars').selectAll('.fc-bar');
      this.hideLabels(barLabels);
    },

    render: function render() {
      var d = this.chartData();

      return this.template(d);
    }
  });

  return FuelUseView;
});
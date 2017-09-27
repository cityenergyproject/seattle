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
      this.building_name = options.name || '';
      this.year = options.year || '';

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

    validNumber: function validNumber(n) {
      return _.isNumber(n) && _.isFinite(n);
    },

    validFuel: function validFuel(pct, amt) {
      return this.validNumber(pct) && pct > 0 && this.validNumber(amt) && amt > 0;
    },

    getBuildingFuels: function getBuildingFuels(fuels, data) {
      var _this = this;

      fuels.forEach(function (d) {
        var emmission_pct = _this.getMean(d.key + '_ghg_percent', data);
        var emmission_amt = _this.getMean(d.key + '_ghg', data);
        var usage_pct = _this.getMean(d.key + '_pct', data);
        var usage_amt = _this.getMean(d.key, data);

        d.emissions = {};
        d.emissions.isValid = _this.validFuel(emmission_pct, emmission_amt);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;
        d.emissions.pct_actual = emmission_pct;
        d.emissions.amt = emmission_amt;

        d.usage = {};
        d.usage.isValid = _this.validFuel(usage_pct, usage_amt);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
        d.usage.pct_actual = usage_pct;
        d.usage.amt = usage_amt;
      });

      return fuels.filter(function (d) {
        return d.usage.isValid && d.emissions.isValid;
      });
    },

    getCityWideFuels: function getCityWideFuels(fuels, data) {
      var _this2 = this;

      var total_emissions = 0;
      var total_usage = 0;

      fuels.forEach(function (d) {
        d.emissions = {};
        d.usage = {};

        d.emissions.amt = _this2.getSum(d.key + '_ghg', data);
        d.usage.amt = _this2.getSum(d.key, data);

        total_emissions += d.emissions.amt;
        total_usage += d.usage.amt;
      });

      fuels.forEach(function (d) {
        var emmission_pct = d.emissions.amt / total_emissions;
        var usage_pct = d.usage.amt / total_usage;

        d.emissions.isValid = _this2.validFuel(emmission_pct, d.emissions.amt);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;
        d.emissions.pct_actual = emmission_pct;

        d.usage.isValid = _this2.validFuel(usage_pct, d.usage.amt);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
        d.usage.pct_actual = usage_pct;
      });

      return fuels.filter(function (d) {
        return d.usage.isValid && d.emissions.isValid;
      });
    },

    fixPercents: function fixPercents(fuels, prop) {
      var values = fuels.map(function (d, i) {
        var decimal = +(d[prop].pct_raw % 1);
        var val = Math.floor(d[prop].pct_raw);
        return {
          idx: i,
          val: val,
          iszero: val === 0,
          decimal: val === 0 ? 1 : decimal
        };
      }).sort(function (a, b) {
        return b.decimal - a.decimal;
      });

      var sum = d3.sum(values, function (d) {
        return d.val;
      });

      var diff = 100 - sum;

      values.forEach(function (d) {
        if (diff === 0) return;

        diff -= 1;
        d.val += 1;

        d.iszero = false;
      });

      // we need to bump up zero values
      var zeros = values.filter(function (d) {
        return d.iszero;
      });
      var zeros_length = zeros.length;

      if (zeros_length > 0) {
        while (zeros_length > 0) {
          zeros_length--;
          values.forEach(function (d) {
            if (!d.iszero && d.val > 1) {
              d.val -= 1;
            }

            if (d.iszero) {
              d.val += 1;
            }
          });
        }
      }

      values.forEach(function (d) {
        fuels[d.idx][prop].pct = d.val;
        fuels[d.idx][prop].pct_raw = d.val;
      });
    },

    chartData: function chartData() {
      var data = this.data;

      var total_ghg_emissions = this.getSum('total_ghg_emissions', data);
      var total_usage = this.getSum('total_kbtu', data);

      var fuels = void 0;
      if (data.length === 1) {
        fuels = this.getBuildingFuels([].concat(_toConsumableArray(this.fuels)), data);
      } else {
        fuels = this.getCityWideFuels([].concat(_toConsumableArray(this.fuels)), data);
      }

      this.fixPercents(fuels, 'emissions');
      this.fixPercents(fuels, 'usage');

      // console.log(this.formatters.abbreviate(total_usage, this.formatters.fixed));
      var totals = {
        usage: this.formatters.fixed(total_usage),
        emissions: this.formatters.fixed(total_ghg_emissions)
      };

      return {
        fuels: fuels,
        totals: totals,
        building_name: this.building_name,
        year: this.year,
        emission_klass: fuels.length === 1 ? 'onefuel' : '',
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
      if (ctr > 100) return;

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

      // const emissionBars = chart.select('.emission-bars').selectAll('.fc-bar');
      // this.adjSizes(emissionBars, 0);

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
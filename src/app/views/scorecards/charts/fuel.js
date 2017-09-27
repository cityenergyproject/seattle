define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/scorecards/charts/fueluse.html'
], function($, _, Backbone, d3, FuelUseTemplate){

  var FuelUseView = Backbone.View.extend({
    className: 'fueluse-chart',

    TYPICAL_CAR_EMMISSION: 4.7,

    initialize: function(options){
      this.template = _.template(FuelUseTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.building_name = options.name || '';
      this.year = options.year || ''

      this.fuels = [
        {
          label: 'Natural Gas',
          key: 'gas'
        },
        {
          label: 'Electric',
          key: 'electricity'
        },
        {
          label: 'Steam',
          key: 'steam'
        }
      ];
    },

    getMean: function(key, data) {
      if (data.pluck) {
        return d3.mean(data.pluck(key));
      } else {
        return d3.mean(data.map(d => d[key]));
      }
    },

    getSum: function(key, data) {
      if (data.pluck) {
        return d3.sum(data.pluck(key));
      } else {
        return d3.sum(data.map(d => d[key]));
      }
    },

    pctFormat: function(n) {
      var val = n * 100;
      return d3.format('.0f')(val);
    },

    getBuildingFuels: function(fuels, data) {
      fuels.forEach(d => {
        const emmission_pct = this.getMean(d.key + '_ghg_percent', data);
        const emmission_amt = this.getMean(d.key + '_ghg', data);
        const usage_pct = this.getMean(d.key + '_pct', data);

        d.emissions = {};
        d.emissions.isValid = _.isNumber(emmission_pct) && _.isFinite(emmission_pct);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;
        d.emissions.amt = emmission_amt;

        d.usage = {};
        d.usage.isValid = _.isNumber(usage_pct) && _.isFinite(usage_pct);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
        d.usage.amt = this.getMean(d.key, data);
      });

      return fuels.filter(d => {
        return d.usage.isValid && d.emissions.isValid;
      });
    },

    getCityWideFuels: function(fuels, data) {
      let total_emissions = 0;
      let total_usage = 0;

      fuels.forEach(d => {
        d.emissions = {};
        d.usage = {};

        d.emissions.amt = this.getSum(d.key + '_ghg', data);
        d.usage.amt = this.getSum(d.key, data);

        total_emissions += d.emissions.amt;
        total_usage += d.usage.amt;
      });

      fuels.forEach(d => {
        const emmission_pct = d.emissions.amt / total_emissions;
        const usage_pct = d.usage.amt / total_usage;

        d.emissions.isValid = _.isNumber(emmission_pct) && _.isFinite(emmission_pct);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;

        d.usage.isValid = _.isNumber(usage_pct) && _.isFinite(usage_pct);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
      });

      return fuels.filter(d => {
        return d.usage.isValid && d.emissions.isValid;
      });
    },

    fixPercents: function(fuels, prop) {
      const values = fuels.map((d,i) => {
        const decimal = +((d[prop].pct_raw % 1).toFixed(1));
        return {
          idx: i,
          val: Math.floor(d[prop].pct_raw),
          decimal
        }
      }).sort((a,b) => {
        return b.decimal - a.decimal;
      });

      const sum = d3.sum(values, d => d.val);

      let diff = 100 - sum;

      values.forEach(d => {
        if (diff === 0) return;
        diff = diff - 1;
        d.val += 1;
      });

      values.forEach(d => {
        fuels[d.idx][prop].pct = d.val;
        fuels[d.idx][prop].pct_raw = d.val;
      });
    },

    chartData: function() {
      const data = this.data;

      var total_ghg_emissions = this.getSum('total_ghg_emissions', data);
      var total_usage = this.getSum('total_kbtu', data);

      let fuels;
      if (data.length === 1) {
        fuels = this.getBuildingFuels([...this.fuels], data);
      } else {
        fuels = this.getCityWideFuels([...this.fuels], data);
      }

      this.fixPercents(fuels, 'emissions');
      this.fixPercents(fuels, 'usage');

      /*
      const emission_total = d3.sum(fuels, d => {
        if (d.emissions.isValid) return d.emissions.pct_raw;
        return 0;
      });

      const usage_total = d3.sum(fuels, d => {
        if (d.usage.isValid) return d.usage.pct_raw;
        return 0;
      });


      let diff;
      if (emission_total !== 100) {
        diff = (100 - emission_total) / fuels.length;
        fuels.forEach(d => {
          if (!d.emissions.isValid) return d.emissions.pct_raw = diff;
          d.emissions.pct_raw += diff;
        });
      }

      if (usage_total !== 100) {
        diff = (100 - usage_total) / fuels.length;
        fuels.forEach(d => {
          if (!d.usage.isValid) return;
          d.usage.pct_raw += diff;
        });
      }
      */

      // console.log(this.formatters.abbreviate(total_usage, this.formatters.fixed));
      var totals = {
        usage: this.formatters.fixed(total_usage),
        emissions: this.formatters.fixed(total_ghg_emissions)
      };

      return {
        fuels,
        totals,
        building_name: this.building_name,
        year: this.year,
        emission_klass: fuels.length === 1 ? 'onefuel' : '',
        cars: this.formatters.fixedOne(total_ghg_emissions / this.TYPICAL_CAR_EMMISSION)
      };

    },

    getLabelSizes: function(labels) {
      const sizes = [];

      labels.each(function(){
        const pw = this.offsetWidth;
        const cw = this.firstChild.offsetWidth;

        if (pw === 0) return;

        sizes.push({
          elm: this,
          pw,
          cw,
          dirty: cw > pw,
          pct: +(this.style.width.replace('%', ''))
        });
      });

      return sizes;
    },

    adjSizes: function(labels, ct) {
      const sizes = this.getLabelSizes(labels);

      if (!sizes.length) return;

      let ctr = ct || 0;
      ctr += 1;
      if (ctr > 100) return;

      const dirty = _.findIndex(sizes, d => d.dirty);

      if (dirty > -1) {
        const available = sizes.filter(d => !d.dirty);

        let additional = 0;

        available.forEach(d => {
          additional += 1;
          d3.select(d.elm).style('width', (d.pct - 1) + '%');
        });

        d3.select(sizes[dirty].elm).style('width', (sizes[dirty].pct + additional) + '%');

        this.adjSizes(labels, ctr);
      }
    },

    hideLabels: function(labels) {
      const sizes = this.getLabelSizes(labels);
      sizes.forEach(d => {
        if (d.dirty) {
          d3.select(d.elm.firstChild).style('display', 'none');
        }
      });
    },


    fixlabels: function(selector) {
      const chart = d3.select(selector).select('#fuel-use-chart');

      const headerLabels = chart.select('.fc-bars').selectAll('.fc-header');
      this.adjSizes(headerLabels, 0);

      // const emissionBars = chart.select('.emission-bars').selectAll('.fc-bar');
      // this.adjSizes(emissionBars, 0);

      const barLabels = chart.select('.fc-bars').selectAll('.fc-bar');
      this.hideLabels(barLabels);

    },

    render: function(){
      var d = this.chartData();
      return this.template(d);
    }
  });

  return FuelUseView;
});

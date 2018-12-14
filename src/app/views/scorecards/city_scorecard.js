define([
  'jquery',
  'underscore',
  'backbone',
  './charts/fuel',
  './charts/shift',
  './charts/building_type_table',
  'models/building_color_bucket_calculator',
  'text!templates/scorecards/city.html'
], function($, _, Backbone, FuelUseView, ShiftView, BuildingTypeTableView, BuildingColorBucketCalculator, ScorecardTemplate){
  var CityScorecard = Backbone.View.extend({

    initialize: function(options){
      this.state = options.state;
      this.formatters = options.formatters;

      this.parentEl = options.parentEl;

      this.template = _.template(ScorecardTemplate);

      return this;
    },

    events: {
      'click .sc-toggle--input': 'toggleView'
    },

    close: function() {
      // do some house cleaning before being removed
    },

    toggleView: function(evt) {
      evt.preventDefault();

      var scorecardState = this.state.get('scorecard');
      var view = scorecardState.get('view');

      var target = evt.target;
      var value = target.dataset.view;

      if (value === view) {
        return false;
      }

      scorecardState.set({ 'view': value });
    },

    onViewChange: function() {
      this.render();
    },

    render: function() {
      if (!this.state.get('city_report_active')) return;

      if (this.scoreCardData) return this.postRender();

      // load data from carto
      var city = this.state.get('city');
      var scorecardConfig = city.get('scorecard');
      var table = scorecardConfig.citywide.table;

      // Get building data for all years
      d3.json(`https://cityenergy-seattle.carto.com/api/v2/sql?q=SELECT * FROM ${table} WHERE year is not null`, payload => {
        if (!this.state.get('city_report_active')) return;

        if (!payload) {
          console.error('There was an error loading citywide data for the scorecard');
          return;
        }

        var data = {};
        payload.rows.forEach(d => {
          data[d.year] = { ...d };
        });

        this.scoreCardData = data;

        this.postRender();
      });
    },

    postRender: function() {
      this.show('eui');
      this.show('ess');
    },

    validNumber: function(x) {
      return _.isNumber(x) && _.isFinite(x);
    },

    buildingStats: function(data) {
      return {
        reporting: this.formatters.fixedZero(data.reporting),
        required: this.formatters.fixedZero(data.required),
        pct: data.compliance_rate
      };
    },

    compliance: function(data) {
      return {
        consumption: this.formatters.fixedZero(data.total_consump),
        ghg: this.formatters.fixedZero(data.total_emissions),
        gfa: this.formatters.fixedZero(data.total_gfa)
      };
    },

    show: function(view) {
      if (!this.scoreCardData) {
        return console.error('No city scorecard data found');
      }

      var buildings = this.state.get('allbuildings');
      var city = this.state.get('city');
      var years = _.keys(city.get('years')).map(d => +d).sort((a, b) => {
        return a - b;
      });
      var year = this.state.get('year');
      var scorecardConfig = city.get('scorecard');
      var viewSelector = `#${view}-scorecard-view`;
      var el = this.$el.find(viewSelector);
      var compareField = view === 'eui' ? 'med_eui' : 'med_ess';
      var data = this.scoreCardData;

      if (!data.hasOwnProperty(year)) {
        return console.error('No year found in citywide data!');
      }

      el.html(this.template({
        stats: this.buildingStats(data[year]),
        compliance: this.compliance(data[year]),
        year: year,
        view: view,
        value: data[year][compareField]
      }));

      if (!this.chart_fueluse) {
        this.chart_fueluse = new FuelUseView({
          formatters: this.formatters,
          data: data[year],
          isCity: true,
          parent: el[0]
        });
      }

      if (view === 'eui') {
        el.find('#fuel-use-chart').html(this.chart_fueluse.render());
        this.chart_fueluse.fixlabels(viewSelector);
        this.chart_fueluse.afterRender();
      }


      if (!this.chart_shift) {
        var shiftConfig = scorecardConfig.change_chart.city;
        var previousYear = year - 1;
        var hasPreviousYear = years.indexOf(previousYear) > -1;

        const shift_data = hasPreviousYear ? this.extractChangeData(data, shiftConfig) : null;

        this.chart_shift = new ShiftView({
          view,
          formatters: this.formatters,
          data: shift_data,
          no_year: !hasPreviousYear,
          selected_year: year,
          previous_year: previousYear,
          isCity: true
        });
      }

      if (view === 'eui' && this.chart_shift) {
        this.chart_shift.render(t => {
          el.find('#compare-shift-chart').html(t);
        }, viewSelector);
      }

      if (!this.building_table) {
        this.building_table = new BuildingTypeTableView({
          formatters: this.formatters,
          data: buildings,
          year,
          schema: scorecardConfig.thresholds.eui_schema,
          thresholds: scorecardConfig.thresholds.eui
        });
      }

      el.find('#building-type-table').html(this.building_table.render());

      return this;
    },

    extractChangeData: function(data, config) {
      const o = [];

      Object.keys(data).forEach(year => {
        const bldings = data[year];
        config.metrics.forEach(metric => {
          let label = '';
          if (metric.label.charAt(0) === '{') {
            const labelKey = metric.label.replace(/\{|\}/gi, '');
            label = bldings[labelKey];
          } else {
            label = metric.label;
          }

          let value = bldings[metric.field];

          if (!this.validNumber(value)) {
            value = null;
          } else {
            value = +(value.toFixed(1));
          }

          const clr = '#999';

          o.push({
            label,
            field: metric.field,
            value,
            clr,
            year: +year,
            colorize: metric.colorize,
            unit: metric.unit || '',
            influencer: metric.influencer
          });
        });
      });

      return o.sort((a, b) => {
        return a.year - b.year;
      });
    }
  });

  return CityScorecard;
});

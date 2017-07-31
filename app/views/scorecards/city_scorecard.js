'use strict';

define(['jquery', 'underscore', 'backbone', './charts/fuel', './charts/shift', './charts/building_type_table', 'text!templates/scorecards/city.html'], function ($, _, Backbone, FuelUseView, ShiftView, BuildingTypeTableView, ScorecardTemplate) {
  var CityScorecard = Backbone.View.extend({

    initialize: function initialize(options) {
      this.state = options.state;
      this.formatters = options.formatters;

      this.template = _.template(ScorecardTemplate);

      return this;
    },

    events: {
      'click .sc-toggle--input': 'toggleView'
    },

    close: function close() {
      // do some house cleaning before being removed
    },

    toggleView: function toggleView(evt) {
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

    onViewChange: function onViewChange() {
      this.show();
    },

    render: function render() {
      if (!this.state.get('city_report_active')) return;
      this.show();
    },

    buildingStats: function buildingStats(buildings) {
      return {
        reporting: this.formatters.fixedZero(buildings.length),
        required: '???',
        pct: '??'
      };
    },

    compliance: function compliance(buildings) {
      return {
        consumption: this.formatters.fixedZero(d3.sum(buildings.pluck('total_kbtu'))),
        ghg: this.formatters.fixedZero(d3.sum(buildings.pluck('total_ghg_emissions'))),
        gfa: this.formatters.fixedZero(d3.sum(buildings.pluck('reported_gross_floor_area')))
      };
    },

    show: function show() {
      var _this = this;

      var scorecardState = this.state.get('scorecard');
      var buildings = this.state.get('allbuildings');
      var year = this.state.get('year');
      var view = scorecardState.get('view');
      var scorecardConfig = this.state.get('city').get('scorecard');

      var compareField = view === 'eui' ? 'site_eui' : 'energy_star_score';

      this.$el.html(this.template({
        stats: this.buildingStats(buildings),
        compliance: this.compliance(buildings),
        year: year,
        view: view,
        value: this.formatters.fixedOne(d3.median(buildings.pluck(compareField)))
      }));

      if (!this.chart_fueluse) {
        this.chart_fueluse = new FuelUseView({
          formatters: this.formatters,
          data: buildings
        });
      }

      this.$el.find('#fuel-use-chart').html(this.chart_fueluse.render());

      if (!this.chart_shift) {
        this.chart_shift = new ShiftView({
          formatters: this.formatters,
          data: null
        });
      }

      this.chart_shift.render(function (t) {
        _this.$el.find('#compare-shift-chart').html(t);
      });

      if (!this.building_table) {
        this.building_table = new BuildingTypeTableView({
          formatters: this.formatters,
          data: buildings,
          year: year,
          schema: scorecardConfig.thresholds.eui_schema,
          thresholds: scorecardConfig.thresholds.eui
        });
      }

      this.$el.find('#building-type-table').html(this.building_table.render());

      return this;
    }
  });

  return CityScorecard;
});
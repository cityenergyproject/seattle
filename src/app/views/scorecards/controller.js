define([
  'jquery',
  'underscore',
  'backbone',
  './building_scorecard',
  './city_scorecard',
  'text!templates/scorecards/scorecard.html'
], function($, _, Backbone, BuildingScorecard, CityScorecard, ScorecardTemplate){
  const ScorecardController = Backbone.View.extend({
    el: $('#scorecard'),

    initialize: function(options){
      this.state = options.state;

      this.listenTo(this.state, 'change:allbuildings', this.onBuildingsChange);
      this.listenTo(this.state, 'change:report_active', this.onBuildingReportActive);
      this.listenTo(this.state, 'change:city_report_active', this.onCityReportActive);

      const scorecard = this.state.get('scorecard');
      this.listenTo(scorecard, 'change:view', this.onViewChange);

      this.template = _.template(ScorecardTemplate);

      this.formatters = {
        currency: d3.format('$,.2f'),
        currency_zero: d3.format('$,.0f'),
        commaize: d3.format(',.2r'),
        percent: d3.format('.0%'),
        fixed: d3.format(',.2f'),
        fixedOne: d3.format(',.1f'),
        fixedZero: d3.format(',.0f')
      };
    },

    events: {
      'click #back-to-map-link': 'closeReport'
    },

    onBuildingsChange: function() {
      if (this.dirty) this.render();
    },

    onViewChange: function() {
      if (this.view && this.view.onViewChange) this.view.onViewChange();
    },

    onBuildingReportActive: function() {
      this.activekey = 'report_active';
      this.viewclass = BuildingScorecard;
      this.render();
    },

    onCityReportActive: function() {
      this.activekey = 'city_report_active';
      this.viewclass = CityScorecard;
      this.render();
    },

    closeReport: function(evt) {
      evt.preventDefault();
      this.state.set({[this.activekey]: false});
    },

    toggleView: function(evt) {
      evt.preventDefault();

      var scorecardState = this.state.get('scorecard');
      var view = scorecardState.get('view');

      var target = evt.target;
      var value = target.dataset.view;

      if (value === view) {
        evt.preventDefault();
        return false;
      }

      scorecardState.set({'view': value});
    },

    loadView: function(view) {
      this.removeView();
      this.view = view;

      this.view.render();
      // this.$el.find('#scorecard-content').html(view.render());
    },

    removeView: function() {
      if (this.view) {
        this.view.close();
        this.view.remove();
      }
      this.view = null;
    },

    getSubViewOptions: function() {
      return {
        el: '#scorecard-content',
        state: this.state,
        formatters: this.formatters
      };
    },

    showScorecard: function() {
      console.log('---- Show Scorecard ----- ');
      this.$el.toggleClass('active', true);

      const building = this.state.get('building');
      let name;
      if (building) {
        const buildings = this.state.get('allbuildings');
        const buildingModel = buildings.get(building);
        name = buildingModel.get('property_name');
      } else {
        name = 'Citywide Report';
      }

      this.$el.html(this.template({
        building_view: this.viewclass === BuildingScorecard,
        name
      }));

      if (!this.viewclass) return;
      const view = new this.viewclass(this.getSubViewOptions());
      this.loadView(view);
    },

    hideScorecard: function() {
      console.log('---- Hide Scorecard ----- ');
      this.$el.toggleClass('active', false);
      this.removeView();
      this.viewclass = null;
      this.$el.html('');
    },

    render: function(){
      const buildings = this.state.get('allbuildings');
      const active = this.state.get(this.activekey);

      if (active) {
        if (!buildings) {
          this.dirty = true;
          return;
        }
        this.showScorecard();
      } else {
        this.hideScorecard();
      }

      this.dirty = false;

      return this;
    }
  });

  return ScorecardController;
});

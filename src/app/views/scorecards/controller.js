define([
  'jquery',
  'underscore',
  'backbone',
  './building_scorecard',
  './city_scorecard',
  './links',
  'text!templates/scorecards/scorecard.html'
], function($, _, Backbone, BuildingScorecard, CityScorecard, Links, ScorecardTemplate){
  const ScorecardController = Backbone.View.extend({
    el: $('#scorecard'),

    initialize: function(options){
      this.state = options.state;
      this.mapView = options.mapView;

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
        fixedZero: d3.format(',.0f'),
        abbreviate: (n, fmtr) => {
          if (n >= 1000000) {
            return [fmtr(n/1000000), 'million'];
          }

          if (n > 1000) {
            return [fmtr(n/1000), 'thousand'];
          }

          return fmtr(n, '');
        }
      };
    },

    events: {
      'click #back-to-map-link': 'closeReport',
      'click #comparison-view-link': 'showComparisonView',
    },

    onBuildingsChange: function() {
      if (this.dirty) this.render();
    },

    onViewChange: function() {
      this.updateViewClass();
      if (this.view && this.view.onViewChange) this.view.onViewChange();
    },

    updateViewClass: function() {
      var scorecardState = this.state.get('scorecard');
      var view = scorecardState.get('view');

      const klass = `show-${view}-view`;

      this.$el.attr('class', `active ${klass}`);
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

    showComparisonView: function(evt) {
      evt.preventDefault();
      this.state.trigger('clearMapPopup');
      this.state.set({
        [this.activekey]: false,
        building: null,
        building_compare_active: true
      });
    },

    closeReport: function(evt) {
      evt.preventDefault();
      this.state.set({ [this.activekey]: false });
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

      scorecardState.set({ 'view': value });
    },

    loadView: function(view) {
      this.removeView();
      this.view = view;

      this.view.render();
    },

    removeView: function() {
      if (this.view) {
        this.view.close();
        this.view.remove();
      }
      this.view = null;
    },

    getLinksTable: function() {
      const city = this.state.get('city');
      const table = city && city.get && city.get('scorecard');
      return (table && table.links_table) || 'links';
    },

    renderLinks: function(building, building_type, isBuildingRenderer) {
      if (this.linksView) this.removeLinks();

      if (!isBuildingRenderer) return;

      // Add links to parent
      this.linksView = new Links({
        links_table: this.getLinksTable(),
        link_type: building_type,
        building,
        el: this.$el.find('#links')
      });
    },

    removeLinks: function() {
      if (this.linksView) {
        this.linksView.close();
        this.linksView.remove();
      }

      this.linksView = null;
    },

    getSubViewOptions: function() {
      return {
        el: '#scorecard-content',
        state: this.state,
        formatters: this.formatters,
        metricFilters: this.mapView.getControls(),
        parentEl: this.$el
      };
    },

    showScorecard: function() {
      this.$el.toggleClass('active', true);

      const building = this.state.get('building');
      let name;
      let building_type;
      let energy_star_score;
      let comments;
      const isBuildingRenderer = this.viewclass === BuildingScorecard;
      let year;

      if (isBuildingRenderer) {
        year = this.state.get('year');
        const buildings = this.state.get('allbuildings');
        const buildingModel = buildings.get(building);
        name = buildingModel.get('property_name');
        building_type = buildingModel.get('property_type');
        energy_star_score = buildingModel.get('energy_star_score');
        comments = buildingModel.get('comments');
      } else {
        name = 'Citywide Report';
        building_type = 'citywide';
      }

      this.$el.html(this.template({
        building_view: this.viewclass === BuildingScorecard,
        comments,
        name,
        energy_star_score,
        year
      }));

      this.renderLinks(building, building_type, isBuildingRenderer);

      this.updateViewClass();

      if (!this.viewclass) return;
      const view = new this.viewclass(this.getSubViewOptions());
      this.loadView(view);
    },

    hideScorecard: function() {
      this.$el.toggleClass('active', false);
      this.removeLinks();
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

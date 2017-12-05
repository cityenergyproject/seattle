'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

define(['jquery', 'underscore', 'backbone', './building_scorecard', './city_scorecard', './links', 'text!templates/scorecards/scorecard.html'], function ($, _, Backbone, BuildingScorecard, CityScorecard, Links, ScorecardTemplate) {
  var ScorecardController = Backbone.View.extend({
    el: $('#scorecard'),

    initialize: function initialize(options) {
      this.state = options.state;
      this.mapView = options.mapView;

      this.listenTo(this.state, 'change:allbuildings', this.onBuildingsChange);
      this.listenTo(this.state, 'change:report_active', this.onBuildingReportActive);
      this.listenTo(this.state, 'change:city_report_active', this.onCityReportActive);

      var scorecard = this.state.get('scorecard');
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
        abbreviate: function abbreviate(n, fmtr) {
          if (n >= 1000000) {
            return [fmtr(n / 1000000), 'million'];
          }

          if (n > 1000) {
            return [fmtr(n / 1000), 'thousand'];
          }

          return fmtr(n, '');
        }
      };
    },

    events: {
      'click #back-to-map-link': 'closeReport',
      'click #comparison-view-link': 'showComparisonView'
    },

    onBuildingsChange: function onBuildingsChange() {
      if (this.dirty) this.render();
    },

    onViewChange: function onViewChange() {
      this.updateViewClass();
      if (this.view && this.view.onViewChange) this.view.onViewChange();
    },

    updateViewClass: function updateViewClass() {
      var scorecardState = this.state.get('scorecard');
      var view = scorecardState.get('view');

      var klass = 'show-' + view + '-view';

      this.$el.attr('class', 'active ' + klass);
    },

    onBuildingReportActive: function onBuildingReportActive() {
      this.activekey = 'report_active';
      this.viewclass = BuildingScorecard;
      this.render();
    },

    onCityReportActive: function onCityReportActive() {
      this.activekey = 'city_report_active';
      this.viewclass = CityScorecard;
      this.render();
    },

    showComparisonView: function showComparisonView(evt) {
      var _state$set;

      evt.preventDefault();
      this.state.trigger('clearMapPopup');
      this.state.set((_state$set = {}, _defineProperty(_state$set, this.activekey, false), _defineProperty(_state$set, 'building', null), _defineProperty(_state$set, 'building_compare_active', true), _state$set));
    },

    closeReport: function closeReport(evt) {
      evt.preventDefault();
      this.state.set(_defineProperty({}, this.activekey, false));
    },

    toggleView: function toggleView(evt) {
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

    loadView: function loadView(view) {
      this.removeView();
      this.view = view;

      this.view.render();
    },

    removeView: function removeView() {
      if (this.view) {
        this.view.close();
        this.view.remove();
      }
      this.view = null;
    },

    renderLinks: function renderLinks(building, building_type, isBuildingRenderer) {
      if (this.linksView) this.removeLinks();

      if (!isBuildingRenderer) return;
      // Add links to parent
      this.linksView = new Links({
        link_type: building_type,
        building: building,
        el: this.$el.find('#links')
      });
    },

    removeLinks: function removeLinks() {
      if (this.linksView) {
        this.linksView.close();
        this.linksView.remove();
      }

      this.linksView = null;
    },

    getSubViewOptions: function getSubViewOptions() {
      return {
        el: '#scorecard-content',
        state: this.state,
        formatters: this.formatters,
        metricFilters: this.mapView.getControls(),
        parentEl: this.$el
      };
    },

    showScorecard: function showScorecard() {
      this.$el.toggleClass('active', true);

      var building = this.state.get('building');
      var name = void 0;
      var building_type = void 0;
      var isBuildingRenderer = this.viewclass === BuildingScorecard;

      if (isBuildingRenderer) {
        var buildings = this.state.get('allbuildings');
        var buildingModel = buildings.get(building);
        name = buildingModel.get('property_name');
        building_type = buildingModel.get('property_type');
      } else {
        name = 'Citywide Report';
        building_type = 'citywide';
      }

      this.$el.html(this.template({
        building_view: this.viewclass === BuildingScorecard,
        name: name
      }));

      this.renderLinks(building, building_type, isBuildingRenderer);

      this.updateViewClass();

      if (!this.viewclass) return;
      var view = new this.viewclass(this.getSubViewOptions());
      this.loadView(view);
    },

    hideScorecard: function hideScorecard() {
      this.$el.toggleClass('active', false);
      this.removeLinks();
      this.removeView();
      this.viewclass = null;
      this.$el.html('');
    },

    render: function render() {
      var buildings = this.state.get('allbuildings');
      var active = this.state.get(this.activekey);

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
'use strict';

define(['jquery', 'underscore', 'backbone', 'd3'], function ($, _, Backbone, D3) {

  var ScoreCardBaseView = Backbone.View.extend({
    el: $('#scorecard'),

    extendableProperties: {
      "events": "defaults",
      "className": function className(propertyName, prototypeValue) {
        this[propertyName] += " " + prototypeValue;
      }
    },

    extendProperties: function extendProperties(properties) {
      var propertyName, prototypeValue, extendMethod;
      var prototype = this.constructor.prototype;

      while (prototype) {
        for (propertyName in properties) {
          if (properties.hasOwnProperty(propertyName) && prototype.hasOwnProperty(propertyName)) {
            prototypeValue = _.result(prototype, propertyName);
            extendMethod = properties[propertyName];
            if (!this.hasOwnProperty(propertyName)) {
              this[propertyName] = prototypeValue;
            } else if (_.isFunction(extendMethod)) {
              extendMethod.call(this, propertyName, prototypeValue);
            } else if (extendMethod === "defaults") {
              _.defaults(this[propertyName], prototypeValue);
            }
          }
        }
        prototype = prototype.constructor.__super__;
      }
    },

    constructor: function constructor() {
      if (this.extendableProperties) {
        // First, extend the extendableProperties by collecting all the extendable properties
        // defined by classes in the prototype chain.
        this.extendProperties({ "extendableProperties": "defaults" });

        // Now, extend all the properties defined in the final extendableProperties object
        this.extendProperties(this.extendableProperties);
      }

      Backbone.View.apply(this, arguments);
    },

    initialize: function initialize(options) {
      console.log("SCORE");
      this.state = options.state;

      this.formatters = {
        currency: d3.format('$,.2f'),
        currency_zero: d3.format('$,.0f'),
        commaize: d3.format(',.2r'),
        percent: d3.format('.0%'),
        fixed: d3.format(',.2f'),
        fixedOne: d3.format(',.1f'),
        fixedZero: d3.format(',.0f')
      };

      return this;
    },

    events: {
      "click #back-to-map-link": "closeReport",
      "click #comparison-view-link": "showComparisonView",
      "click .sc-toggle--input": "toggleView"
    },

    showComparisonView: function showComparisonView(evt) {
      console.log('********* Comparison View');
      evt.preventDefault();
      this.close();
      this.state.set({ building_compare_active: true });
    },

    closeReport: function closeReport(evt) {
      evt.preventDefault();
      this.close();
    },

    onReportActive: function onReportActive() {
      this.render();
    },

    toggleView: function toggleView(evt) {
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

    close: function close() {
      console.warn('Overwrite this method!!!!');
    },

    renderScorecard: function renderScorecard() {
      console.warn('Overwrite this method!!!!');
    },

    isActive: function isActive() {
      console.warn('Overwrite this method!!!!');
    },

    render: function render() {
      var active = this.isActive();
      var buildings = this.state.get('allbuildings');

      if (active) {
        if (!buildings) {
          this.dirty = true;
          return;
        }

        this.$el.toggleClass('active', true);
        this.renderScorecard();
      } else {
        this.$el.toggleClass('active', false);
        this.$el.html('');
      }

      this.dirty = false;

      return this;
    }
  });

  return ScoreCardBaseView;
});
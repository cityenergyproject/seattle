'use strict';

define(['jquery', 'underscore', 'backbone', 'text!templates/map/year_control.html'], function ($, _, Backbone, YearControlTemplate) {

  var YearControlView = Backbone.View.extend({
    $container: $('#year-select'),
    className: "year-control",

    initialize: function initialize(options) {
      this.state = options.state;
      this.listenTo(this.state, 'change:city', this.onCityChange);
    },

    onCityChange: function onCityChange() {
      this.listenTo(this.state.get('city'), 'sync', this.onCitySync);
    },

    onCitySync: function onCitySync() {
      this.render();
    },

    render: function render() {
      var city = this.state.get('city');

      this.$el.appendTo(this.$container);

      var template = _.template(YearControlTemplate);
      this.$el.html(template({
        years: _.keys(city.get('years')),
        current_year: this.state.get('year')
      }));

      return this;
    },

    events: {
      'change input': 'selectYear'
    },

    selectYear: function selectYear(event) {
      var year = $(event.target).val();
      this.state.set({ year: year });
    }
  });

  return YearControlView;
});
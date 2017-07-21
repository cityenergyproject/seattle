define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/layout/scorecards/city_scorecard.html'
], function($, _, Backbone, D3, ScorecardTemplate){

  var CityScorecard = Backbone.View.extend({
    el: $('#scorecard'),

    initialize: function(options){
      this.state = options.state;
      this.template = _.template(ScorecardTemplate);

      var scorecard = this.state.get('scorecard');

      // this.render();
      return this;
    },

    events: {},

    getData: function() {
      var year = this.state.get('year');
    },

    render: function() {
      this.$el.html(this.template({
        year: '2015',
        view: 'eui',
        value: '13.3'
      }));
      return this;
    },
  });

  return CityScorecard;
});

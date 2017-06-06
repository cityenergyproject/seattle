define([
  'backbone',
], function(Backbone) {
  var Scorecard = Backbone.Model.extend({
    defaults: {
      view: 'eui'
    }
  });

  return Scorecard;
});
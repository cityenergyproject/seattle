'use strict';

define(['backbone'], function (Backbone) {
  var Scorecard = Backbone.Model.extend({
    defaults: {
      view: 'eui',
      active: false
    }
  });

  return Scorecard;
});
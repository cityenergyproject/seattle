'use strict';

define(['jquery', 'underscore', 'backbone', 'router'], function ($, _, Backbone, Router) {
  var initialize = function initialize() {
    new Router();
    Backbone.history.start();
  };

  return {
    initialize: initialize
  };
});
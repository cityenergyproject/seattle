'use strict';

define(['backbone'], function (Backbone) {
  var City = Backbone.Model.extend({
    url: function url() {
      return "cities/" + this.get('url_name') + ".json";
    }
  });

  return City;
});
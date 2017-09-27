'use strict';

define(['jquery', 'underscore', 'backbone', 'text!templates/scorecards/charts/list.html'], function ($, _, Backbone, ListTemplate) {

  var ListView = Backbone.View.extend({
    className: 'list-view',

    initialize: function initialize(options) {
      this.template = _.template(ListTemplate);
      this.formatters = options.formatters;
      this.building = options.building;
      this.config = options.config;
    },

    validNumber: function validNumber(x) {
      return _.isNumber(x) && _.isFinite(x);
    },

    getValue: function getValue(building, item) {
      var val = building.hasOwnProperty(item.field) ? building[item.field] : null;
      if (val === null) return 'n/a';
      if (!item.fmtr) {
        val = val + '';
        if (val.length === 0) return 'n/a';
        return val;
      }

      if (!this.validNumber(+val)) return 'n/a';
      if (!this.formatters.hasOwnProperty(item.fmtr)) return val;

      return this.formatters[item.fmtr](+val);
    },

    listdata: function listdata(building, items) {
      var _this = this;

      return items.map(function (item) {
        var o = {};
        o.label = item.label;
        o.rows = item.fields.map(function (f) {
          return {
            label: f.label,
            val: _this.getValue(building, f)
          };
        });

        return o;
      });
    },

    render: function render(cb) {
      cb(this.template({
        list_info: this.listdata(this.building, this.config)
      }));
    }
  });

  return ListView;
});
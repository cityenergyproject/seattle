define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/scorecards/charts/list.html'
], function($, _, Backbone, ListTemplate){
  var ListView = Backbone.View.extend({
    className: 'list-view',

    initialize: function(options){
      this.template = _.template(ListTemplate);
      this.formatters = options.formatters;
      this.building = options.building;
      this.config = options.config;
    },

    validNumber: function(x) {
      return _.isNumber(x) && _.isFinite(x);
    },

    getValue: function(building, item) {
      let val = building.hasOwnProperty(item.field) ? building[item.field] : null;
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

    listdata: function(building, items) {
      return items.map(item => {
        const o = {};
        o.label = item.label;
        o.rows = item.fields.map(f => {
          return {
            label: f.label,
            val: this.getValue(building, f)
          };
        });


        return o;
      });
    },

    render: function(cb){
      cb(this.template({
        list_info: this.listdata(this.building, this.config)
      }));
    }
  });

  return ListView;
});

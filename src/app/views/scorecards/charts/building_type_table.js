define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/scorecards/charts/building_type_table.html'
], function($, _, Backbone, d3, TableTemplate){

  var BuildingTypeTableView = Backbone.View.extend({
    className: 'building-type-table',

    initialize: function(options){
      this.template = _.template(TableTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.year = options.year;

    },

    defaultRow: function() {
      return {
        site_eui: [],
        year_built: [],
        size: [],
        ess: [],
        ct: 0
      };
    },

    computeRows: function() {
      // const types = _.uniq(this.data.pluck('property_type'));
      const types = {};
      this.data.forEach(building => {
        const year = +building.get('year');
        if (this.year != year) return;

        const typ = building.get('property_type');
        const site_eui = building.get('site_eui');
        const built = building.get('yearbuilt');
        const ess = building.get('energy_star_score');
        const size = building.get('reported_gross_floor_area');

        if (!types.hasOwnProperty(typ)) {
          types[typ] = this.defaultRow();
        }

        types[typ].site_eui.push(site_eui);
        types[typ].size.push(size);
        types[typ].ess.push(ess);
        types[typ].year_built.push(built);
        types[typ].ct++;
      });

      return Object.keys(types).map(key => {
        const row = types[key];

        return {
          label: key,
          count: this.formatters.commaize(row.ct),
          site_eui: this.formatters.fixedOne(d3.median(row.site_eui)),
          built: d3.median(row.year_built).toFixed(0),
          size: this.formatters.commaize(d3.median(row.size)),
          ess: d3.median(row.ess)
        };
      });
    },

    render: function(){
      const rows = this.computeRows();
      return this.template({
        year: this.year,
        rows
      });
    }
  });

  return BuildingTypeTableView;
});

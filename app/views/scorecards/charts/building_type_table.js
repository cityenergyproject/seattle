'use strict';

define(['jquery', 'underscore', 'backbone', 'd3', 'text!templates/scorecards/charts/building_type_table.html'], function ($, _, Backbone, d3, TableTemplate) {

  var BuildingTypeTableView = Backbone.View.extend({
    className: 'building-type-table',

    initialize: function initialize(options) {
      this.template = _.template(TableTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.year = options.year;
    },

    defaultRow: function defaultRow() {
      return {
        site_eui: [],
        year_built: [],
        size: [],
        ess: [],
        ct: 0
      };
    },

    computeRows: function computeRows() {
      var _this = this;

      // const types = _.uniq(this.data.pluck('property_type'));
      var types = {};
      this.data.forEach(function (building) {
        var year = +building.get('year');
        if (_this.year != year) return;

        var typ = building.get('property_type');
        var site_eui = building.get('site_eui');
        var built = building.get('yearbuilt');
        var ess = building.get('energy_star_score');
        var size = building.get('reported_gross_floor_area');

        if (!types.hasOwnProperty(typ)) {
          types[typ] = _this.defaultRow();
        }

        types[typ].site_eui.push(site_eui);
        types[typ].size.push(size);
        types[typ].ess.push(ess);
        types[typ].year_built.push(built);
        types[typ].ct++;
      });

      return Object.keys(types).map(function (key) {
        var row = types[key];

        return {
          label: key,
          count: _this.formatters.commaize(row.ct),
          site_eui: _this.formatters.fixedOne(d3.median(row.site_eui)),
          built: d3.median(row.year_built).toFixed(0),
          size: _this.formatters.commaize(d3.median(row.size)),
          ess: d3.median(row.ess)
        };
      });
    },

    render: function render() {
      var rows = this.computeRows();
      return this.template({
        year: this.year,
        rows: rows
      });
    }
  });

  return BuildingTypeTableView;
});
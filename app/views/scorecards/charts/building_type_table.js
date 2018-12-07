'use strict';

define(['jquery', 'underscore', 'backbone', 'd3', 'text!templates/scorecards/charts/building_type_table.html'], function ($, _, Backbone, d3, TableTemplate) {
  var ORDINALS = ['1st', '2nd', '3rd', '4th'];

  var BuildingTypeTableView = Backbone.View.extend({
    className: 'building-type-table',

    initialize: function initialize(options) {
      this.template = _.template(TableTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.year = options.year;
      this.thresholds = options.thresholds;
      this.schema = options.schema;
    },

    defaultRow: function defaultRow() {
      return {
        site_eui: [],
        year_built: [],
        thresholds: [],
        size: [],
        ess: [],
        ct: 0
      };
    },

    getThresholds: function getThresholds(typ, schema) {
      var _this = this;

      var thresholds = this.thresholds[typ] ? this.thresholds[typ][this.year] : null;

      return this.schema.map(function (d, i) {
        var clr = d.color;
        var val = void 0;

        if (!thresholds) {
          return {
            clr: null,
            val: 'n/a'
          };
        }

        if (i === 0) {
          val = '<' + _this.formatters.fixedZero(thresholds[0]);
        } else if (_this.schema[i + 1]) {
          var left = _this.formatters.fixedZero(thresholds[i - 1]);
          var right = _this.formatters.fixedZero(thresholds[i] - 1);
          val = '\u2265' + left + '-' + right;
        } else {
          val = '\u2265' + _this.formatters.fixedZero(thresholds[thresholds.length - 1]);
        }

        return {
          clr: clr,
          val: val
        };
      });
    },

    getThresholdHeaders: function getThresholdHeaders() {
      return this.schema.map(function (d, i) {
        return {
          clr: d.color,
          label: d.label.replace(' ', '-<br>') + ' Use',
          quartile: ORDINALS[i] + ' Quartile'
        };
      });
    },

    computeRows: function computeRows() {
      var _this2 = this;

      // const types = _.uniq(this.data.pluck('property_type'));
      var types = {};
      this.data.forEach(function (building) {
        var year = +building.get('year');
        if (_this2.year != year) return;

        var typ = building.get('property_type');
        var site_eui = building.get('site_eui');
        var built = building.get('yearbuilt');
        var ess = building.get('energy_star_score');
        var size = building.get('reported_gross_floor_area');

        if (!types.hasOwnProperty(typ)) {
          types[typ] = _this2.defaultRow();
          types[typ].thresholds = _this2.getThresholds(typ);
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
          thresholds: row.thresholds,
          count: _this2.formatters.commaize(row.ct),
          site_eui: _this2.formatters.fixedOne(d3.median(row.site_eui)),
          built: d3.median(row.year_built).toFixed(0),
          size: _this2.formatters.commaize(d3.median(row.size)),
          ess: d3.median(row.ess)
        };
      });
    },

    render: function render() {
      var rows = this.computeRows();

      rows.sort(function (a, b) {
        return d3.ascending(a.label, b.label);
      });

      return this.template({
        year: this.year,
        threshold_headers: this.getThresholdHeaders(),
        rows: rows
      });
    }
  });

  return BuildingTypeTableView;
});
'use strict';

define(['jquery', 'underscore', 'backbone', 'd3', 'text!templates/scorecards/links.html'], function ($, _, Backbone, d3, LinksTemplate) {
  var LinksView = Backbone.View.extend({
    initialize: function initialize(options) {
      this.template = _.template(LinksTemplate);
      this.el = options.el;
      this.link_type = options.link_type;
      this.active = true;

      this.load();
    },

    close: function close() {
      this.active = false;
      this.el.html('');
      this.el = null;
    },

    active: function active(x) {
      this.active = x;
    },

    format: function format(data) {
      var slots = [1, 2, 3];
      // building_type', 'ad_href', 'ad_img',
      var keys = {
        header: 'link{s}_header',
        link_href: 'link{s}_link_href',
        link_txt: 'link{s}_link_txt',
        txt: 'link{s}_txt'
      };

      var linkKeys = Object.keys(keys);
      var formatted = {};

      formatted.ad_href = data.ad_href;
      formatted.property_type = data.property_type;
      formatted.ad_img = data.ad_img;

      formatted.links = slots.map(function (s) {
        var l = {};
        var valid = false;

        linkKeys.forEach(function (k) {
          var field = keys[k].replace('{s}', s);
          if (!data.hasOwnProperty(field)) return;

          l[k] = data[field];

          // Validity check only on header
          if (k === 'header') {
            valid = _.isString(l[k]) && l[k].length > 3;
          }
        });

        if (!valid) return null;

        return l;
      }).filter(function (d) {
        return d !== null;
      });

      formatted.error = null;

      return formatted;
    },

    getRow: function getRow(data) {
      var _this = this;

      if (!data.length) return null;

      var row = data.find(function (d) {
        return d.property_type === _this.link_type;
      });

      if (row) return this.format(row);

      row = data.find(function (d) {
        return d.property_type === 'default';
      });

      if (row) return this.format(row);

      return null;
    },

    url: function url() {
      // TODO: set dynamically from config
      var table = 'links';
      var where = ['WHERE (property_type <> \'\') is true', 'property_type in (\'' + this.link_type + '\', \'default\')'].join(' AND ');

      var base = 'https://cityenergy-seattle.carto.com/api/v2/sql?q=SELECT * FROM ' + table;
      return base + ' ' + where;
    },

    load: function load() {
      var _this2 = this;

      // Load link data
      d3.json(this.url(), function (payload) {
        if (!_this2.active) return;

        if (!payload) {
          console.error('There was an error loading link data for the scorecard');
          return;
        }

        var data = _this2.getRow(payload.rows || []);

        if (!data || !Array.isArray(data.links)) {
          data = {
            error: 'Could not load links at this time',
            links: []
          };
        }

        _this2.render(data);
      });
    },

    render: function render(data) {
      this.el.html(this.template(data));
    }
  });

  return LinksView;
});
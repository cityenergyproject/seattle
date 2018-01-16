define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/scorecards/links.html'
], function($, _, Backbone, d3, LinksTemplate){
  var LinksView = Backbone.View.extend({
    initialize: function(options){
      this.template = _.template(LinksTemplate);
      this.el = options.el;
      this.link_type = options.link_type;
      this.links_table = options.links_table;
      this.building = _.isFinite(options.building) ? +options.building : -1;
      this.active = true;
      this.load();
    },

    close: function() {
      this.active = false;
      this.el.html('');
      this.el = null;
    },

    active: function(x) {
      this.active = x;
    },

    format: function(data) {
      const slots = [1, 2, 3];
      // building_type', 'ad_href', 'ad_img',
      const keys = {
        header: 'link{s}_header',
        link_href: 'link{s}_link_href',
        link_txt: 'link{s}_link_txt',
        txt: 'link{s}_txt'
      };

      const linkKeys = Object.keys(keys);
      const formatted = {};

      formatted.ad_href = data.ad_href;
      formatted.property_type = data.property_type;
      formatted.ad_img = data.ad_img;

      formatted.links = slots.map(s => {
        const l = {};
        let valid = false;

        linkKeys.forEach(k => {
          const field = keys[k].replace('{s}', s);
          if (!data.hasOwnProperty(field)) return;

          l[k] = data[field];

          // Validity check only on header
          if (k === 'header') {
            valid = _.isString(l[k]) && l[k].length > 3;
          }
        });

        if (!valid) return null;

        return l;
      }).filter(d => d !== null);

      formatted.error = null;

      return formatted;
    },

    getRow: function(data) {
      if (!data.length) return null;
      let row;

      // Look for a match on "building id" first
      row = data.find(d => {
        return d.building_id === this.building;
      });

      if (row) return this.format(row);

      // Try "property type" next
      row = data.find(d => {
        return d.property_type === this.link_type;
      });

      if (row) return this.format(row);

      // Lastly use the default
      row = data.find(d => {
        return d.property_type === 'default';
      });

      if (row) return this.format(row);

      return null;
    },

    url: function() {
      const table = this.links_table;
      const id = this.building;
      const where = [
        `property_type in ('${this.link_type}', 'default')`,
        `building_id = ${this.building}`
      ].join(' OR ');

      const base = 'https://cityenergy-seattle.carto.com/api/v2/sql?q=';
      const query = `SELECT * FROM ${table} WHERE ${where}`;

      return base + query;
    },

    load: function() {
      // Load link data
      d3.json(this.url(), payload => {
        if (!this.active) return;

        if (!payload) {
          console.error('There was an error loading link data for the scorecard');
          return;
        }

        let data = this.getRow(payload.rows || []);

        if (!data || !Array.isArray(data.links)) {
          data = {
            error: 'Could not load links at this time',
            links: []
          };
        }

        this.render(data);
      });
    },

    render: function(data) {
      this.el.html(this.template(data));
    }
  });

  return LinksView;
});

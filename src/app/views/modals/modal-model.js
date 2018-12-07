define([
  'backbone',
  'd3'
], function(Backbone, d3) {
  const Modals = Backbone.Model.extend({
    defaults: {
      selected: null,
      cache: {},
      viewdata: null
    },

    url: function(props) {
      if (props.tablename) return this.cartoUrl(props.tablename);
      if (props.file) return `constants/${props.file}`;
      return null;
    },

    cartoUrl: tablename => {
      return `https://cityenergy-seattle.carto.com/api/v2/sql?q=select * from ${tablename} WHERE active=true&format=csv`;
    },

    modalProps: function() {
      const available = this.get('available');
      const selected = this.get('selected');
      return available[selected] || {};
    },

    wrapBreaks: function(txt) {
      return txt.split('<br>').map(d => {
        return `<p>${d}</p>`;
      }).join('');
    },

    parse: function(rows, reflinks) {
      if (!reflinks) {
        return rows.map(row => {
          return [row.question.trim(), this.wrapBreaks(row.answer.trim())];
        });
      }

      return rows.map(row => {
        if (row.ref_link && row.ref_link.length > 5) {
          const moreinfo = '<a class="link-ref" href="' + row.ref_link.trim() + '" target="_blank">Reference Link</a>';

          const definition = row.definition.trim() + moreinfo;
          return [row.term.trim(), definition];
        }

        return [row.term.trim(), row.definition.trim()];
      });
    },

    fetchViewData: function() {
      const selected = this.get('selected');
      const available = this.get('available');

      if (selected === null) {
        this.set({
          viewdata: null
        });

        return this;
      }

      const cache = this.get('cache');
      if (cache[selected]) {
        this.set({
          viewdata: cache[selected]
        });

        return this;
      }

      // Fail silently if not available
      if (!available.hasOwnProperty(selected)) return this;

      const props = available[selected];
      const url = this.url(props);

      if (url === null) {
        console.error(`No valid url for ${selected} modal`);
        return this;
      }

      d3.text(url, payload => {
        if (!payload) {
          console.error(`No modal data for (${selected})`);
          return this;
        }

        const rows = this.parse(d3.csv.parse(payload), props.reflinks);

        this.set({
          cache: _.extend(cache, {[selected]: rows}),
          viewdata: rows
        });
      });
    }
  });

  return Modals;
});

define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/map_controls/counts.html',
  'text!templates/map_controls/compare_bar.html',
], function($, _, Backbone, MapControlsCountTemplate, MapControlsBarTemplate){
  var MapControlsFooter = Backbone.View.extend({

    initialize: function(options){
      this.state = options.state;
      this.templateCounts = _.template(MapControlsCountTemplate);
      this.templateBar = _.template(MapControlsBarTemplate);

      this.$elCounts = $('#map-controls-counts');
      this.$elBar = $('#map-controls-bar');
      this.$applyTo = $('.main-container');

      var onRenderDebounce = _.debounce(_.bind(this.render, this), 150);
      this.listenTo(this.state, 'change:building_compare_active', this.onCompareChange );
      this.listenTo(this.state, 'change:filters', onRenderDebounce  );
      this.listenTo(this.state, 'change:categories', onRenderDebounce );
      this.listenTo(this.state, 'change:allbuildings', this.render);

      this.render();
    },

    events: {
      'click .toggle': 'onBarClick'
    },

    onCompareChange: function() {
      console.log('onCompareChange: ');
      var mode = this.state.get('building_compare_active');

      this.$applyTo.toggleClass('compare-mode', mode);
    },

    onBarClick: function(evt) {
      evt.preventDefault();
      var mode = this.state.get('building_compare_active');
      this.state.set({building_compare_active: !mode});
    },

    getCountContent: function() {
      var o = {
        showing: 0,
        total: 0
      };

      var buildings = this.state.get('allbuildings');
      if (!buildings) return o;
      var filteredBuildings = buildings.toFilter(buildings, this.state.get('categories'), this.state.get('filters'));

      o.showing = filteredBuildings.length;
      o.total = buildings.length;

      console.log(o);

      return this.templateCounts(o);
    },

    render: function(){
      var contentCounts = this.getCountContent();

      this.$elCounts.html(contentCounts);
      this.$elBar.html(this.templateBar());
      return this;
    }
  });

  return MapControlsFooter;
});

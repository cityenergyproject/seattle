define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/layout/compare_bar.html',
], function($, _, Backbone, CompareBarTemplate){
  var CompareBar = Backbone.View.extend({
    el: $('#map-controls-bar'),

    initialize: function(options){
      this.state = options.state;
      this.template = _.template(CompareBarTemplate);

      this.$applyTo = $('.main-container');

      this.listenTo(this.state, 'change:building_compare_active', this.onCompareChange );
      this.listenTo(this.state, 'change:allbuildings', this.render);
      this.listenTo(this.state, 'change:selected_buildings', this.render);

      this.render();
    },

    events: {
      'click .toggle': 'onBarClickHandler',
      'click .close': 'onCloseHandler'
    },

    onCompareChange: function() {
      var mode = this.state.get('building_compare_active');
      this.$applyTo.toggleClass('compare-mode', mode);
    },

    onBarClickHandler: function(evt) {
      evt.preventDefault();
      var mode = this.state.get('building_compare_active');
      this.state.set({building_compare_active: !mode});
    },

    onCloseHandler: function(evt) {
      evt.preventDefault();

      var target = evt.target;

      if (target && target.dataset.id) {
        var id = +target.dataset.id;
        var selected_buildings = this.state.get('selected_buildings') || [];

        var filtered = selected_buildings.filter(function(building){
          return building.id !== id;
        });

        this.state.set({selected_buildings: filtered});
      }
    },

    getContent: function() {
      var o = {
        compares: Array.apply(null, Array(5)).map(function () {})
      };

      var selected_buildings = this.state.get('selected_buildings') || [];


      var buildings = this.state.get('allbuildings');
      if (!buildings) return this.template(o);

      var len = buildings.length - 1;
      selected_buildings.forEach(function(building, i){
        var model = buildings.get(building.id);

        if (!model) return;

        o.compares.splice(i, 1, {
          name: model.get('property_name'),
          id: building.id
        });
      });

      return this.template(o)
    },

    render: function(){
      this.$el.html(this.getContent());

      return this;
    }
  });

  return CompareBar;
});

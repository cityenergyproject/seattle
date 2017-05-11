define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/layout/scorecard.html'
], function($, _, Backbone, ScorecardTemplate){
  var Scorecard = Backbone.View.extend({
    initialize: function(options){
      this.state = options.state;
      this.listenTo(this.state, 'change:allbuildings', this.onBuildings);
      this.template = _.template(ScorecardTemplate);
      this.render();
    },

    full_address: function(building) {
      var zip = building.get('zip');
      var state = building.get('state');
      var city = building.get('city');
      var addr = building.get('reported_address');

      return addr + ', ' + city + ' ' + state + ' ' + zip;
    },

    onBuildings: function() {
      var buildings = this.state.get('allbuildings');
      var rid = Math.floor(Math.random() * 1000) + 1;
      var building = buildings.at(rid);

      var name = building.get('property_name');
      var address = this.full_address(building);
      var sqft = +(building.get('reported_gross_floor_area'));
      var prop_type = building.get('property_type');
      var id = building.get('id');
      var eui = building.get('site_eui');

      console.log(building);
      $('#scorecard').html(this.template({
        name: name,
        addr: address,
        sqft: sqft.toLocaleString(),
        type: prop_type,
        id: id,
        year: 2015,
        eui: eui
      }));
    },

    render: function(){
      return this;
    }
  });

  return Scorecard;
});

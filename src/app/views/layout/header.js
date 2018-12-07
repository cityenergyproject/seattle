define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/layout/header.html'
], function($, _, Backbone, HeaderTemplate){
  var Header = Backbone.View.extend({
    initialize: function(options){
      this.state = options.state;
      this.template = _.template(HeaderTemplate);
      this.listenTo(this.state, 'change:city', this.onCityChange);
    },
    onCityChange: function(){
      this.listenTo(this.state.get('city'), 'sync', this.render);
    },
    render: function(){
      var city = this.state.get('city');
      var name = city.get('name');
      var url_name = city.get('url_name');
      var logo_link = city.get('logo_link_url');
      var banner_images = city.get('header_banner_images');

      document.title = name;

      $('#title').html(this.template({url_name: url_name, title: name, logo_link: logo_link, banner_images: banner_images}));
      return this;
    }
  });

  return Header;
});

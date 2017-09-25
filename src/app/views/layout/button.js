define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/layout/button.html'
], function($, _, Backbone, Template){
  var Button = Backbone.View.extend({

    initialize: function(options){
      this.onClick = options.onClick;
      this.value = options.value;
      this.template = _.template(Template);
      this.render();

      return this;
    },

    events: {
      'click .ce-btn': 'onButtonClick'
    },

    onButtonClick: function(evt) {
      evt.preventDefault();
      if (typeof this.onClick === 'function') this.onClick();
    },

    render: function(){
      $(this.$el).html(this.template({value: this.value}));
      return this;
    }
  });

  return Button;
});

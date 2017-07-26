'use strict';

define(['jquery', 'underscore', 'backbone', 'text!templates/layout/button.html'], function ($, _, Backbone, Template) {
  var Button = Backbone.View.extend({

    initialize: function initialize(options) {
      this.onClick = options.onClick;
      this.value = options.value;
      this.template = _.template(Template);
      this.render();

      return this;
    },

    events: {
      'click .ce-btn': 'onButtonClick'
    },

    onButtonClick: function onButtonClick(evt) {
      evt.preventDefault();
      if (typeof this.onClick === 'function') this.onClick();
    },

    render: function render() {
      $(this.$el).html(this.template({ value: this.value }));
      return this;
    }
  });

  return Button;
});
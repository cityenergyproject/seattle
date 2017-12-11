'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

define(['jquery', 'underscore', 'backbone', 'text!templates/layout/footer.html'], function ($, _, Backbone, FooterTemplate) {
  var Footer = Backbone.View.extend({
    el: $('#footer'),

    initialize: function initialize(options) {
      this.state = options.state;
      this.template = _.template(FooterTemplate);

      this.listenTo(this.state, 'change:city', this.render);

      this.render();
    },

    events: {
      'click .modal-link': 'onModalLink'
    },

    getModals: function getModals() {
      var city = this.state.get('city');

      if (!city) return [];

      var modals = city.get('modals');

      if (!modals) return [];

      return Object.keys(modals).map(function (k) {
        return {
          id: k,
          label: modals[k].label || k
        };
      });
    },

    onModalLink: function onModalLink(evt) {
      if (typeof evt.preventDefault === 'function') evt.preventDefault();

      // Since this is a modal link, we need to make sure
      // our handler exists
      var modelFn = this.state.get('setModal');
      if (!(typeof modelFn === 'undefined' ? 'undefined' : _typeof(modelFn)) === 'function') return false;

      modelFn(evt.target.dataset.modal);

      return false;
    },

    render: function render() {
      var modals = this.getModals();
      this.$el.html(this.template({
        modals: modals
      }));
      return this;
    }
  });

  return Footer;
});
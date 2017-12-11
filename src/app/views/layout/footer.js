define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/layout/footer.html'
], function($, _, Backbone, FooterTemplate){
  var Footer = Backbone.View.extend({
    el: $('#footer'),

    initialize: function(options){
      this.state = options.state;
      this.template = _.template(FooterTemplate);

      this.listenTo(this.state, 'change:city', this.render);

      this.render();
    },

    events: {
      'click .modal-link': 'onModalLink'
    },

    getModals: function() {
      const city = this.state.get('city');

      if (!city) return [];

      const modals = city.get('modals');

      if (!modals) return [];

      return Object.keys(modals).map(k => {
        return {
          id: k,
          label: modals[k].label || k
        };
      });
    },

    onModalLink: function(evt) {
      if (typeof evt.preventDefault === 'function') evt.preventDefault();

      // Since this is a modal link, we need to make sure
      // our handler exists
      const modelFn = this.state.get('setModal');
      if (!typeof modelFn === 'function') return false;

      modelFn(evt.target.dataset.modal);

      return false;
    },

    render: function(){
      const modals = this.getModals();
      this.$el.html(this.template({
        modals
      }));
      return this;
    }
  });

  return Footer;
});

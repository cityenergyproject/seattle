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

    getModals: function(city) {
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

    getFooterLinks: function(city) {
      const rsp = {
        about: '/',
        download: '/'
      };

      let footerLinks = city && city.get && city.get('footer');

      if (!footerLinks) footerLinks = {};

      rsp.about = footerLinks.about_link || '/';
      rsp.download = footerLinks.download_link || '/';

      return rsp;
    },

    render: function(){
      const city = this.state.get('city');
      const modals = this.getModals(city);
      const footerLinks = this.getFooterLinks(city);

      this.$el.html(this.template({
        modals,
        footerLinks
      }));

      return this;
    }
  });

  return Footer;
});

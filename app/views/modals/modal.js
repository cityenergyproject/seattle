'use strict';

define(['jquery', 'underscore', 'backbone', 'text!templates/layout/modal.html'], function ($, _, Backbone, ModalTemplate) {
  var ModalController = Backbone.View.extend({
    el: $('#modals'),

    initialize: function initialize(options) {
      this.state = options.state;

      this.listenTo(this.state, 'change:city', this.onCityChange);

      this.template = _.template(ModalTemplate);

      this.bodyEl = $('body');

      return this;
    },

    events: {
      'click #modal-close': 'onModalClose'
    },

    onModalClose: function onModalClose(evt) {
      if (evt.preventDefault) evt.preventDefault();

      this.setModal(null);
    },

    onCityChange: function onCityChange() {
      var model = this.state.get('modal');

      this.listenTo(model, 'change:selected', this.onModalChange);
      this.listenTo(model, 'change:viewdata', this.onViewDataChange);
      this.listenTo(model, 'sync', this.onModalSync, this);
    },

    onModalSync: function onModalSync() {
      // Do nothing here for now
      // const model = this.state.get('modal');
    },

    onModalChange: function onModalChange() {
      var model = this.state.get('modal');
      model.fetchViewData();
    },

    onViewDataChange: function onViewDataChange() {
      var model = this.state.get('modal');
      var viewdata = model.get('viewdata');
      var props = model.modalProps();

      this.render(viewdata, props);
    },

    setModal: function setModal(name) {
      var model = this.state.get('modal');
      var selected = model.get('selected');

      if (name && selected !== name) {
        model.set({
          selected: name
        });
      } else {
        model.set({
          selected: null
        });
      }
    },

    render: function render(data, props) {
      this.$el.toggleClass('active', !!data);
      this.bodyEl.toggleClass('modal-active', !!data);

      if (!data) {
        this.$el.html('');
      } else {
        this.$el.html(this.template({
          rows: data || [],
          title: props.title || '',
          desc: props.desc || ''
        }));
      }

      return this;
    }
  });

  return ModalController;
});
define([
  'jquery',
  'underscore',
  'backbone',  
  'views/layout/tutorial',
  'text!templates/layout/splash_modal.html'
], function($, _, Backbone, Tutorial, SplashTemplate){
  const Splash = Backbone.View.extend({
    el: $('#splash'),

    initialize: function() {
    	this.$el.html(_.template(SplashTemplate));
    	// check the value of the cookie, to know whether to show the splash or not
    	var skip = this.getCookie('skip_tutorial');
    	if (! skip) {
	    	this.render();
    	}
      return this;
    },

    getCookie: function(name) {
			let value = `; ${document.cookie}`;
			let parts = value.split(`; ${name}=`);
			if (parts.length === 2) return parts.pop().split(';').shift();
		},

    events: {
      'click #splash-close': 'onModalClose',
      'click button#skip-tutorial': 'onModalClose',
      'click button#start-tutorial': 'onStartTutorial',
      'change input#opt-in': 'onCheckOptIn'
    },

    onCheckOptIn: function(evt) {
			if (typeof evt.preventDefault === 'function') evt.preventDefault();
			var target = $(evt.target);
      var checked = target.is(':checked');

      // if unchecked, set a cookie to skip this splash screen next time
      if (! checked) {
      	document.cookie = `skip_tutorial=true; path=/; max-age=${60 * 60 * 24 * 365};`;
      } else {
      	// they won't normally even see the checkbox to check it, but 
      	// someone could quickly uncheck and then change their mind before closing the dialog
      	document.cookie = `skip_tutorial=true; path=/; max-age=0;`;
      }
    },

    onStartTutorial: function(evt) {
      if (typeof evt.preventDefault === 'function') evt.preventDefault();
      var tutorial = new Tutorial();
      tutorial.render(0);
      this.$el.hide();
    },

    onModalClose: function(evt) {
      if (evt.preventDefault) evt.preventDefault();
      this.$el.hide();
    },

    render: function() {
      this.$el.show();
      return this;
    }
  });

  return Splash;
});
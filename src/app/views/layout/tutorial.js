define([
  'jquery',
  'underscore',
  'backbone',
  'driver',
], function($, _, Backbone, Driver) {

  var Tutorial = Backbone.View.extend({

  	initialize: function () {
      console.log('INIT');
      // initialize the tutorial, and save the driver object in this scope
      // initTutorial will only be called once, on page load
      this.driverObj = this.initTutorial();
  	},

  	initTutorial: _.once(function() {
  		console.log('ONCE');
			const driver = window.driver.js.driver;

			const driverObj = driver({
			  showProgress: true,
			  allowClose: true,
			  steps: [
			    { element: '#search', popover: { title: 'Title', description: 'Description' } },
			    { element: '#building-prototype-selector', popover: { title: 'Title', description: 'Description' } },
			    { element: '#map', 
			    	popover: { 
			    		title: 'Title', 
			    		description: 'Description',
			        onNextClick: () => {
			          // .. load element dynamically
			          
			          $('input#category-greenhouse-gas-emissions-expanded').click();
			          // .. and then call
			          driverObj.moveNext();
			        }
			      },
		      },
	        { element: '#map-controls-content--inner', popover: { title: 'Title', description: 'Description' } },
			  ]
	  	});

			return driverObj;
  	}),

  	render: function(timeout) {
  		let self = this;
			setTimeout(function() {
				self.driverObj.drive();
			}, timeout);

			return this;
		},

  });

  return Tutorial;
});
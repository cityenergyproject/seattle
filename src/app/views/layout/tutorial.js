define([
  'jquery',
  'underscore',
  'backbone',
  'driver',
], function($, _, Backbone, Driver) {

  var Tutorial = Backbone.View.extend({

  	initialize: function (options) {
      // initialize the tutorial, and save the driver object in this scope
      // initTutorial will only be called once, when initialized through router.js
      this.state = options.state;
      if (! this.state.get('mapview')) {
      	this.state.set({
      		mapview: options.mapView
      	});
      }

      const mapview = this.state.get('mapview');
      this.driverObj = this.initTutorial(mapview);
  	},

  	initTutorial: _.once(function(mapview) {
			const driver = window.driver.js.driver;
      const state = this.state;

			const userlat = state.get('lat');
      const userlng = state.get('lng');
      const userzoom = state.get('zoom');

			const driverObj = driver({
			  showProgress: true,
			  allowClose: true,
			  showButtons: ['next', 'close'],
			  steps: [
			    { element: '#search',
			    	onHighlighted: () => { 
			    		// make sure we have focus
			    		document.querySelector('.driver-popover').focus(); 
			    		// START: make sure we use the default view and deselect everything
			    		$('#back-to-map-link').click();
			    		let citycenter = state.get('city').get('center');
			    		let cityzoom = state.get('city').get('zoom');
							mapview.leafletMap.setView(citycenter, cityzoom);
							state.set({building: null});
							mapview.leafletMap.closePopup();
							mapview.leafletMap.highlightLayer.clearLayers();
			    	},
			    	popover: { 
			    		title: 'Search', 
			    		description: 'Use the Search bar to find a building based on its name, address, or building ID.' 
			    	} 
			    },
			    { element: '#map-category-controls', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Filter buildings', 
			    		description: 'Filter buildings based on criteria like neighborhood, council district or reporting year',
			  			onNextClick: () => {
			  				// Add an image of the menu - this is overall easier to control than selectize
			  				// and we don't have any focus conflicts (see next step)
								$('<img>', {
									src: './images/menu.jpg',
									id: 'proptype-menu-image',
									css: {
										'z-index': 999999,
										'position': 'fixed',
									}
								}).insertAfter('#building-proptype-selector select');

								driverObj.moveNext();
			  			}
			  		} 
			  	},
			    { element: '#proptype-menu-image', 
			    	onHighlighted: () => { 
			    		// This steals focus from the select, 
			    		// which is why we had to add an image of the menu in the previous step
			    		document.querySelector('.driver-popover').focus();
			    	},
			    	popover: { 
			    		title: 'Filter buildings', 
			    		description: 'You can also filter buildings by property type' 
			    	},
			    	onDeselected: () => {
			    		// delete the menu image
			    		$('img#proptype-menu-image').remove();
			    	},
			    },
			    { element: '#total_ghg_emissions', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Map display', 
			    		description: 'The map defaults to displaying greenhouse gas (GHG) emissions; users can toggle between absolute GHG emissions and GHG intensity (emissions per square foot), as shown next. Move the sliders to filter for the highest or lowest emitting buildings.',
			  			onNextClick: () => {
			  				// open the next panel
			  				$('#total_ghg_emissions_intensity').click();
								driverObj.moveNext();
			  			}
			  		} 
			  	},
			    { element: '#total_ghg_emissions_intensity', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Map display', 
			    		description: 'You can also visualize buildings by GHG intensity (i.e. emissions per square foot)',
			        onNextClick: () => {
			          // Collapse the accordion
			          $('input#category-greenhouse-gas-emissions-expanded').click();
			          // Artificially decrease the height of the accordion panel
								$('#map-controls-content--inner').height(150);
			          // .. and then call
			          driverObj.moveNext();
			        }
			      },
		      },
		      { element: '#map-controls-content--inner',
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Map display', 
			    		description: 'Users can choose to display greenhouse gas emissions, energy performance metrics, and property information like square footage. Click on these tabs to minimize or maximize these data options.', 
				    	onNextClick: () => {
				    		// Zoom in so that building footprints are shown
				    		mapview.leafletMap.setView([47.6050418, -122.3299205], 16);
			          driverObj.moveNext();
				    	},
			    	},
			    	onDeselected: () => {
			    		// reopen the accordion, select the first panel
							$('input#category-greenhouse-gas-emissions-expanded').click();
							$('#total_ghg_emissions').click();
							// restore the height of the panels
							$('#map-controls-content--inner').height('100%');
			    	},
		    	},
			    { element: '#map', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Map display', 
			    		description: 'Zooming in will display additional detail about the building location and footprints.',
				    	onNextClick: () => {
				    		// Select a building: has to be in this order for some reason
				    		state.set({selected_buildings: [{id: '357', selected: true, insertedAt: Date.now()}]});
				    		state.set({building: '357'});
			          driverObj.moveNext();
				    	},
			    	},
			    },
			    { element: '#map', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Map display', 
			    		description: 'Clicking on a building will display an information snapshot. To view a more detailed, building-specific report, click on "View Building Report".',
			    	},
			    },
			    { element: 'table.comparables', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Compare buildings', 
			    		description: 'Buildings that are selected in succession will populate the Building Comparison tab. If you click on Building Comparison, a side by side comparison will expand from the bottom of the screen.',
			    	
				    	onNextClick: () => {
				    		// Select a building and quickly click "Show Report"
				    		state.set({building: '357'});
				    		$('button#view-report').click();
				    		// without this delay, seems that Driver cannot find the element 
			          setTimeout(function() {
				          driverObj.moveNext();
			          }, 750);
				    	},
			    	},
			    },
			    { element: '#building-details-cards-wrapper', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Building performance details', 
			    		description: 'The customized Building Report displays the building’s EUI and GHG Intensity for the selected reporting year and frames them in the context of their peers. The report also displays the energy consumption and GHG emission breakdown by fuel type (e.g. electricity, natural gas, district steam).',
			    	},
			    },
			    { element: '#change-chart', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Building performance trends', 
			    		description: 'The report displays performance trends of the same building over time against a typical building of the same property type.',
			    	},
			    },
			    { element: '#performance-standard-chart', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Building performance standard', 
			    		description: 'For commercial buildings 50,000 SF and larger, the report displays current energy performance versus an approximate Washington Clean Buildings Performance Standard EUI target.',
			    	},
			    },
			    { element: '#links', 
			    	onHighlighted: () => { document.querySelector('.driver-popover').focus(); },
			    	popover: { 
			    		title: 'Utility incentives', 
			    		description: 'Users can also find utility incentive opportunities at the bottom of the report.',
			    	},
			    	onDeselected: () => {
			    		// END: zoom back out to the default view and deselect the building
			    		$('#back-to-map-link').click();
							mapview.leafletMap.setView([userlat, userlng], userzoom);
							state.set({building: null});
							state.set({selected_buildings: []});
							mapview.leafletMap.closePopup();
							mapview.leafletMap.highlightLayer.clearLayers();
			    	}, 
			    },
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
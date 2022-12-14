define([
  'jquery',
  'underscore',
  'backbone',
  'toastr',
  'fusejs',
  'autocomplete',
  'text!templates/map/address_search.html',
  'text!templates/map/address_search_results.html'
], function($, _, Backbone, toastr, Fuse, AutoComplete, AddressSearchTemplate, AddressSearchResultTemplate){
  var AddressSearchACView = Backbone.View.extend({
    $container: $('#search'),

    SEARCH_KEY_FOR_SELECTED: 'reported_address',

    SEARCH_EXTERNAL_SEARCH_HEADER: 'Nearby buildings...',

    SYNC_WITH_STATE: true,

    ERRORS: {
      noimage: 'Address not found! Trying adding the relevant zip code.'
    },

    initialize: function(options){
      this.mapView = options.mapView;
      this.state = options.state;
      this.fuse = null;
      this.autocomplete = null;

      this.listenTo(this.state, 'change:city', this.onCityChange);
      this.listenTo(this.state, 'change:allbuildings', this.onBuildingsChange);
      this.listenTo(this.state, 'change:building', this.onBuildingChange);

      if (!String.prototype.trim) {
        String.prototype.trim = function() {
          return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
      }
    },

    configure: function() {
      const config = this.config = this.state.get('city').get('search');
      this.SEARCH_URL = config.url;
      this.SEARCH_BOUNDS = config.bounds;
      this.SEARCH_API_KEY = config.api_key;
      this.SEARCH_KEYS = config.terms;
    },

    onCityChange: function(){
      this.listenTo(this.state.get('city'), 'sync', this.onCitySync);
    },

    onCitySync: function(){
      this.configure();
      this.render();
    },

    onBuildingChange: function() {
      if (!this.SYNC_WITH_STATE) return;

      const buildings = this.state.get('allbuildings');
      const property_id = this.state.get('building');
      const city = this.state.get('city');

      if (_.isUndefined(buildings) ||
          _.isUndefined(city) ) return;

      const building = buildings.find(building => {
        return building.get(city.get('property_id')) == property_id;
      });

      if (building) {
        $('#address-search').val(building.get(this.SEARCH_KEY_FOR_SELECTED));
      } else {
        $('#address-search').val('');
        this.clearMarker();
      }
    },

    getLatLng: function(building) {
      return [
        parseFloat(building.get('lat')),
        parseFloat(building.get('lng'))
      ];
    },

    render: function(){
      this.$container.html(_.template(AddressSearchTemplate));
      return this;
    },

    getBuildingDataForSearch: function(building) {
      const [lat, lng] = this.getLatLng(building);

      const rsp = {
        id: building.cid,
        latlng: L.latLng(lat, lng)
      };

      let valid = true;
      this.SEARCH_KEYS.forEach(obj => {
        let value = building.get(obj.key) + '';

        rsp[obj.name] = value.trim();

        if (!rsp[obj.name].length) valid = false;
      });

      return (valid) ? rsp : null;
    },

    onBuildingsChange: function() {
      const buildings = this.state.get('allbuildings');
      const things = this.things = [];
      const skipRender = this.SEARCH_KEYS.filter(d => d.hide).map(d => d.name);

      buildings.forEach((building, i) => {
        const buildingData = this.getBuildingDataForSearch(building);
        if (buildingData) things.push(buildingData);
      });

      const options = { ...this.config.fuse_options };
      options.keys = this.SEARCH_KEYS.map(d => d.name);

      // fuzzy search engine
      this.fuse = new Fuse(things, options);

      if (this.autocomplete) {
        this.autocomplete.destroy();
        this.autocomplete = null;
      }

      // autocomplete setup
      this.autocomplete = new autoComplete({ // eslint-disable-line no-undef
        selector: '#address-search',
        menuClass: 'address-search-results',
        minChars: 3,
        delay: 200,
        offsetTop: 10,
        cache: false,
        source: (term, suggest, doExternalSearch) => {
          var wrapper = this.wrapper(term, suggest, new Date().getTime(), this);

          if (this.$autocompleteHeader) this.$autocompleteHeader.removeClass('show');

          if (doExternalSearch) {
            this.search(term, wrapper);
          } else {
            const val = term.toLowerCase();
            const results = this.fuse.search(val);

            const matches = results.map(d => {
              const m = [];

              this.SEARCH_KEYS.forEach(opt => {
                const name = opt.name;
                if (!d.item[name] || !d.item[name].length) return;

                let matched = false;
                d.matches.forEach(mat => {
                  if (mat.key === name) matched = true;
                });

                m.push({
                  key: name,
                  value: d.item[name],
                  matched: matched
                });
              });

              return {
                building_id: d.item.id,
                items: m
              };
            });

            wrapper(term, matches);
          }
        },

        renderItem: (result, search) => {
          search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi');
          const template = _.template(AddressSearchResultTemplate);

          result.items
            .filter(d => skipRender.indexOf(d.key) === -1)
            .forEach(item => {
              item.formatted_value = (item.matched) ?
                  item.value.replace(re, '<b>$1</b>') :
                  item.value;
              if (item.key === 'property_id') {
                item.formatted_value = 'Building ID: ' + item.formatted_value;
              }
            });

          return template(result);
        },

        onSelect: (e, term, item) => {
          if (item) {
            const id = item.getAttribute('data-building');
            const building = buildings.get(id);
            const [lat, lng] = this.getLatLng(building);
            const propertyId = this.state.get('city').get('property_id');

            this.centerMapOn([lat, lng]);

            if (this.SYNC_WITH_STATE) {
              var buildingId = building.get(propertyId);
              var state = { building: buildingId };

              var selectedBuildings = this.makeSelectedBuildingsState(buildingId);
              if (selectedBuildings) {
                state.selected_buildings = selectedBuildings;
              }

              this.state.set(state);
            }
          }
        }
      });

      if (this.SYNC_WITH_STATE) this.onBuildingChange();
      this.$autocompleteHeader = $('.autocomplete-suggestions-header');
      this.$autocompleteHeader.text(this.SEARCH_EXTERNAL_SEARCH_HEADER);
    },

    wrapper: function(term, suggest, started_at, ctx) {
      return function(from_term, items, err) {
        if (from_term == term && ctx.maxReqTimestampRendered > started_at) return;
        ctx.maxReqTimestampRendered = started_at;

        if (err) {
          ctx.errorReporter(err);
        }

        suggest(items);
      };
    },

    maxReqTimestampRendered: new Date().getTime(),

    search: function(term, callback){
      if (!term) return callback(term, [], null);

      const url = this.SEARCH_URL;
      const bounds = this.SEARCH_BOUNDS;
      const center = this.state.get('city').get('center');
      // no longer used...
      const api_key = this.SEARCH_API_KEY;

      try {
        this.xhr.abort();
      } catch (e) {
        //
      }

      this.xhr = $.ajax({
        url: url,
        data: {
          'q': term + ',' + this.state.get('city').get('address_search_regional_context'),
          'countrycodes': 'US',
          'limit': 1,
          'addressdetails': 1,
          'viewbox': [bounds[0], bounds[1], bounds[2], bounds[3]].join(','),
          'format': 'geojson',
        },

        error: (xhr, status, err) => {
          const errMsg = this.onAjaxAddressError(xhr);
          this.errorReporter(errMsg);
          callback(term, [], null);
        },

        success: (data, status) => {
          const results = this.onAjaxAddressSuccess(data, term);
          if (!results.buildings.length) this.errorReporter(this.ERRORS.noimage);

          if (results.match) {
            this.centerMapOn(results.match);
            callback(term, [], null);
          } else {
            if (this.$autocompleteHeader) this.$autocompleteHeader.addClass('show');
            callback(term, results.buildings, null);
          }
        }
      });
    },

    getDistances: function(loc) {
      var limit = 400;
      var distances = [];

      this.things.forEach(thing => {
        var d = loc.distanceTo(thing.latlng);
        if (d < limit) distances.push({ id: thing.id, d });
      });

      return distances;
    },

    onAjaxAddressError: function(err) {
      // If more specificity is desired, see:
      // https://mapzen.com/documentation/search/http-status-codes/
      return 'The search service is having problems :-(';
    },

    onAjaxAddressSuccess: function(data, term) {
      const regional_context = this.state.get('city').get('address_search_regional_context');
      const features = (data.features || []).filter(feat => {
        // NOTE: mapzen search returned a property called "region"
        // there is no equivalent in Nominatim, but there is "address.city"
        // I'm not sure this will always match "regional_context" but it does here ("Seattle")
        // in any case, we already restrict results to bounds that should largely countain Seattle
        return feat.properties.address.city && feat.properties.address.city === regional_context;
      });

      if (!features.length) return { match: false, buildings: [] };

      const buildings = this.state.get('allbuildings');
      const keys = this.SEARCH_KEYS.map(d => d.name);
      let closestBuildings = [];
      let match = null;

      features.forEach(feature => {
        const distances = this.getDistances(L.latLng(feature.geometry.coordinates.reverse()));
        closestBuildings = closestBuildings.concat(distances);
      });

      closestBuildings = _.uniq(closestBuildings, false, function(item) { return item.id; });
      closestBuildings = _.sortBy(closestBuildings, 'd');
      closestBuildings = closestBuildings.slice(0, 10);
      closestBuildings = closestBuildings.map(item => {
        const building = buildings.get(item.id);
        const buildingData = this.getBuildingDataForSearch(building);
        const m = {};

        m.building_id = buildingData.id;
        m.items = [];

        keys.forEach(k => {
          const value = buildingData[k] || null;
          if (!value) return;

          if (k in buildingData && buildingData[k] === term) {
            match = [buildingData.latlng.lat, buildingData.latlng.lng];
          }

          m.items.push({
            key: k,
            value: value,
            matched: false
          });
        });

        return m;
      });

      return { match, buildings: closestBuildings };
    },

    errorReporter: function(msg) {
      toastr.options = {
        closeButton: true,
        debug: false,
        newestOnTop: false,
        progressBar: false,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        onclick: null,
        showDuration: '300',
        hideDuration: '1000',
        timeOut: '5000',
        extendedTimeOut: '1000',
        showEasing: 'swing',
        hideEasing: 'linear',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut'
      };

      toastr.error(msg);
    },

    centerMapOn: function(coordinates){
      this.placeMarker(coordinates);
      this.mapView.leafletMap.setView(coordinates);
    },

    makeSelectedBuildingsState: function(id) {
      var selected_buildings = this.state.get('selected_buildings') || [];
      if (selected_buildings.length === 5) return null;

      var out = selected_buildings.map(function(b) {
        b.selected = false;
        return b;
      });

      out.push({
        id: id,
        insertedAt: Date.now(),
        selected: true
      });

      out.sort(function(a, b) {
        return a.insertedAt - b.insertedAt;
      });

      return out;
    },

    placeMarker: function(coordinates){
      const map = this.mapView.leafletMap;
      if (!map) return;

      this.clearMarker();

      const icon = new L.Icon({
          iconUrl: 'images/marker.svg',
          iconRetinaUrl: 'images/marker.svg',
          iconSize: [16, 28],
          iconAnchor: [8, 28],
          popupAnchor: [-3, -76],
          shadowUrl: '',
          shadowRetinaUrl: '',
          shadowSize: [0, 0],
          shadowAnchor: [22, 94]
      });

      this.marker = L.marker(coordinates, { icon }).addTo(map);
    },

    clearMarker: function(){
      const map = this.mapView.leafletMap;
      if (!map) return;

      if (this.marker){
        map.removeLayer(this.marker);
      }
    },

  });

  return AddressSearchACView;
});

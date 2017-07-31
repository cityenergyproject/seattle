'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

define(['jquery', 'underscore', 'backbone', 'toastr', 'fusejs', 'autocomplete', 'text!templates/map/address_search.html', 'text!templates/map/address_search_results.html'], function ($, _, Backbone, toastr, Fuse, AutoComplete, AddressSearchTemplate, AddressSearchResultTemplate) {

  var AddressSearchACView = Backbone.View.extend({
    $container: $('#search'),

    SEARCH_KEY_FOR_SELECTED: 'reported_address',

    SEARCH_EXTERNAL_SEARCH_HEADER: 'Nearby buildings...',

    SYNC_WITH_STATE: true,

    ERRORS: {
      noimage: 'Address not found! Trying adding the relevant zip code.'
    },

    initialize: function initialize(options) {
      this.mapView = options.mapView;
      this.state = options.state;
      this.fuse = null;
      this.autocomplete = null;

      this.listenTo(this.state, 'change:city', this.onCityChange);
      this.listenTo(this.state, 'change:allbuildings', this.onBuildingsChange);
      this.listenTo(this.state, 'change:building', this.onBuildingChange);

      if (!String.prototype.trim) {
        String.prototype.trim = function () {
          return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
      }
    },

    configure: function configure() {
      var config = this.config = this.state.get('city').get('search');
      this.SEARCH_URL = config.url;
      this.SEARCH_BOUNDS = config.bounds;
      this.SEARCH_API_KEY = config.api_key;
      this.SEARCH_KEYS = config.terms;
    },

    onCityChange: function onCityChange() {
      this.listenTo(this.state.get('city'), 'sync', this.onCitySync);
    },

    onCitySync: function onCitySync() {
      this.configure();
      this.render();
    },

    onBuildingChange: function onBuildingChange() {
      if (!this.SYNC_WITH_STATE) return;

      var buildings = this.state.get('allbuildings');
      var property_id = this.state.get('building');
      var city = this.state.get('city');

      if (_.isUndefined(buildings) || _.isUndefined(city)) return;

      var building = buildings.find(function (building) {
        return building.get(city.get('property_id')) == property_id;
      });

      if (building) {
        var _getLatLng = this.getLatLng(building),
            _getLatLng2 = _slicedToArray(_getLatLng, 2),
            lat = _getLatLng2[0],
            lng = _getLatLng2[1];

        $('#address-search').val(building.get(this.SEARCH_KEY_FOR_SELECTED));
      } else {
        $('#address-search').val('');
        this.clearMarker();
      }
    },

    getLatLng: function getLatLng(building) {
      return [parseFloat(building.get('lat')), parseFloat(building.get('lng'))];
    },

    render: function render() {
      this.$container.html(_.template(AddressSearchTemplate));
      return this;
    },

    getBuildingDataForSearch: function getBuildingDataForSearch(building) {
      var _getLatLng3 = this.getLatLng(building),
          _getLatLng4 = _slicedToArray(_getLatLng3, 2),
          lat = _getLatLng4[0],
          lng = _getLatLng4[1];

      var rsp = {
        id: building.cid,
        latlng: L.latLng(lat, lng)
      };

      var valid = true;
      this.SEARCH_KEYS.forEach(function (obj) {
        var value = building.get(obj.key) + '';

        rsp[obj.name] = value.trim();

        if (!rsp[obj.name].length) valid = false;
      });

      return valid ? rsp : null;
    },

    onBuildingsChange: function onBuildingsChange() {
      var _this = this;

      var buildings = this.state.get('allbuildings');
      var things = this.things = [];
      var skipRender = this.SEARCH_KEYS.filter(function (d) {
        return d.hide;
      }).map(function (d) {
        return d.name;
      });

      buildings.forEach(function (building, i) {
        var buildingData = _this.getBuildingDataForSearch(building);
        if (buildingData) things.push(buildingData);
      });

      var options = _extends({}, this.config.fuse_options);
      options.keys = this.SEARCH_KEYS.map(function (d) {
        return d.name;
      });

      // fuzzy search engine
      this.fuse = new Fuse(things, options);

      if (this.autocomplete) {
        this.autocomplete.destroy();
        this.autocomplete = null;
      }

      // autocomplete setup
      this.autocomplete = new autoComplete({
        selector: '#address-search',
        menuClass: 'address-search-results',
        minChars: 3,
        delay: 200,
        offsetTop: 10,
        cache: false,
        source: function source(term, suggest, doExternalSearch) {
          var wrapper = _this.wrapper(term, suggest, new Date().getTime(), _this);

          if (_this.$autocompleteHeader) _this.$autocompleteHeader.removeClass('show');

          if (doExternalSearch) {
            _this.search(term, wrapper);
          } else {
            var val = term.toLowerCase();
            var results = _this.fuse.search(val);

            var matches = results.map(function (d) {
              var m = [];

              _this.SEARCH_KEYS.forEach(function (opt) {
                var name = opt.name;
                if (!d.item[name] || !d.item[name].length) return;

                var matched = false;
                d.matches.forEach(function (mat) {
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

        renderItem: function renderItem(result, search) {
          search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
          var template = _.template(AddressSearchResultTemplate);

          result.items.filter(function (d) {
            return skipRender.indexOf(d.key) === -1;
          }).forEach(function (item) {
            item.formatted_value = item.matched ? item.value.replace(re, "<b>$1</b>") : item.value;
          });

          return template(result);
        },

        onSelect: function onSelect(e, term, item) {
          if (item) {
            var id = item.getAttribute('data-building');
            var building = buildings.get(id);

            var _getLatLng5 = _this.getLatLng(building),
                _getLatLng6 = _slicedToArray(_getLatLng5, 2),
                lat = _getLatLng6[0],
                lng = _getLatLng6[1];

            var propertyId = _this.state.get('city').get('property_id');

            _this.centerMapOn([lat, lng]);

            if (_this.SYNC_WITH_STATE) {
              _this.state.set({ building: building.get(propertyId) });
            }
          }
        }
      });

      if (this.SYNC_WITH_STATE) this.onBuildingChange();
      this.$autocompleteHeader = $('.autocomplete-suggestions-header');
      this.$autocompleteHeader.text(this.SEARCH_EXTERNAL_SEARCH_HEADER);
    },

    wrapper: function wrapper(term, suggest, started_at, ctx) {
      return function (from_term, items, err) {
        var now = new Date().getTime();
        if (from_term == term && ctx.maxReqTimestampRendered > started_at) return;
        ctx.maxReqTimestampRendered = started_at;

        if (err) {
          ctx.errorReporter(err);
        }

        suggest(items);
      };
    },

    maxReqTimestampRendered: new Date().getTime(),

    search: function search(term, callback) {
      var _this2 = this;

      if (!term) return callback(term, [], null);

      var url = this.SEARCH_URL;
      var bounds = this.SEARCH_BOUNDS;
      var center = this.state.get('city').get('center');
      var api_key = this.SEARCH_API_KEY;

      try {
        this.xhr.abort();
      } catch (e) {}

      this.xhr = $.ajax({
        url: url,
        data: {
          api_key: api_key,
          text: term + " " + this.state.get('city').get('address_search_regional_context'),
          size: 10,
          'focus.point.lat': center[0],
          'focus.point.lon': center[1],
          'boundary.rect.min_lat': bounds[0],
          'boundary.rect.min_lon': bounds[1],
          'boundary.rect.max_lat': bounds[2],
          'boundary.rect.max_lon': bounds[3],
          layers: 'address'
        },

        error: function error(xhr, status, err) {
          var errMsg = _this2.onAjaxAddressError(xhr);
          _this2.errorReporter(errMsg);
          callback(term, [], null);
        },

        success: function success(data, status) {
          var results = _this2.onAjaxAddressSuccess(data, term);
          if (!results.buildings.length) _this2.errorReporter(_this2.ERRORS.noimage);

          if (results.match) {
            _this2.centerMapOn(results.match);
            callback(term, [], null);
          } else {
            if (_this2.$autocompleteHeader) _this2.$autocompleteHeader.addClass('show');
            callback(term, results.buildings, null);
          }
        }
      });
    },

    getDistances: function getDistances(loc) {
      var limit = 400;
      var distances = [];

      this.things.forEach(function (thing) {
        var d = loc.distanceTo(thing.latlng);
        if (d < limit) distances.push({ id: thing.id, d: d });
      });

      return distances;
    },

    onAjaxAddressError: function onAjaxAddressError(err) {
      // If more specificity is desired, see:
      // https://mapzen.com/documentation/search/http-status-codes/
      return 'The search service is having problems :-(';
    },

    onAjaxAddressSuccess: function onAjaxAddressSuccess(data, term) {
      var _this3 = this;

      var regional_context = this.state.get('city').get('address_search_regional_context');
      var features = (data.features || []).filter(function (feat) {
        return feat.properties.region && feat.properties.region === regional_context;
      });

      if (!features.length) return { match: false, buildings: [] };

      var buildings = this.state.get('allbuildings');
      var keys = this.SEARCH_KEYS.map(function (d) {
        return d.name;
      });
      var closestBuildings = [];
      var match = null;

      features.forEach(function (feature) {
        var distances = _this3.getDistances(L.latLng(feature.geometry.coordinates.reverse()));
        closestBuildings = closestBuildings.concat(distances);
      });

      closestBuildings = _.uniq(closestBuildings, false, function (item) {
        return item.id;
      });
      closestBuildings = _.sortBy(closestBuildings, 'd');
      closestBuildings = closestBuildings.slice(0, 10);
      closestBuildings = closestBuildings.map(function (item) {
        var building = buildings.get(item.id);
        var buildingData = _this3.getBuildingDataForSearch(building);
        var m = {};

        m.building_id = buildingData.id;
        m.items = [];

        keys.forEach(function (k) {
          var value = buildingData[k] || null;
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

      return { match: match, buildings: closestBuildings };
    },

    errorReporter: function errorReporter(msg) {
      toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": false,
        "progressBar": false,
        "positionClass": "toast-top-right",
        "preventDuplicates": true,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
      };

      toastr.error(msg);
    },

    centerMapOn: function centerMapOn(coordinates) {
      this.placeMarker(coordinates);
      this.mapView.leafletMap.setView(coordinates);
    },

    placeMarker: function placeMarker(coordinates) {
      var map = this.mapView.leafletMap;
      if (!map) return;

      this.clearMarker();

      var icon = new L.Icon({
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

      this.marker = L.marker(coordinates, { icon: icon }).addTo(map);
    },

    clearMarker: function clearMarker() {
      var map = this.mapView.leafletMap;
      if (!map) return;

      if (this.marker) {
        map.removeLayer(this.marker);
      }
    }

  });

  return AddressSearchACView;
});
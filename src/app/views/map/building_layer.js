define([
  'jquery',
  'underscore',
  'backbone',
  'collections/city_buildings',
  'models/building_color_bucket_calculator',
  'text!templates/map/building_info.html'
], function($, _, Backbone, CityBuildings, BuildingColorBucketCalculator, BuildingInfoTemplate){

  var baseCartoCSS = {
    dots: [
    '{marker-fill: #CCC;' +
    'marker-fill-opacity: 0.9;' +
    'marker-line-color: #FFF;' +
    'marker-line-width: 0.5;' +
    'marker-line-opacity: 1;' +
    'marker-placement: point;' +
    'marker-multi-policy: largest;' +
    'marker-type: ellipse;' +
    'marker-allow-overlap: true;' +
    'marker-clip: false;}'
    ],
    footprints: [
      '{polygon-fill: #CCC;' +
      'polygon-opacity: 0.9;' +
      'line-width: 1;' +
      'line-color: #FFF;' +
      'line-opacity: 0.5;}'
    ]
  };

  var CartoStyleSheet = function(tableName, bucketCalculator, mode) {
    this.tableName = tableName;
    this.bucketCalculator = bucketCalculator;
    this.mode = mode;
  };

  CartoStyleSheet.prototype.toCartoCSS = function(){
    var bucketCSS = this.bucketCalculator.toCartoCSS(),
        styles = [...baseCartoCSS[this.mode]].concat(bucketCSS),
        tableName = this.tableName;

    styles = _.reject(styles, function(s) { return !s; });
    styles = _.map(styles, function(s) { return "#" + tableName + " " + s; });
    return styles.join("\n");
  };

  var BuildingInfoPresenter = function(city, allBuildings, buildingId, idKey){
    this.city = city;
    this.allBuildings = allBuildings;
    this.buildingId = buildingId;
    this.idKey = idKey;
  };

  BuildingInfoPresenter.prototype.toLatLng = function() {
    var building = this.toBuilding();
    if (typeof building === 'undefined') return null;

    return {lat: building.get('lat'), lng: building.get('lng')};
  };

  BuildingInfoPresenter.prototype.toBuilding = function() {
    var id_key = this.city.get('property_id');
    return this.allBuildings.find(function(building) {
      return building.get('id') == this.buildingId;
    }, this);
  };

  BuildingInfoPresenter.prototype.toPopulatedLabelsPrevious = function()  {
    var default_hidden = false;
    var building = this.toBuilding();

    return _.map(this.city.get('popup_fields'), function(field) {
      var suppress = false;
      if (field.start_hidden) default_hidden = true;
      var value = (typeof building === 'undefined') ? null : building.get(field.field);

      if (field.suppress_unless_field &&
          field.suppress_unless_values &&
          (typeof building !== 'undefined') &&
          (field.suppress_unless_values.indexOf(building.get(field.suppress_unless_field)) === -1)) {
        suppress = true; // do not display this field
      }

      // don't apply toLocaleString if it's a year, to prevent commas in year.
      return _.extend({
        value: field.isYear ? (value || 'N/A') : (value || 'N/A').toLocaleString(),
        default_hidden: default_hidden,
        suppress: suppress
      }, field);
    }, this);
  };

  BuildingInfoPresenter.prototype.toPopulatedLabels = function() {
    var default_hidden = false;
    var building = this.toBuilding();
    var o = {};

    if (typeof building === 'undefined') return o;

    o.items = _.map(this.city.get('popup_fields'), function(field) {
      var value = building.get(field.field);
      value = (field.skipFormatter) ? (value || 'N/A') : (value || 'N/A').toLocaleString();

      var label = field.label;
      var template = null;

      if (field.template) {
        var key = '{' + field.field + '}';
        template = field.template.replace(key, value);
        label = null;
      }

      return {
        value: value,
        label: label,
        template: template,
        klass: field.field
      };
    }, this);

    // chart

    var chartData = this.city.get('popup_chart');

    if (!chartData) return o;

    o.chart = {};
    o.chart.year = this.city.get('year');

    o.chart.lead = {
      value: building.get(chartData.lead.field),
      label: chartData.lead.label
    };

    o.chart.barchart = {
      value: building.get(chartData.barchart.field),
      desc: chartData.barchart.desc,
      min: chartData.barchart.min,
      max: chartData.barchart.max
    };


    return o;
  };

  /*
    Determines which map layer should be showing on the map
    Currently hardwired to show 'dots' or 'footprints'
   */
  var BuildingLayerWatcher = function(config, map) {
    this.config = config;
    this.map = map;
    this.currentZoom = null;
    this.footprintsAllowed = this.config.allowable || false;
    this.mode = this.getMode();
  };

  BuildingLayerWatcher.prototype.getMode = function() {
    if (!this.footprintsAllowed) return 'dots'; // `dots` are going to be our default

    var zoom = this.map.getZoom();
    if (this.currentZoom === zoom) return this.mode;
    this.currentZoom = zoom;

    return (zoom >= this.config.atZoom) ? 'footprints' : 'dots';
  };

  // Determines whether to change the layer type
  BuildingLayerWatcher.prototype.check = function() {
    if (!this.footprintsAllowed) return false;

    var mode = this.getMode();

    if (mode === this.mode) return false;

    this.mode = mode;

    return true;
  };

  BuildingLayerWatcher.prototype.fillType = function() {
    return this.mode === 'dots' ? 'marker-fill' : 'polygon-fill';
  };

  /*
    To render building footprints we need to join on the footprint table.
    There is no need to wrap it in the building collection sql function, since
    it only impacts the map layer. It does borrow most of the logic for sql
    generation from the building collection sql function however.
   */
  var FootprintGenerateSql = function(footprintConfig, maplayers) {
    this.footprintConfig = footprintConfig;
    this.mapLayerFields = maplayers.map(function(lyr) {
      return 'b.' + lyr.field_name;
    });
    this.mapLayerFields.push('b.id');
    this.mapLayerFields = this.mapLayerFields.join(',');
  };

  FootprintGenerateSql.prototype.sql = function(components) {
    var tableFootprint = this.footprintConfig.table_name;
    var tableData = components.table;

    // Base query
    var query = "SELECT a.*," + this.mapLayerFields + " FROM " + tableFootprint + " a," + tableData + " b WHERE a.buildingid = b.id AND ";

    var filterSql = components.year.concat(components.range).concat(components.category).filter(function(e) { return e.length > 0; });

    query += filterSql.join(' AND ');

    return query;
  };


  var LayerView = Backbone.View.extend({
    initialize: function(options){
      this.state = options.state;
      this.leafletMap = options.leafletMap;
      this.mapElm = $(this.leafletMap._container);

      this.allBuildings = new CityBuildings(null, {});

      this.footprints_cfg = this.state.get('city').get('building_footprints');
      this.buildingLayerWatcher = new BuildingLayerWatcher(this.footprints_cfg, this.leafletMap);

      this.footprintGenerateSql = new FootprintGenerateSql(
        this.footprints_cfg,
        this.state.get('city').get('map_layers'));

      // Listen for all changes but filter in the handler for these
      // attributes: layer, filters, categories, and tableName
      this.listenTo(this.state, 'change', this.changeStateChecker);

      // building has a different handler
      this.listenTo(this.state, 'change:building', this.onBuildingChange);
      this.listenTo(this.state, 'clear_map_popups', this.onClearPopups);
      this.listenTo(this.allBuildings, 'sync', this.render);

      var self = this;
      this.leafletMap.on('popupclose', function(e) {
        // When the map is closing the popup the id's will match,
        // so close.  Otherwise were probably closing an old popup
        // to open a new one for a new building
        if (e.popup._buildingid === self.state.get('building')) {
          self.state.set({building: null});
        }
      });
    },

    // Keep popup in map view after showing more details
    adjustPopup: function(layer) {
      var container = $(layer._container);
      var latlng = layer.getLatLng();
      var mapSize = this.leafletMap.getSize();

      var pt = this.leafletMap.latLngToContainerPoint(latlng);
      var height = container.height();
      var top = pt.y - height;

      if (top < 0) {
        this.leafletMap.panBy([0, top]);
      }
    },

    onClearPopups: function() {
      var map = this.leafletMap;

      map.eachLayer(function(lyr) {
        if (lyr._tip) {
          map.removeLayer(lyr);
        }
      });
    },

    onViewReport: function(evt) {
      if (evt.preventDefault) evt.preventDefault();
      this.state.set({reportActive:true});
      return false;
    },

    isSelectedBuilding: function(selected_buildings, id) {
      var hasBuilding = selected_buildings.find(function(b) {
        return b.id === id;
      });

      return hasBuilding;
    },

    onCompareBuilding: function(evt) {
      if (evt.preventDefault) evt.preventDefault();

      var id = this.state.get('building');
      var selected_buildings = this.state.get('selected_buildings') || [];

      if (this.isSelectedBuilding(selected_buildings, id)) return;

      var out = selected_buildings.map(function(b) {
        return b;
      });

      out.push({
        id: id,
        insertedAt: Date.now()
      });

      out.sort(function(a, b) {
        return a.insertedAt - b.insertedAt;
      });

      this.onClearPopups();

      $('#compare-building').attr("disabled", "disabled");
      this.state.set({selected_buildings: out});

      return false;
    },

    onBuildingChange: function() {
      if (!this.state.get('building')) return;

      var propertyId = this.state.get('city').get('property_id');

      if (this.buildingLayerWatcher.mode !== 'dots') {
        propertyId = this.footprints_cfg.property_id;
      }

      var building_id = this.state.get('building');
      var selected_buildings = this.state.get('selected_buildings') || [];

      var disableCompareBtn = this.isSelectedBuilding(selected_buildings, building_id);
      if (selected_buildings.length >= 5) disableCompareBtn = true

      var template = _.template(BuildingInfoTemplate);
      var presenter = new BuildingInfoPresenter(this.state.get('city'), this.allBuildings, building_id, propertyId);

      if (!presenter.toLatLng()) {
        console.warn('No building (%s) found for presenter!', presenter.buildingId);
        console.warn(presenter);
        console.warn(presenter.toLatLng());
        console.warn(presenter.toBuilding());
        console.warn('');
        return;
      }

      var popup = L.popup()
       .setLatLng(presenter.toLatLng())
       .setContent(template({
          data: presenter.toPopulatedLabels(),
          compare_disabled: disableCompareBtn ? 'disabled="disable"' : ''
        }));

      popup._buildingid = building_id;
      popup.openOn(this.leafletMap);

      $('#view-report').on('click', this.onViewReport.bind(this));
      $('#compare-building').on('click', this.onCompareBuilding.bind(this));
    },

    onFeatureClick: function(event, latlng, _unused, data){
      var propertyId = this.state.get('city').get('property_id');

      if (this.buildingLayerWatcher.mode !== 'dots') {
        propertyId = this.footprints_cfg.property_id;
      }

      var buildingId = data[propertyId];

      this.state.set({building: buildingId});
    },

    onFeatureOver: function(){
      this.mapElm.css('cursor', "help");
    },
    onFeatureOut: function(){
      this.mapElm.css('cursor', '');
    },

    onStateChange: function(){
      // TODO: should not be mutating the buildings model.
      _.extend(this.allBuildings, this.state.pick('tableName', 'cartoDbUser'));
      this.allBuildings.fetch(this.state.get('year'));
    },

    changeStateChecker: function() {
      // filters change
      if (this.state._previousAttributes.filters !== this.state.attributes.filters) {
        return this.onStateChange();
      }
      // layer change
      if (this.state._previousAttributes.layer !== this.state.attributes.layer) {
        return this.onStateChange();
      }
      // catergory change
      if (this.state._previousAttributes.categories !== this.state.attributes.categories) {
        return this.onStateChange();
      }
      // tableName change
      if (this.state._previousAttributes.tableName !== this.state.attributes.tableName) {
        return this.onStateChange();
      }

      // mapzoom change we need to re-render the map
      // to show either 'dots' or 'footprints'
      if (this.state._previousAttributes.zoom !== this.state.attributes.zoom) {
        if (this.buildingLayerWatcher.check()) this.render();
      }

    },


    toCartoSublayer: function(){
      var layerMode = this.buildingLayerWatcher.mode;
      var cssFillType = this.buildingLayerWatcher.fillType();

      var buildings = this.allBuildings,
          state = this.state,
          city = state.get('city'),
          year = state.get('year'),
          fieldName = state.get('layer'),
          cityLayer = _.findWhere(city.get('map_layers'), {field_name: fieldName}),
          buckets = cityLayer.range_slice_count,
          colorStops = cityLayer.color_range,
          calculator = new BuildingColorBucketCalculator(buildings, fieldName, buckets, colorStops, cssFillType),
          stylesheet = new CartoStyleSheet(buildings.tableName, calculator, layerMode);

      var sql = (layerMode === 'dots') ? buildings.toSql(year, state.get('categories'), state.get('filters')) :
                                        this.footprintGenerateSql.sql(
                                          buildings.toSqlComponents(
                                            year,
                                            state.get('categories'),
                                            state.get('filters'), 'b.')
                                        );

      var cartocss = stylesheet.toCartoCSS();
      var interactivity = this.state.get('city').get('property_id');

      return {
        sql: sql,
        cartocss: cartocss,
        interactivity: (layerMode === 'dots' ) ? interactivity : interactivity += ',' + this.footprints_cfg.property_id
      };
    },

    render: function(){
      if(this.cartoLayer) {
        this.cartoLayer.getSubLayer(0).set(this.toCartoSublayer()).show();
        return this;
      }

      // skip if we are loading `cartoLayer`
      if (this.cartoLoading) return;

      this.cartoLoading = true;
      cartodb.createLayer(this.leafletMap, {
        user_name: this.allBuildings.cartoDbUser,
        type: 'cartodb',
        sublayers: [this.toCartoSublayer()]
      },{https: true}).addTo(this.leafletMap).on('done', this.onCartoLoad, this);

      return this;
    },
    onCartoLoad: function(layer) {
      this.cartoLoading = false;
      var sub = layer.getSubLayer(0);

      this.cartoLayer = layer;
      sub.setInteraction(true);
      sub.on('featureClick', this.onFeatureClick, this);
      sub.on('featureOver', this.onFeatureOver, this);
      sub.on('featureOut', this.onFeatureOut, this);
      this.onBuildingChange();
    }
  });

  return LayerView;

});

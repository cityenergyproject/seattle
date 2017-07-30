define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'ionrangeslider',
  'models/building_bucket_calculator',
  'models/building_color_bucket_calculator',
  'views/charts/histogram',
  'utils/formatters',
  'text!templates/map_controls/filter_section_header.html',
  'text!templates/map_controls/filter.html',
  'text!templates/map_controls/filter_container.html',
  'text!templates/map_controls/filter_building_details.html',
  'text!templates/map_controls/filter_property_type.html'
], function($, _, Backbone, d3, Ion, BuildingBucketCalculator,
            BuildingColorBucketCalculator, HistogramView, Formatters,
            FilterSectionHeader, FilterTemplate, FilterContainer,
            FilterBuildingDetailsTemplate, FilterPropertyTypeTemplate){

  var MapControlView = Backbone.View.extend({
    className: "map-control",
    $container: $('#map-controls-content--inner'),
    viewType: 'filter',

    initialize: function(options){
      this.layer = options.layer;
      this.allBuildings = options.allBuildings;
      this.state = options.state;
      this.listenTo(this.state, 'change:layer', this.onLayerChange);
      this.listenTo(this.state, 'change:selected_buildings', this.updateBuildingDetails);
      this.listenTo(this.state, 'change:categories', this.onCategoryChange);

      this._valueFormatter = this.layer.formatter === 'threshold' ?
                  Formatters.get(this.layer.formatter, this.layer.threshold_labels) :
                  Formatters.get(this.layer.formatter);

      // set key for property_type
      this.propertyTypeKey = 'property_type';

      // Hack to keep track of property_type changes
      this._lastPropertyType = null;

      this.memorize();
    },

    onLayerChange: function(){
      const layerID = this.layer.id ? this.layer.id : this.layer.field_name;
      const currentLayer = this.state.get('layer');
      const isCurrent = currentLayer == layerID;

      this.$el.toggleClass('current', isCurrent);
      this.$section().toggleClass('current', this.$section().find('.current').length > 0);
    },

    onCategoryChange: function() {
      const propertyCategory = this.getPropertyCategory();
      const value = propertyCategory ? propertyCategory.values[0] : null;

      // Check for change in property_type category
      if (value !== this._lastPropertyType) {
        // if change, re-calculate the heavy bits
        // and re-render
        this.memorize();
        this.render(false, true);
      }
    },

    close: function() {
      this.undelegateEvents();
      this.remove();
    },

    updateBuildingDetails: function() {
      if (!this.$el || this.$el.length === 0) return;

      var tableTemplate = _.template(FilterBuildingDetailsTemplate);
      var tableData = this.getTableData();

      this.$el.find('.building-details').html(tableTemplate({table: tableData.data}));

      if (this.histogram) {
        this.histogram.updateHighlight(tableData.selected_value)
      }

    },

    getCompareBuildings: function() {
      var buildings = this.allBuildings;
      var o = Array.apply(null, Array(5)).map(function () {});

      var selected_buildings = this.state.get('selected_buildings') || [];

      selected_buildings.forEach(function(building,i){
        var model = buildings.get(building.id);
        if (!model) return;

        o.splice(i, 1, {
          selected: building.selected,
          data: model.toJSON()
        });
      });

      return o;
    },

    getTableData: function() {
      var buildings = this.getCompareBuildings();
      var fieldName = this.layer.field_name;
      var unit = this.layer.unit || '';
      var formatter = this._valueFormatter;

      const propertyCategory = this.getPropertyCategory();
      const propertyType = propertyCategory ? propertyCategory.values[0] : null;

      const thresholds = (this.layer.thresholds) ? [24.8,29.1,36.0] : null;

      var o = {
        selected_value: null
      };

      o.data = buildings.map(b => {
        if (!b) return b;
        const klasses = [];
        if (b.selected) {
          o.selected_value = b.data[fieldName];
          klasses.push('col-selected');
        }

        if (propertyType && b.data[this.propertyTypeKey] !== propertyType) {
          klasses.push('disable');
        }

        const value = (this.layer.thresholds && this.valueToIndex) ?
            formatter(this.valueToIndex(b.data[fieldName])) :
            formatter(b.data[fieldName]);

        return {
          value,
          unit,
          cell_klass: klasses.join(' ')
        }
      });

      return o;
    },

    getPropertyCategory: function() {
      const cats = this.state.get('categories');
      return cats.find(cat => cat.field === this.propertyTypeKey);
    },

    getPropertyTypeProps: function(category) {
      const propertyType = category ? category.values[0] : null;
      const buildings = this.allBuildings;
      const formatter = this._valueFormatter;
      let median;

      if (propertyType) {
        const subset = buildings.where({[this.propertyTypeKey]: category.values[0]});
        median = d3.median(subset, d => d.get(this.layer.field_name));
      } else {
        median = d3.median(buildings.pluck(this.layer.field_name));
      }

      const value = (this.layer.thresholds && this.valueToIndex) ?
            formatter(this.valueToIndex(median)) :
            formatter(median);

      return [
        propertyType,
        value
      ];

    },

    memorize: function() {
      const propertyCategory = this.getPropertyCategory();
      const propertyType = propertyCategory ? propertyCategory.values[0] : null;

      let buildings = this.allBuildings;
      const fieldName = this.layer.field_name;
      const rangeSliceCount = this.layer.range_slice_count;
      const filterRange = this.layer.filter_range;
      const colorStops = this.layer.color_range;

      if (propertyType) {
        buildings = new Backbone.Collection(this.allBuildings.filter(model => {
          return model.get(this.propertyTypeKey) === propertyType;
        }));
      }

      const thresholds = (this.layer.thresholds) ? [24.8,29.1,36.0] : null;

      if (thresholds) {
        this.valueToIndex = d3.scale.threshold().domain(thresholds).range(d3.range(0, thresholds.length + 1));
      }

      this.activeBuildings = buildings;
      this.bucketCalculator = new BuildingBucketCalculator(buildings, fieldName, rangeSliceCount, filterRange, thresholds);
      this.gradientCalculator = new BuildingColorBucketCalculator(buildings, fieldName, rangeSliceCount, colorStops, null, thresholds);
      this.gradientStops = this.gradientCalculator.toGradientStops();
      this.buckets = this.bucketCalculator.toBuckets();

      this.bucketGradients = _.map(this.gradientStops, (stop, bucketIndex) => {
        return {
          color: stop,
          count: this.buckets[bucketIndex] || 0
        };
      });
    },

    getColorForValue: function(val) {
      if (!this.gradientCalculator) return 'blue';

      var scale = this.gradientCalculator.colorGradient().copy();
      return scale(val);
    },

    render: function(isUpdate, isDirty){
      isUpdate = isUpdate || false;

      const propertyCategory = this.getPropertyCategory();
      var propTypeTemplate = _.template(FilterPropertyTypeTemplate);
      var template = _.template(FilterContainer);
      var fieldName = this.layer.field_name;
      var idField = this.layer.id || fieldName.toLowerCase().replace(/\s/g, "-");
      var $el = $('#' + idField);

      var layerID = this.layer.id ? this.layer.id : fieldName;
      var currentLayer = this.state.get('layer');
      var isCurrent = currentLayer == layerID;

      var $section = this.$section();
      var filterRange = this.layer.filter_range;
      var rangeSliceCount = this.layer.range_slice_count;
      var colorStops = this.layer.color_range;
      var buildings = this.activeBuildings;
      var bucketCalculator = this.bucketCalculator;
      var extent = bucketCalculator.toExtent();
      var gradientCalculator = this.gradientCalculator;
      var buckets = this.buckets;
      var gradientStops = this.gradientStops;
      var filterTemplate = _.template(FilterTemplate);
      var stateFilters = this.state.get('filters');
      var filterState = _.findWhere(stateFilters, {field: fieldName}) || {min: extent[0], max: extent[1]};
      var filterRangeMin = (filterRange && filterRange.min) ? filterRange.min : extent[0];
      var filterRangeMax = (filterRange && filterRange.max) ? filterRange.max : extent[1];
      var bucketGradients = this.bucketGradients;

      var tableTemplate = _.template(FilterBuildingDetailsTemplate);
      var tableData = this.getTableData();

      const [proptype, proptype_val] = this.getPropertyTypeProps(propertyCategory);
      this._lastPropertyType = proptype;


      if ($el.length === 0) {
        this.$el.html(template(_.defaults(this.layer, {description: null})));
        this.$el.find('.filter-wrapper').html(filterTemplate({id: layerID}));
        this.$el.find('.building-details').html(tableTemplate({table: tableData.data}));
        this.$el.find('.proptype-median-wrapper').html(propTypeTemplate({proptype, proptype_val}));
        this.$el.attr('id', idField);
      } else {
        this.$el = $el;
      }

      if (isDirty) {
        this.$el.find('.building-details').html(tableTemplate({table: tableData.data}));
        this.$el.find('.proptype-median-wrapper').html(propTypeTemplate({proptype, proptype_val}));
      }

      if (!this.histogram) {
        var histogram_options = {
          gradients: bucketGradients,
          slices: rangeSliceCount,
          filterRange: [filterRangeMin, filterRangeMax],
          colorScale: gradientCalculator.colorGradient().copy(),
          selected_value: tableData.selected_value,
          fieldName
        };

        this.histogram = new HistogramView(histogram_options);
        this.$el.find('.chart').html(this.histogram.render());
      }

      if (isDirty) {
        this.histogram.update({
          gradients: bucketGradients,
          slices: rangeSliceCount,
          filterRange: [filterRangeMin, filterRangeMax],
          colorScale: gradientCalculator.colorGradient().copy()
        });

        this.$el.find('.chart').html(this.histogram.render());
      }

      const scaleRange = this.histogram.xScale.range();
      const scaleRangeMin = 0; //scaleRange[0];
      const scaleRangeMax = rangeSliceCount; //scaleRange[scaleRange.length - 1];
      if (!this.$filter || isDirty) {
        if (this.$filter) {
          this.$filter.destroy();
        }

        const slideOptions = {
          type: 'double',
          hide_from_to: false,
          force_edges: true,
          grid: false,
          hide_min_max: true,
          step: (filterRangeMax < 1) ? 0.0001 : 1,
          prettify_enabled: !this.layer.disable_prettify,
          prettify: this.onPrettifyHandler(filterRangeMin, filterRangeMax, this.histogram),
          onFinish: _.bind(this.onFilterFinish, this),
        };

        if (this.layer.thresholds) {
          slideOptions.values = d3.range(0, rangeSliceCount);

          /* Grid approach
          slideOptions.grid = true;
          slideOptions.grid_snap = true;
          slideOptions.step = scaleRange[1] - scaleRange[0];
          slideOptions.grid_num = 3;
          slideOptions.grid_margin = true;
          */

        }

        const slider = this.$el.find('.range.filter').ionRangeSlider(slideOptions);
        this.$filter = slider.data("ionRangeSlider");
      }

      // if this is a slider update, skip
      // otherwise when user clicks on slider bar
      // will cause a stack overflow
      if (!isUpdate){
        this.$filter.update({
          from: filterState.min,
          to: filterState.max,
          min: filterRangeMin,
          max: filterRangeMax
        });
      }

      this.$el.toggleClass('current', isCurrent);
      if (isCurrent || $section.find('.current').length > 0) {
        $section.find('input').prop('checked', true);
      }

      const sectionClass = isCurrent || $section.find('.current').length > 0;
      $section.toggleClass('current', sectionClass);

      if (!isUpdate){
       $section.find('.category-control-container').append(this.$el);
      } else {
        let positionInCategory;
        $section.find('.category-control-container > .map-control')
          .each((index, el) => {
            if ($(el).attr('id') === idField){
              positionInCategory = index;
            }
          });

        switch(positionInCategory){
          case 0:
            $section.find('.category-control-container').prepend(this.$el);
            break;
          default:
            $section.find(".category-control-container > div:nth-child(" + positionInCategory + ")").after(this.$el);
        }
      }

      return this;
    },

    onFilterFinish: function(rangeSlider) {
      const fieldName = this.layer.field_name;
      const filters = _.reject(this.state.get('filters'), obj => obj.field == fieldName);

      console.log('Slider: ', rangeSlider);

      const values = {
        from: rangeSlider.from,
        to: rangeSlider.to,
        min: rangeSlider.min,
        max: rangeSlider.max
      };

      const thresholds = (this.layer.thresholds) ? [24.8,29.1,36.0] : null;

      if (values.from !== values.min || values.to !== values.max){
        var newFilter = {field: fieldName};

        if (thresholds) newFilter.threshold = true;

        // Only include min or max in the filter if it is different from the rangeSlider extent.
        // This is important to the rangeSlider can clip the extreme values off, but we don't
        // want to use the rangeSlider extents to filter the data on the map.
        if (!thresholds) {
          if (values.from !== values.min) newFilter.min = values.from;
          if (values.to   !== values.max) newFilter.max = values.to;
        } else {
          if (values.from !== values.min && values.from !== 0) newFilter.min = thresholds[values.from - 1];
          if (values.to   !== values.max && values.to !== 3) newFilter.max = thresholds[values.to];
        }
        filters.push(newFilter);
      }

      // fire event for other non Filter.js listeners
      this.state.set({filters: filters});
      this.render(true);
    },

    onPrettifyHandler: function(min, max, histogram) {

      if (this.layer.thresholds) {
        const labels = this.layer.slider_labels;
        return function(num) {
          return labels[num] || '';
        };
      }

      return function(num) {
        switch(num) {
          case min: return num.toLocaleString();
          case max: return num.toLocaleString() + "+";
          default: return num.toLocaleString();
        }
      };
    },

    events: {
      'click' : 'showLayer',
      'click .more-info': 'toggleMoreInfo',
    },

    showLayer: function(){
      var layerID = this.layer.id ? this.layer.id : this.layer.field_name;
      this.state.set({layer: layerID, sort: this.layer.field_name, order: 'desc'});
    },

    toggleMoreInfo: function(){
      this.$el.toggleClass('show-more-info');
      return this;
    },

    $section: function(){
      var sectionName = this.layer.section,
          safeSectionName = sectionName.toLowerCase().replace(/\s/g, "-"),
          $sectionEl = $("#" + safeSectionName);

      // if section exists return it, because every filter calls this fn
      if ($sectionEl.length > 0){ return $sectionEl; }

      var template = _.template(FilterSectionHeader);

      $sectionEl = $(template({category: sectionName})).appendTo(this.$container);

      return $sectionEl;
    }
  });

  return MapControlView;

});

'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

define(['jquery', 'underscore', 'backbone', 'd3', 'ionrangeslider', 'models/building_bucket_calculator', 'models/building_color_bucket_calculator', 'views/charts/histogram', 'utils/formatters', 'text!templates/map_controls/filter_section_header.html', 'text!templates/map_controls/filter.html', 'text!templates/map_controls/filter_container.html', 'text!templates/map_controls/filter_building_details.html', 'text!templates/map_controls/filter_property_type.html'], function ($, _, Backbone, d3, Ion, BuildingBucketCalculator, BuildingColorBucketCalculator, HistogramView, Formatters, FilterSectionHeader, FilterTemplate, FilterContainer, FilterBuildingDetailsTemplate, FilterPropertyTypeTemplate) {

  var MapControlView = Backbone.View.extend({
    className: "map-control",
    $container: $('#map-controls-content--inner'),
    viewType: 'filter',

    initialize: function initialize(options) {
      this.layer = options.layer;
      this.allBuildings = options.allBuildings;
      this.state = options.state;
      this.listenTo(this.state, 'change:layer', this.onLayerChange);
      this.listenTo(this.state, 'change:selected_buildings', this.updateBuildingDetails);
      this.listenTo(this.state, 'change:categories', this.onCategoryChange);

      this._valueFormatter = Formatters.get(this.layer.formatter);
      this._medianFormatter = Formatters.get('fixed-0');

      // set key for property_type
      this.propertyTypeKey = 'property_type';

      // Hack to keep track of property_type changes
      this._lastPropertyType = null;

      this.memorize();
    },

    onLayerChange: function onLayerChange() {
      var fieldName = this.layer.field_name,
          currentLayer = this.state.get('layer'),
          isCurrent = currentLayer == fieldName;
      this.$el.toggleClass('current', isCurrent);
      this.$section().toggleClass('current', this.$section().find('.current').length > 0);
    },

    onCategoryChange: function onCategoryChange() {
      var propertyCategory = this.getPropertyCategory();
      var value = propertyCategory ? propertyCategory.values[0] : null;

      // Check for change in property_type category
      if (value !== this._lastPropertyType) {
        // if change, re-calculate the heavy bits
        // and re-render
        this.memorize();
        this.render(false, true);
      }
    },

    close: function close() {
      this.undelegateEvents();
      this.remove();
    },

    updateBuildingDetails: function updateBuildingDetails() {
      if (!this.$el || this.$el.length === 0) return;

      var tableTemplate = _.template(FilterBuildingDetailsTemplate);
      var tableData = this.getTableData();

      this.$el.find('.building-details').html(tableTemplate({ table: tableData.data }));

      if (this.histogram) {
        this.histogram.updateHighlight(tableData.selected_value);
      }
    },

    getCompareBuildings: function getCompareBuildings() {
      var buildings = this.allBuildings;
      var o = Array.apply(null, Array(5)).map(function () {});

      var selected_buildings = this.state.get('selected_buildings') || [];

      selected_buildings.forEach(function (building, i) {
        var model = buildings.get(building.id);
        if (!model) return;

        o.splice(i, 1, {
          selected: building.selected,
          data: model.toJSON()
        });
      });

      return o;
    },

    getTableData: function getTableData() {
      var _this = this;

      var buildings = this.getCompareBuildings();
      var fieldName = this.layer.field_name;
      var unit = this.layer.unit || '';
      var formatter = this._valueFormatter;

      var propertyCategory = this.getPropertyCategory();
      var propertyType = propertyCategory ? propertyCategory.values[0] : null;

      var o = {
        selected_value: null
      };

      o.data = buildings.map(function (b) {
        if (!b) return b;
        var klasses = [];
        if (b.selected) {
          o.selected_value = b.data[fieldName];
          klasses.push('col-selected');
        }

        if (propertyType && b.data[_this.propertyTypeKey] !== propertyType) {
          klasses.push('disable');
        }

        return {
          value: formatter(b.data[fieldName]),
          unit: unit,
          cell_klass: klasses.join(' ')
        };
      });

      return o;
    },

    getPropertyCategory: function getPropertyCategory() {
      var _this2 = this;

      var cats = this.state.get('categories');
      return cats.find(function (cat) {
        return cat.field === _this2.propertyTypeKey;
      });
    },

    getPropertyTypeProps: function getPropertyTypeProps(category) {
      var _this3 = this;

      var propertyType = category ? category.values[0] : null;
      var buildings = this.allBuildings;
      var median = void 0;

      if (propertyType) {
        var subset = buildings.where(_defineProperty({}, this.propertyTypeKey, category.values[0]));
        median = d3.median(subset, function (d) {
          return d.get(_this3.layer.field_name);
        });
      } else {
        median = d3.median(buildings.pluck(this.layer.field_name));
      }

      return [propertyType, this._valueFormatter(median)];
    },

    memorize: function memorize() {
      var _this4 = this;

      var propertyCategory = this.getPropertyCategory();
      var propertyType = propertyCategory ? propertyCategory.values[0] : null;

      var buildings = this.allBuildings;
      var fieldName = this.layer.field_name;
      var rangeSliceCount = this.layer.range_slice_count;
      var filterRange = this.layer.filter_range;
      var colorStops = this.layer.color_range;

      if (propertyType) {
        buildings = new Backbone.Collection(this.allBuildings.filter(function (model) {
          return model.get(_this4.propertyTypeKey) === propertyType;
        }));
      }

      this.activeBuildings = buildings;
      this.bucketCalculator = new BuildingBucketCalculator(buildings, fieldName, rangeSliceCount, filterRange);
      this.gradientCalculator = new BuildingColorBucketCalculator(buildings, fieldName, rangeSliceCount, colorStops);
      this.gradientStops = this.gradientCalculator.toGradientStops();
      this.buckets = this.bucketCalculator.toBuckets();

      this.bucketGradients = _.map(this.gradientStops, function (stop, bucketIndex) {
        return {
          color: stop,
          count: _this4.buckets[bucketIndex] || 0
        };
      });
    },

    getColorForValue: function getColorForValue(val) {
      if (!this.gradientCalculator) return 'blue';

      var scale = this.gradientCalculator.colorGradient().copy();
      return scale(val);
    },

    render: function render(isUpdate, isDirty) {
      isUpdate = isUpdate || false;

      var propertyCategory = this.getPropertyCategory();
      var propTypeTemplate = _.template(FilterPropertyTypeTemplate);
      var template = _.template(FilterContainer);
      var fieldName = this.layer.field_name;
      var safeFieldName = fieldName.toLowerCase().replace(/\s/g, "-");
      var $el = $('#' + safeFieldName);
      var currentLayer = this.state.get('layer');
      var isCurrent = currentLayer == fieldName;
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
      var filterState = _.findWhere(stateFilters, { field: fieldName }) || { min: extent[0], max: extent[1] };
      var filterRangeMin = filterRange && filterRange.min ? filterRange.min : extent[0];
      var filterRangeMax = filterRange && filterRange.max ? filterRange.max : extent[1];
      var bucketGradients = this.bucketGradients;

      var tableTemplate = _.template(FilterBuildingDetailsTemplate);
      var tableData = this.getTableData();

      var _getPropertyTypeProps = this.getPropertyTypeProps(propertyCategory),
          _getPropertyTypeProps2 = _slicedToArray(_getPropertyTypeProps, 2),
          proptype = _getPropertyTypeProps2[0],
          proptype_val = _getPropertyTypeProps2[1];

      this._lastPropertyType = proptype;

      if ($el.length === 0) {
        this.$el.html(template(_.defaults(this.layer, { description: null })));
        this.$el.find('.filter-wrapper').html(filterTemplate({ id: fieldName }));
        this.$el.find('.building-details').html(tableTemplate({ table: tableData.data }));
        this.$el.find('.proptype-median-wrapper').html(propTypeTemplate({ proptype: proptype, proptype_val: proptype_val }));
        this.$el.attr('id', safeFieldName);
      } else {
        this.$el = $el;
      }

      if (isDirty) {
        this.$el.find('.building-details').html(tableTemplate({ table: tableData.data }));
        this.$el.find('.proptype-median-wrapper').html(propTypeTemplate({ proptype: proptype, proptype_val: proptype_val }));
      }

      if (!this.$filter || isDirty) {
        if (this.$filter) {
          this.$filter.destroy();
        }

        var slider = this.$el.find('.filter-wrapper').ionRangeSlider({
          type: 'double',
          hide_from_to: false,
          force_edges: true,
          grid: false,
          hide_min_max: true,
          step: filterRangeMax < 1 ? 0.0001 : 1,
          prettify_enabled: !(fieldName.match(/year/) || fieldName.match(/energy_star/)), // TODO: don't hardcode this?
          prettify: this.onPrettifyHandler(filterRangeMin, filterRangeMax),
          onFinish: _.bind(this.onFilterFinish, this)
        });

        this.$filter = slider.data("ionRangeSlider");
      }

      // if this is a slider update, skip
      // otherwise when user clicks on slider bar
      // will cause a stack overflow
      if (!isUpdate) {
        this.$filter.update({
          from: filterState.min,
          to: filterState.max,
          min: filterRangeMin,
          max: filterRangeMax
        });
      }

      if (!this.histogram) {
        var histogram_options = {
          gradients: bucketGradients,
          slices: rangeSliceCount,
          filterRange: [filterRangeMin, filterRangeMax],
          quantileScale: gradientCalculator.colorGradient().copy(),
          selected_value: tableData.selected_value
        };
        this.histogram = new HistogramView(histogram_options);
      }

      if (isDirty) {
        this.histogram.update({
          gradients: bucketGradients,
          slices: rangeSliceCount,
          filterRange: [filterRangeMin, filterRangeMax],
          quantileScale: gradientCalculator.colorGradient().copy()
        });
      }

      this.$el.find('.chart').html(this.histogram.render());

      this.$el.toggleClass('current', isCurrent);
      if (isCurrent || $section.find('.current').length > 0) {
        $section.find('input').prop('checked', true);
      }
      $section.toggleClass('current', isCurrent || $section.find('.current').length > 0);

      if (!isUpdate) {
        $section.find('.category-control-container').append(this.$el);
      } else {
        var positionInCategory;
        $section.find('.category-control-container > .map-control').each(function (index, el) {
          if ($(el).attr('id') === this.layer.field_name) {
            positionInCategory = index;
          }
        }.bind(this));

        switch (positionInCategory) {
          case 0:
            $section.find('.category-control-container').prepend(this.$el);
            break;
          default:
            $section.find(".category-control-container > div:nth-child(" + positionInCategory + ")").after(this.$el);
        }
      }

      return this;
    },

    onFilterFinish: function onFilterFinish(rangeSlider) {
      var filters = this.state.get('filters'),
          fieldName = this.layer.field_name;

      filters = _.reject(filters, function (f) {
        return f.field == fieldName;
      });

      if (rangeSlider.from !== rangeSlider.min || rangeSlider.to !== rangeSlider.max) {
        var newFilter = { field: fieldName };
        // Only include min or max in the filter if it is different from the rangeSlider extent.
        // This is important to the rangeSlider can clip the extreme values off, but we don't
        // want to use the rangeSlider extents to filter the data on the map.
        if (rangeSlider.from !== rangeSlider.min) newFilter.min = rangeSlider.from;
        if (rangeSlider.to !== rangeSlider.max) newFilter.max = rangeSlider.to;
        filters.push(newFilter);
      }

      // fire event for other non Filter.js listeners
      this.state.set({ filters: filters });
      this.render(true);
    },

    onPrettifyHandler: function onPrettifyHandler(min, max) {
      return function (num) {
        switch (num) {
          case min:
            return num.toLocaleString();
          case max:
            return num.toLocaleString() + "+";
          default:
            return num.toLocaleString();
        }
      };
    },

    events: {
      'click': 'showLayer',
      'click .more-info': 'toggleMoreInfo'
    },

    showLayer: function showLayer() {
      var fieldName = this.layer.field_name;
      this.state.set({ layer: fieldName, sort: fieldName, order: 'desc' });
    },

    toggleMoreInfo: function toggleMoreInfo() {
      this.$el.toggleClass('show-more-info');
      return this;
    },

    $section: function $section() {
      var sectionName = this.layer.section,
          safeSectionName = sectionName.toLowerCase().replace(/\s/g, "-"),
          $sectionEl = $("#" + safeSectionName);

      // if section exists return it, because every filter calls this fn
      if ($sectionEl.length > 0) {
        return $sectionEl;
      }

      var template = _.template(FilterSectionHeader);

      $sectionEl = $(template({ category: sectionName })).appendTo(this.$container);

      return $sectionEl;
    }
  });

  return MapControlView;
});
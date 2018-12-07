'use strict';

define(['jquery', 'underscore', 'backbone', 'models/city', 'text!templates/map_controls/category.html'], function ($, _, Backbone, CityModel, MapCategoryControlTemplate) {
  var OTHER_LABEL = 'Other';

  var MapCategoryControlView = Backbone.View.extend({
    $container: $('#map-category-controls'),
    viewType: 'category',

    initialize: function initialize(options) {
      this.layer = options.layer;
      this.allBuildings = options.allBuildings;
      this.state = options.state;

      var fieldName = this.layer.field_name;
      var counts = this.allBuildings.countBy(fieldName);

      var orderedValues = Object.keys(counts).sort(function (a, b) {
        if (this.layer.sort_by_key) {
          if (a === b) return 0;
          return a < b ? -1 : 1;
        }
        // default is to sort by max count value asc
        return counts[a] - counts[b];
      }.bind(this));

      this.values = orderedValues.slice(0, this.layer.hide_other_category ? orderedValues.length++ : 9);
      if (!this.layer.hide_other_category) this.values.concat([OTHER_LABEL]);
      this.otherValues = this.layer.hide_other_category ? [] : orderedValues.slice(9);
    },

    close: function close() {
      this.undelegateEvents();
      this.remove();
    },

    render: function render() {
      var fieldName = this.layer.field_name;
      var counts = this.allBuildings.countBy(fieldName);
      var fieldKeys = _.keys(counts);
      var onloadDisplayValues = !this.layer.onload_display_values ? fieldKeys.reduce(function (accum, current) {
        accum[current] = true;
        return accum;
      }, {}) : this.layer.onload_display_values.split(',').reduce(function (accum, current) {
        accum[current] = true;
        return accum;
      }, {});
      var defaultCategoryState = { field: fieldName, values: [fieldKeys], other: true };
      var categoryState = _.findWhere(this.state.get('categories'), { field: fieldName }) || defaultCategoryState;
      var template = _.template(MapCategoryControlTemplate);

      if (fieldKeys[0] == 'undefined') {
        return this;
      }

      var categories = this.values.map(function (name) {
        var stateHasValue = _.contains(categoryState.values, name);
        var stateIsInverted = categoryState.other === true || categoryState.other === 'true';
        var checked = stateIsInverted ? name in onloadDisplayValues : stateHasValue;

        return {
          checked: checked ? 'checked="checked"' : '',
          count: counts[name] || 0,
          name: name
        };
      });

      var compiled = template({
        id: this.layer.field_name,
        title: this.layer.title,
        categories: categories
      });

      this.$el = $(compiled).appendTo(this.$container);
      this.delegateEvents();

      return this;
    },

    events: {
      'change .categories input': 'toggleCategory',
      'click .categories .showAll': 'showAll',
      'click .categories .hideAll': 'hideAll'
    },

    toggleCategory: function toggleCategory() {
      var categories = this.state.get('categories');
      var fieldName = this.layer.field_name;
      var unchecked = this.$el.find('.categories input:not(:checked)').map(function () {
        return $(this).val();
      });
      var checked = this.$el.find('.categories input:checked').map(function () {
        return $(this).val();
      });

      categories = _.reject(categories, function (f) {
        return f.field == fieldName;
      });

      if (unchecked.length < checked.length) {
        var uncheckedValues = unchecked.toArray();

        if (uncheckedValues.indexOf(OTHER_LABEL) >= 0) {
          uncheckedValues = _.without(uncheckedValues, OTHER_LABEL).concat(this.otherValues);
        }

        categories.push({ field: fieldName, values: uncheckedValues, other: true });
      } else if (checked.length > 0) {
        var checkedValues = checked.toArray();

        if (checkedValues.indexOf(OTHER_LABEL) >= 0) {
          checkedValues = _.without(checkedValues, OTHER_LABEL).concat(this.otherValues);
        }

        categories.push({ field: fieldName, values: checkedValues, other: false });
      }

      this.state.set({ categories: categories });
    },

    hideAll: function hideAll() {
      var categories = this.state.get('categories');
      var fieldName = this.layer.field_name;
      var counts = this.allBuildings.countBy(fieldName);
      var fieldKeys = _.keys(counts);

      categories = _.reject(categories, function (f) {
        return f.field == fieldName;
      });

      this.$el.find('.categories input').map(function () {
        this.checked = false;
      });

      categories.push({ field: fieldName, values: fieldKeys, other: true });

      this.state.set({ categories: categories });
      return false;
    },

    showAll: function showAll() {
      var categories = this.state.get('categories');
      var fieldName = this.layer.field_name;
      var counts = this.allBuildings.countBy(fieldName);
      var fieldKeys = _.keys(counts);

      categories = _.reject(categories, function (f) {
        return f.field == fieldName;
      });

      this.$el.find('.categories input').map(function () {
        this.checked = true;
      });

      categories.push({ field: fieldName, values: fieldKeys, other: false });

      this.state.set({ categories: categories });
      return false;
    }
  });

  return MapCategoryControlView;
});
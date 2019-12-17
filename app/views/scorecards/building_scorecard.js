'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

define(['jquery', 'underscore', 'backbone', './charts/fuel', './charts/shift', './charts/comments', 'models/building_color_bucket_calculator', 'text!templates/scorecards/building.html'], function ($, _, Backbone, FuelUseView, ShiftView, CommentView, BuildingColorBucketCalculator, BuildingTemplate) {
  var BuildingScorecard = Backbone.View.extend({
    initialize: function initialize(options) {
      this.state = options.state;
      this.formatters = options.formatters;
      this.metricFilters = options.metricFilters;
      this.parentEl = options.parentEl;
      this.template = _.template(BuildingTemplate);

      this.charts = {};

      return this;
    },

    events: {
      'click .sc-toggle--input': 'toggleView',
      'click .ways-to-save-button': 'scrollToLinks'
    },

    close: function close() {
      this.scoreCardData = null;
    },

    scrollToLinks: function scrollToLinks(evt) {
      evt.preventDefault();
      this.parentEl[0].scrollTo(0, this.parentEl.find('#links')[0].offsetTop);
      return false;
    },

    toggleView: function toggleView(evt) {
      evt.preventDefault();

      var scorecardState = this.state.get('scorecard');
      var view = scorecardState.get('view');

      var target = evt.target;
      var value = target.dataset.view;

      if (value === view) {
        return false;
      }

      scorecardState.set({ 'view': value });
    },

    onViewChange: function onViewChange() {
      this.render();
    },

    render: function render() {
      var _this = this;

      if (!this.state.get('report_active')) return;

      var id = this.state.get('building');
      var year = this.state.get('year');
      var buildings = this.state.get('allbuildings');

      var city = this.state.get('city');
      var table = city.get('table_name');
      var years = _.keys(city.get('years')).map(function (d) {
        return +d;
      }).sort(function (a, b) {
        return a - b;
      });

      if (this.scoreCardData && this.scoreCardData.id === id) {
        this.show(buildings, this.scoreCardData.data, year, years);
      } else {
        var yearWhereClause = years.reduce(function (a, b) {
          if (!a.length) return 'year=' + b;
          return a + (' OR year=' + b);
        }, '');

        // Get building data for all years
        d3.json('https://cityenergy-seattle.carto.com/api/v2/sql?q=SELECT+ST_X(the_geom)+AS+lng%2C+ST_Y(the_geom)+AS+lat%2C*+FROM+' + table + '+WHERE+id=' + id + ' AND(' + yearWhereClause + ')', function (payload) {
          if (!_this.state.get('report_active')) return;

          if (!payload) {
            console.error('There was an error loading building data for the scorecard');
            return;
          }

          var data = {};
          payload.rows.forEach(function (d) {
            data[d.year] = _extends({}, d);
          });

          _this.scoreCardData = {
            id: _this.state.get('building'),
            data: data
          };

          _this.show(buildings, data, year, years);
        });
      }
    },

    show: function show(buildings, building_data, selected_year, avail_years) {
      this.processBuilding(buildings, building_data, selected_year, avail_years);
    },

    getColor: function getColor(field, value) {
      if (!this.metricFilters || !this.metricFilters._wrapped) return '#f1f1f1';

      // TODO: fix hacky way to deal w/ quartiles
      var filter = this.metricFilters._wrapped.find(function (item) {
        if (item.layer.id === 'site_eui_quartiles') {
          if (field === 'site_eui_quartiles') return true;
          return false;
        }

        return item.viewType === 'filter' && item.layer.field_name === field;
      });

      if (!filter) return 'red';

      return filter.getColorForValue(value);
    },

    getCompareChartBinnedData: function getCompareChartBinnedData(config, buildings, prop_type, view, selected_year) {
      var compareField = this.getViewField(view);

      var buildingsOfType = buildings.where({ property_type: prop_type }).map(function (m) {
        return m.toJSON();
      });

      var buildingsOfType_max = d3.max(buildingsOfType, function (d) {
        if (d.hasOwnProperty(compareField)) return d[compareField];
        return 0;
      });

      var buildingsOfType_min = d3.min(buildingsOfType, function (d) {
        if (d.hasOwnProperty(compareField)) return d[compareField];
        return 0;
      });

      var _bins;
      if (view === 'eui') {
        _bins = this.calculateEuiBins(buildingsOfType_min, buildingsOfType_max, config.thresholds.eui[prop_type][selected_year], config.thresholds.eui_schema);
      } else {
        _bins = this.calculateEnergyStarBins(config.thresholds.energy_star);
      }

      var data = d3.layout.histogram().bins(_bins).value(function (d) {
        return d[compareField];
      })(buildingsOfType);

      data.forEach(function (d, i) {
        d.min = _bins[i];
        d.max = _bins[i + 1];
      });

      return data;
    },

    getCompareChartColor: function getCompareChartColor(data, thresholds, id) {
      var selectedIndex = null;

      data.forEach(function (d, i) {
        if (selectedIndex !== null) return;

        var f = d.find(function (r) {
          return r.id === id;
        });

        if (f) selectedIndex = i;
      });

      var threshold = thresholds.filter(function (d) {
        return selectedIndex >= d.indices[0] && selectedIndex <= d.indices[1];
      })[0];
      return threshold.clr;
    },

    getViewField: function getViewField(view) {
      return view === 'eui' ? 'site_eui' : 'energy_star_score';
    },

    energyStarCertified: function energyStarCertified(view, building, config) {
      if (view === 'eui') return false;

      var certifiedField = config.certified_field || null;

      if (certifiedField === null) return false;

      return !!building[certifiedField];
    },

    processBuilding: function processBuilding(buildings, building_data, selected_year, avail_years) {
      var _this2 = this;

      var building = building_data[selected_year];
      var view = this.state.get('scorecard').get('view');

      var name = building.property_name;
      var sqft = +building.reported_gross_floor_area;
      var prop_type = building.property_type;
      var id = building.id;

      var config = this.state.get('city').get('scorecard');

      var viewSelector = '#scorecard-view';
      var el = this.$el.find(viewSelector);
      var compareField = this.getViewField('eui');

      var value = building.hasOwnProperty(compareField) ? building[compareField] : null;
      var data = this.getCompareChartBinnedData(config, buildings, prop_type, 'eui', selected_year);

      var thresholds = this.getThresholdLabels(config.thresholds.eui_schema);
      var valueColor = this.getColor(compareField, value);
      if (compareField === 'site_eui') {
        valueColor = this.getCompareChartColor(data, thresholds, id);
      }
      if (!_.isNumber(value) || !_.isFinite(value)) {
        value = null;
        valueColor = '#aaa';
      }

      var chartdata = this.prepareCompareChartData(config, buildings, building, selected_year, 'eui', prop_type, id);
      var essChartData = this.prepareCompareChartData(config, buildings, building, selected_year, 'ess', prop_type, id);

      el.html(this.template({
        active: 'active',
        name: name,
        addr1: building.reported_address,
        addr2: this.addressLine2(building),
        sqft: sqft.toLocaleString(),
        type: prop_type,
        id: id,
        year: selected_year,
        year_built: building.yearbuilt,
        view: view,
        ess_logo: this.energyStarCertified('eui', building, config),
        value: value,
        valueColor: valueColor,
        costs: this.costs(building, selected_year),
        compareEui: this.compare(building, 'eui', config, chartdata),
        compareEss: this.compare(building, 'ess', config, essChartData)
      }));

      // set chart hash
      if (!this.charts.hasOwnProperty('eui')) this.charts['eui'] = {};

      // render fuel use chart
      if (!this.charts['eui'].chart_fueluse) {
        var emissionsChartData = this.prepareEmissionsChartData(buildings, prop_type);
        this.charts['eui'].chart_fueluse = new FuelUseView({
          formatters: this.formatters,
          data: [building],
          name: name,
          year: selected_year,
          parent: el[0],
          emissionsChartData: emissionsChartData
        });
      }

      el.find('#fuel-use-chart').html(this.charts['eui'].chart_fueluse.render());
      this.charts['eui'].chart_fueluse.fixlabels(viewSelector);
      this.charts['eui'].chart_fueluse.afterRender();

      // render Energy Use Trends chart
      if (!this.charts['eui'].chart_shift) {
        var shiftConfig = config.change_chart.building;
        var previousYear = avail_years[0];
        var hasPreviousYear = previousYear !== selected_year;

        var change_data = hasPreviousYear ? this.extractChangeData(building_data, buildings, building, shiftConfig) : null;

        this.charts['eui'].chart_shift = new ShiftView({
          formatters: this.formatters,
          data: change_data,
          no_year: !hasPreviousYear,
          previous_year: previousYear,
          selected_year: selected_year,
          view: 'eui'
        });
      }

      if (this.charts['eui'].chart_shift) {
        this.charts['eui'].chart_shift.render(function (t) {
          el.find('#compare-shift-chart').html(t);
        }, viewSelector);
      }

      // Render compare charts
      this.renderCompareChart(config, chartdata, 'eui', prop_type, name, viewSelector);
      this.renderCompareChart(config, essChartData, 'ess', prop_type, name, viewSelector + ' .screen-only');
      this.renderCompareChart(config, essChartData, 'ess', prop_type, name, viewSelector + ' .print-only');

      if (!this.commentview) {
        this.commentview = new CommentView({ building: building });

        this.commentview.render(function (markup) {
          _this2.parentEl.find('#building-comments').html(markup);
        });
      }
    },

    addressLine2: function addressLine2(building) {
      var city = building.city;
      var state = building.state;
      var zip = building.zip;

      var addr = city;
      if (state) {
        addr += ' ' + state;
      }
      if (zip) {
        addr += ' ' + zip;
      }

      return addr;
    },

    costs: function costs(building, year) {
      //  ft²
      var per_sqft = building.cost_sq_ft;
      if (per_sqft === null) {
        per_sqft = '0';
      } else {
        per_sqft = this.formatters.currency(per_sqft);
      }

      var annual = building.cost_annual;
      if (annual === null) {
        annual = '0';
      } else {
        annual = this.formatters.currency_zero(annual);
      }

      var save_pct = building.percent_save;
      if (save_pct === null) {
        save_pct = '0';
      } else {
        save_pct = this.formatters.percent(save_pct);
      }

      var savings = building.amount_save;
      if (savings === null) {
        savings = '0';
      } else {
        savings = this.formatters.currency_zero(savings);
      }

      return {
        per_sqft: per_sqft,
        annual: annual,
        save_pct: save_pct,
        savings: savings
      };
    },

    viewlabels: function viewlabels(view, config) {
      return {
        view: view,
        label_long: config.labels[view].long,
        label_short: config.labels[view].short
      };
    },

    compare: function compare(building, view, config, chartdata) {
      var change_pct;
      var change_label;
      var isValid;
      var compareConfig = config.compare_chart;

      if (view === 'eui') {
        change_pct = building.percent_from_median;
        isValid = _.isNumber(change_pct) && _.isFinite(change_pct);
        change_pct = this.formatters.percent(change_pct);

        change_label = building.higher_or_lower.toLowerCase();
      } else {
        change_pct = Math.abs(chartdata.building_value - chartdata.mean);
        isValid = _.isNumber(change_pct) && _.isNumber(chartdata.building_value) && _.isFinite(change_pct);
        change_pct = this.formatters.fixedZero(change_pct);

        change_label = chartdata.building_value >= chartdata.mean ? 'higher' : 'lower';
      }

      var o = {
        isValid: isValid,
        change_label: change_label,
        change_pct: change_pct,
        error: !isValid ? compareConfig.nodata[view] : ''
      };

      return o;
    },

    calculateEuiBins: function calculateEuiBins(data_min, data_max, thresholds, schema) {
      var me = this;
      var _bins = [];
      var min;
      var max;

      schema.forEach(function (d, i) {
        min = thresholds[i - 1] ? thresholds[i - 1] : data_min;
        max = thresholds[i] ? thresholds[i] : data_max;

        me.binRange(min, max, d.steps, _bins);
      });

      _bins.push(data_max);

      return _bins.sort(function (a, b) {
        return a - b;
      });
    },

    calculateEnergyStarBins: function calculateEnergyStarBins(thresholds) {
      var me = this;
      var _bins = [];

      _bins.push(thresholds[thresholds.length - 1].range[1]);

      thresholds.forEach(function (d, i) {
        me.binRange(d.range[0], d.range[1], d.steps, _bins);
      });

      return _bins.sort(function (a, b) {
        return a - b;
      });
    },

    binRange: function binRange(min, max, steps, arr) {
      var step = (max - min) / (steps + 1);

      var s = min;
      arr.push(min);
      for (var i = 0; i < steps; i++) {
        s += step;
        arr.push(s);
      }
    },

    getThresholdLabels: function getThresholdLabels(thresholds) {
      var prev = 0;
      return thresholds.map(function (d, i) {
        var start = prev;
        var end = start + d.steps;
        prev = end + 1;

        return {
          label: d.label,
          clr: d.color,
          indices: [start, end]
        };
      });
    },

    validNumber: function validNumber(x) {
      return _.isNumber(x) && _.isFinite(x);
    },

    prepareCompareChartData: function prepareCompareChartData(config, buildings, building, selected_year, view, prop_type, id) {
      var buildingsOfType = buildings.where({ property_type: prop_type }).map(function (m) {
        return m.toJSON();
      });
      var compareField = this.getViewField(view);
      var building_value = building.hasOwnProperty(compareField) ? building[compareField] : null;

      if (!this.validNumber(building_value)) {
        building_value = null;
      }
      var data = this.getCompareChartBinnedData(config, buildings, prop_type, view, selected_year);

      var thresholds = void 0;
      if (view === 'eui') {
        thresholds = this.getThresholdLabels(config.thresholds.eui_schema);
      } else {
        thresholds = this.getThresholdLabels(config.thresholds.energy_star);
      }

      var selectedIndex = null;
      var avgIndex = null;

      data.forEach(function (d, i) {
        if (selectedIndex !== null) return;

        var f = d.find(function (r) {
          return r.id === id;
        });

        if (f) selectedIndex = i;
      });

      var avg = view === 'eui' ? building.building_type_eui : d3.mean(buildingsOfType, function (d) {
        return d[compareField];
      });

      if (view !== 'eui') {
        avg = Math.round(avg);
      } else {
        avg = +this.formatters.fixedOne(avg);
      }

      data.forEach(function (d, i) {
        if (avgIndex !== null) return;

        var next = data[i + 1] || null;

        if (next === null) {
          avgIndex = i;
          return;
        }

        if (avg >= d.min && avg < next.min) avgIndex = i;
      });

      var avgColor = void 0;
      var selectedColor = void 0;

      if (compareField === 'site_eui') {
        selectedColor = this.getCompareChartColor(data, thresholds, id);

        thresholds.forEach(function (d) {
          if (avgIndex >= d.indices[0] && avgIndex <= d.indices[1]) {
            avgColor = d.clr;
          }
        });
      } else {
        avgColor = this.getColor(compareField, avg);
        selectedColor = this.getColor(compareField, building_value);
      }

      if (!this.validNumber(avg)) avg = null;

      return {
        selectedIndex: selectedIndex,
        avgIndex: avgIndex,
        data: data,
        thresholds: thresholds,
        building_value: building_value,
        compareField: compareField,
        avgColor: avgColor,
        selectedColor: selectedColor,
        mean: avg
      };
    },

    prepareEmissionsChartData: function prepareEmissionsChartData(buildings, property_type) {
      var buildingsOfType = buildings.where({ property_type: property_type }).map(function (m) {
        return m.toJSON();
      });
      return buildingsOfType.map(function (building) {
        return {
          id: building.id,
          eui: building.site_eui,
          emissions: building.total_ghg_emissions,
          emissionsIntensity: building.total_ghg_emissions_intensity
        };
      }).filter(function (d) {
        return d.eui != null && d.emissionsIntensity != null;
      });
    },

    renderCompareChart: function renderCompareChart(config, chartdata, view, prop_type, name, viewSelector) {
      var container = d3.select(viewSelector);
      var rootElm = container.select('.' + view + '-compare-chart');

      if (chartdata.selectedIndex === null && (chartdata.avgIndex === null || chartdata.mean === null)) {
        console.warn('Could not find required data!', view, chartdata);
        return;
      }

      var outerWidth = rootElm.node().offsetWidth;
      var outerHeight = rootElm.node().offsetHeight;

      // Don't bother rendering a chart if it will be invisible
      if (outerWidth <= 0 || outerHeight <= 0) return;

      var compareChartConfig = config.compare_chart;
      var margin = { top: 80, right: 30, bottom: 40, left: 40 };
      var width = outerWidth - margin.left - margin.right;
      var height = outerHeight - margin.top - margin.bottom;

      if (chartdata.building_value === null) margin.top = 20;

      var x = d3.scale.ordinal().rangeRoundBands([0, width], 0.3, 0).domain(chartdata.data.map(function (d) {
        return d.x;
      }));

      var y = d3.scale.linear().domain([0, d3.max(chartdata.data, function (d) {
        return d.y;
      })]).range([height, 0]);

      var svg = rootElm.append('svg').attr('width', outerWidth).attr('height', outerHeight).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      svg.append('g').attr('class', 'y axis').call(d3.svg.axis().scale(y).orient('left').ticks(5).outerTickSize(0).innerTickSize(2));

      var threshold = svg.append('g').attr('class', 'x axis').attr('transform', function (d) {
        return 'translate(0,' + (height + 10) + ')';
      }).selectAll('.threshold').data(chartdata.thresholds).enter().append('g').attr('class', 'threshold').attr('transform', function (d) {
        var indices = d.indices;
        var start = x(chartdata.data[indices[0]].x);
        return 'translate(' + start + ',0)';
      });

      threshold.append('line').attr('x1', 0).attr('x2', function (d) {
        var indices = d.indices;
        var start = x(chartdata.data[indices[0]].x);
        var end = x(chartdata.data[indices[1]].x) + x.rangeBand();
        return end - start;
      }).attr('fill', 'none').attr('stroke', function (d) {
        return d.clr;
      });

      threshold.append('text').attr('fill', function (d) {
        return d.clr;
      }).attr('dy', 14).attr('dx', function (d) {
        var indices = d.indices;
        var start = x(chartdata.data[indices[0]].x);
        var end = x(chartdata.data[indices[1]].x) + x.rangeBand();
        var middle = (end - start) / 2;
        return middle;
      }).attr('text-anchor', function (d, i) {
        if (i === 0 && view === 'eui') {
          return 'end';
        }
        if (i === 2 && view === 'eui') return 'start';

        return 'middle';
      }).text(function (d) {
        return d.label;
      });

      // Show min and max on Energy Star chart
      if (view === 'ess') {
        svg.select('.x.axis').selectAll('.label').data([1, 100]).enter().append('g').attr('class', 'label').attr('transform', function (d) {
          var labelX = d === 1 ? 0 : width - 5;
          return 'translate(' + labelX + ', 3)';
        }).append('text').text(function (d) {
          return d;
        });
      }

      svg.append('g').attr('class', 'label').attr('transform', function (d) {
        return 'translate(' + -30 + ',' + height / 2 + ')';
      }).append('text').text(compareChartConfig.y_label).attr('text-anchor', 'middle').attr('transform', 'rotate(-90)');

      svg.append('g').attr('class', 'label').attr('transform', function (d) {
        return 'translate(' + width / 2 + ',' + (height + 40) + ')';
      }).append('text').text(compareChartConfig.x_label[view]).attr('text-anchor', 'middle');

      var bar = svg.selectAll('.bar').data(chartdata.data).enter().append('g').attr('class', 'bar').attr('transform', function (d) {
        return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
      });

      bar.append('rect').attr('x', 1).attr('width', x.rangeBand()).attr('height', function (d) {
        return height - y(d.y);
      }).attr('class', function (d, i) {
        if (i === chartdata.selectedIndex) return 'building-bar selected';
        if (i === chartdata.avgIndex) return 'avg-bar selected';
        return null;
      }).style('fill', function (d, i) {
        if (i === chartdata.selectedIndex) {
          if (chartdata.building_value === null) return '#F1F1F1';
          return chartdata.selectedColor;
        }

        if (i === chartdata.avgIndex) {
          return chartdata.avgColor;
        }

        return '#F1F1F1';
      }).attr('title', function (d) {
        return '>= ' + d.x + ' && < ' + (d.x + d.dx);
      });

      // Set selected building marker
      var xBandWidth = x.rangeBand();
      var xpos = chartdata.selectedIndex === null ? 0 : x(chartdata.data[chartdata.selectedIndex].x) + xBandWidth / 2;
      var ypos = chartdata.selectedIndex === null ? 0 : y(chartdata.data[chartdata.selectedIndex].y);

      var selectedCityHighlight = container.select('.' + view + '-compare-chart').append('div').attr('class', 'selected-city-highlight-html').style('top', margin.top - 70 + 'px').style('left', margin.left + xpos + 'px').style('display', function (d) {
        return chartdata.selectedIndex === null || chartdata.building_value === null ? 'none' : null;
      });

      var circle = selectedCityHighlight.append('div').attr('class', 'circle');

      var innerCircle = circle.append('div').attr('class', 'inner');
      var outerCircle = circle.append('div').classed({
        outer: true,

        // Overflow if the left pos and width (150) exceed chart's width
        overflow: xpos + margin.left + 60 + 150 > outerWidth
      });

      innerCircle.append('p').text(chartdata.building_value).style('color', chartdata.selectedColor);

      innerCircle.append('p').html(compareChartConfig.highlight_metric[view]).style('color', chartdata.selectedColor);

      outerCircle.append('p').text(name);

      selectedCityHighlight.append('div').attr('class', 'line').style('height', ypos + 5 + 'px');

      // Set average label and fill
      if (chartdata.avgIndex === null) return;
      if (chartdata.mean === null) return;

      xpos = x(chartdata.data[chartdata.avgIndex].x);

      var avgPadding = 5;
      var avgClass = 'avg-highlight-html';
      if (chartdata.avgIndex >= chartdata.selectedIndex) {
        xpos += xBandWidth + avgPadding;
      } else {
        xpos -= 100 + avgPadding;
        avgClass += ' align-right';
      }

      ypos = y(chartdata.data[chartdata.avgIndex].y); // top of bar

      var avgHighlight = container.select('.' + view + '-compare-chart').append('div').attr('class', avgClass).style('top', margin.top + ypos + 'px').style('left', margin.left + xpos + 'px');

      var avgHighlightContent = avgHighlight.append('div');

      avgHighlightContent.append('p').text('Building type average');

      avgHighlightContent.append('p').text(chartdata.mean).style('color', chartdata.avgColor);

      avgHighlightContent.append('p').html(compareChartConfig.highlight_metric[view]).style('color', chartdata.avgColor);

      // fix avgHighlight going to deep
      var avgBoxHeight = avgHighlight.node().offsetHeight;
      if (ypos + avgBoxHeight > height) {
        ypos += height - (ypos + avgBoxHeight);
        avgHighlight.style('top', margin.top + ypos + 'px');
      }
    },

    extractChangeData: function extractChangeData(yearly, buildings, building, config) {
      var _this3 = this;

      var o = [];
      var colorScales = {};
      config.metrics.forEach(function (metric) {
        if (metric.colorize && !colorScales.hasOwnProperty(metric.field)) {
          var gradientCalculator = new BuildingColorBucketCalculator(buildings, metric.field, metric.range_slice_count, metric.color_range, null, null);

          var scale = gradientCalculator.colorGradient().copy();
          var domain = scale.domain();
          var len = domain.length - 1;

          if (building[metric.field] > domain[len]) {
            domain[len] = building[metric.field];
          }

          scale.domain(domain);

          colorScales[metric.field] = scale;
        }
      });

      Object.keys(yearly).forEach(function (year) {
        var bldings = yearly[year];
        config.metrics.forEach(function (metric) {
          var label = '';
          if (metric.label.charAt(0) === '{') {
            var labelKey = metric.label.replace(/\{|\}/gi, '');
            label = bldings[labelKey];
          } else {
            label = metric.label;
          }

          var value = bldings[metric.field];

          if (!_this3.validNumber(value)) {
            value = null;
          } else {
            value = +value.toFixed(1);
          }

          var clr = colorScales.hasOwnProperty(metric.field) && metric.colorize ? colorScales[metric.field](value) : null;

          o.push({
            label: label,
            field: metric.field,
            value: value,
            clr: clr,
            year: +year,
            colorize: metric.colorize,
            unit: metric.unit || '',
            influencer: metric.influencer
          });
        });
      });

      return o.sort(function (a, b) {
        return a.year - b.year;
      });
    }
  });

  return BuildingScorecard;
});
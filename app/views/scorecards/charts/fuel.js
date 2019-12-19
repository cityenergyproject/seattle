'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

define(['jquery', 'underscore', 'backbone', 'd3', 'text!templates/scorecards/charts/fueluse.html'], function ($, _, Backbone, d3, FuelUseTemplate) {
  var FuelUseView = Backbone.View.extend({
    className: 'fueluse-chart',

    TYPICAL_CAR_EMMISSION: 4.7,

    initialize: function initialize(options) {
      this.template = _.template(FuelUseTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.emissionsChartData = options.emissionsChartData;
      this.building_name = options.name || '';
      this.year = options.year || '';
      this.isCity = options.isCity || false;
      this.viewParent = options.parent;

      this.fuels = [{
        label: 'Gas',
        key: 'gas'
      }, {
        label: 'Electric',
        key: 'electricity'
      }, {
        label: 'Steam',
        key: 'steam'
      }];
    },

    getMean: function getMean(key, data) {
      if (data.pluck) {
        return d3.mean(data.pluck(key));
      } else {
        return d3.mean(data.map(function (d) {
          return d[key];
        }));
      }
    },

    getSum: function getSum(key, data) {
      if (data.pluck) {
        return d3.sum(data.pluck(key));
      } else {
        return d3.sum(data.map(function (d) {
          return d[key];
        }));
      }
    },

    pctFormat: function pctFormat(n) {
      var val = n * 100;
      return d3.format('.0f')(val);
    },

    validNumber: function validNumber(n) {
      return _.isNumber(n) && _.isFinite(n);
    },

    validFuel: function validFuel(pct, amt) {
      return this.validNumber(pct) && pct > 0 && this.validNumber(amt) && amt > 0;
    },

    getBuildingFuels: function getBuildingFuels(fuels, data) {
      var _this = this;

      fuels.forEach(function (d) {
        var emmission_pct = _this.getMean(d.key + '_ghg_percent', data);
        var emmission_amt = _this.getMean(d.key + '_ghg', data);
        var usage_pct = _this.getMean(d.key + '_pct', data);
        var usage_amt = _this.getMean(d.key, data);

        d.emissions = {};
        d.emissions.isValid = _this.validFuel(emmission_pct, emmission_amt);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;
        d.emissions.pct_actual = emmission_pct;
        d.emissions.amt = emmission_amt;
        d.emissions.cars = _this.formatters.fixedOne(emmission_amt / _this.TYPICAL_CAR_EMMISSION);

        d.usage = {};
        d.usage.isValid = _this.validFuel(usage_pct, usage_amt);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
        d.usage.pct_actual = usage_pct;
        d.usage.amt = usage_amt;
      });

      return fuels.filter(function (d) {
        return d.usage.isValid || d.emissions.isValid;
      });
    },

    getCityWideFuels: function getCityWideFuels(fuels, data) {
      var _this2 = this;

      var total_emissions = data.total_emissions;
      var total_usage = data.total_consump;

      fuels.forEach(function (d) {
        var emission_key = 'pct_' + d.key + '_ghg';
        var usage_key = 'pct_' + d.key;

        var emmission_pct = data[emission_key];
        var usage_pct = data[usage_key];

        d.emissions = {};
        d.emissions.isValid = _this2.validFuel(emmission_pct, total_emissions);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;
        d.emissions.pct_actual = emmission_pct;

        d.usage = {};
        d.usage.isValid = _this2.validFuel(usage_pct, total_usage);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
        d.usage.pct_actual = usage_pct;
      });

      return fuels.filter(function (d) {
        return d.usage.isValid && d.emissions.isValid;
      });
    },

    fixPercents: function fixPercents(fuels, prop) {
      var values = fuels.map(function (d, i) {
        var decimal = +(d[prop].pct_raw % 1);
        var val = Math.floor(d[prop].pct_raw);
        return {
          idx: i,
          val: val,
          iszero: val === 0,
          decimal: val === 0 ? 1 : decimal
        };
      }).sort(function (a, b) {
        return b.decimal - a.decimal;
      });

      var sum = d3.sum(values, function (d) {
        return d.val;
      });

      var diff = 100 - sum;

      values.forEach(function (d) {
        if (diff === 0) return;

        diff -= 1;
        d.val += 1;

        d.iszero = false;
      });

      // we need to bump up zero values
      var zeros = values.filter(function (d) {
        return d.iszero;
      });
      var zeros_length = zeros.length;

      if (zeros_length > 0) {
        while (zeros_length > 0) {
          zeros_length--;
          values.forEach(function (d) {
            if (!d.iszero && d.val > 1) {
              d.val -= 1;
            }

            if (d.iszero) {
              d.val += 1;
            }
          });
        }
      }

      values.forEach(function (d) {
        fuels[d.idx][prop].pct = d.val;
        fuels[d.idx][prop].pct_raw = d.val;
      });
    },

    chartData: function chartData() {
      var data = this.data;

      var total_ghg_emissions = void 0;
      var total_ghg_emissions_intensity = void 0;
      var total_usage = void 0;

      var fuels = void 0;
      if (this.isCity) {
        fuels = this.getCityWideFuels([].concat(_toConsumableArray(this.fuels)), data);
        total_ghg_emissions = data.total_emissions;
        total_ghg_emissions_intensity = data.total_emissions_intensity;
        total_usage = data.total_consump;
      } else {
        fuels = this.getBuildingFuels([].concat(_toConsumableArray(this.fuels)), data);
        total_ghg_emissions = this.getSum('total_ghg_emissions', data);
        total_ghg_emissions_intensity = this.getSum('total_ghg_emissions_intensity', data);
        total_usage = this.getSum('total_kbtu', data);
      }

      this.fixPercents(fuels, 'emissions');
      this.fixPercents(fuels, 'usage');

      var totals = {
        usage: d3.format(',d')(d3.round(total_usage, 0)),
        emissions: d3.format(',d')(d3.round(total_ghg_emissions, 0))
      };

      return {
        fuels: fuels,
        totals: totals,
        total_ghg_emissions: total_ghg_emissions,
        total_ghg_emissions_intensity: total_ghg_emissions_intensity,
        isCity: this.isCity,
        building_name: this.building_name,
        year: this.year,
        emission_klass: fuels.length === 1 ? 'onefuel' : '',
        cars: this.formatters.fixedOne(total_ghg_emissions / this.TYPICAL_CAR_EMMISSION)
      };
    },

    getLabelSizes: function getLabelSizes(labels) {
      var sizes = [];

      labels.each(function () {
        var pw = this.offsetWidth;
        var cw = this.firstChild.offsetWidth;

        if (pw === 0) return;

        sizes.push({
          elm: this,
          pw: pw,
          cw: cw,
          dirty: cw > pw,
          pct: +this.style.width.replace('%', '')
        });
      });

      return sizes;
    },

    adjSizes: function adjSizes(labels, ct) {
      var sizes = this.getLabelSizes(labels);

      if (!sizes.length) return;

      var ctr = ct || 0;
      ctr += 1;
      if (ctr > 100) return;

      var dirty = _.findIndex(sizes, function (d) {
        return d.dirty;
      });

      if (dirty > -1) {
        var available = sizes.filter(function (d) {
          return !d.dirty;
        });

        var additional = 0;

        available.forEach(function (d) {
          additional += 1;
          d3.select(d.elm).style('width', d.pct - 1 + '%');
        });

        d3.select(sizes[dirty].elm).style('width', sizes[dirty].pct + additional + '%');

        this.adjSizes(labels, ctr);
      }
    },

    hideLabels: function hideLabels(labels) {
      var sizes = this.getLabelSizes(labels);
      sizes.forEach(function (d) {
        if (d.dirty) {
          d3.select(d.elm.firstChild).style('display', 'none');
        }
      });
    },

    findQuartile: function findQuartile(quartiles, value) {
      var i = 1;
      for (; i <= quartiles.length; i++) {
        if (value < quartiles[i - 1]) return i;
      }
      return i - 1;
    },


    renderEmissionsChart: function renderEmissionsChart(data) {
      var _this3 = this;

      var selectedBuilding = this.data[0];
      var averageEmissionsIntensity = d3.mean(data.map(function (d) {
        return d.emissionsIntensity;
      }));

      var parent = d3.select(this.viewParent).select('.emissions-intensity-chart');
      if (!parent.node()) return;

      var outerWidth = parent.node().offsetWidth;
      var outerHeight = 300;

      var margin = { top: 50, right: 30, bottom: 40, left: 40 };
      var width = outerWidth - margin.left - margin.right;
      var height = outerHeight - margin.top - margin.bottom;

      var svg = parent.append('svg').attr('viewBox', '0 0 ' + outerWidth + ' ' + outerHeight);

      var container = svg.append('g').attr('width', width).attr('height', height).attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

      var maxEmissionsIntensity = d3.max(data.map(function (r) {
        return r.emissionsIntensity;
      }));
      var x = d3.scale.linear().domain([0, maxEmissionsIntensity * 1.05]).range([0, width]);

      var maxEui = d3.max(data.map(function (r) {
        return r.eui;
      }));
      var y = d3.scale.linear().domain([0, maxEui * 1.15]).range([height, 0]);

      var size = d3.scale.linear().domain([0, d3.max(data.map(function (r) {
        return r.emissions;
      }))]).range([5, 25]);

      var xAxis = d3.svg.axis().orient('bottom').outerTickSize(0).innerTickSize(2).scale(x);
      svg.append('g').attr('class', 'x axis').attr('transform', 'translate(' + margin.left + ', ' + (height + margin.top) + ')').call(xAxis);

      var yAxis = d3.svg.axis().orient('left').outerTickSize(0).innerTickSize(2).scale(y);
      svg.append('g').attr('class', 'y axis').attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')').call(yAxis);

      svg.append('g').classed('label', true).attr('transform', 'translate(' + (margin.left + width / 2) + ', ' + (height + margin.top + 30) + ')').append('text').attr('text-anchor', 'middle').text('GHG Emissions Per Square Foot');

      svg.append('g').classed('label', true).attr('transform', 'translate(8, ' + (height / 2 + margin.top) + ') rotate(-90)').append('text').attr('text-anchor', 'middle').text('Energy Use Per Square Foot (EUI)');

      // Bring selected building to front
      var scatterpointData = data.slice();
      var buildingData = data.filter(function (d) {
        return d.id === selectedBuilding.id;
      })[0];
      if (buildingData) {
        scatterpointData.push(buildingData);
      }

      var quartileColors = {
        1: '#0047BA',
        2: '#90AE60',
        3: '#F7C34D',
        4: '#C04F31'
      };
      var emissionsIntensities = data.map(function (d) {
        return d.emissionsIntensity;
      }).sort();
      var quartiles = [0.25, 0.5, 0.75, 1].map(function (q) {
        return d3.quantile(emissionsIntensities, q);
      });

      container.selectAll('circle').data(scatterpointData).enter().append('circle').attr('cx', function (d) {
        return x(d.emissionsIntensity);
      }).attr('cy', function (d) {
        return y(d.eui);
      }).attr('r', function (d) {
        return size(d.emissions);
      }).attr('fill-opacity', function (d) {
        return d.id === selectedBuilding.id ? 1 : 0.35;
      }).attr('fill', function (d) {
        return quartileColors[_this3.findQuartile(quartiles, d.emissionsIntensity)];
      });

      // Show average intensity
      container.append('line').attr('stroke', '#D5D5D5').attr('stroke-dasharray', '8 5').attr('x1', x(averageEmissionsIntensity)).attr('x2', x(averageEmissionsIntensity)).attr('y1', y(0)).attr('y2', 0);

      // Draw line to selected building
      container.append('line').attr('stroke', '#1F5DBE').attr('x1', x(selectedBuilding.total_ghg_emissions_intensity)).attr('x2', x(selectedBuilding.total_ghg_emissions_intensity)).attr('y1', y(selectedBuilding.site_eui) - size(selectedBuilding.total_ghg_emissions) - 3).attr('y2', -margin.top);

      // Text for average
      var averageQuartile = this.findQuartile(quartiles, averageEmissionsIntensity);

      var averageTextGroup = svg.append('g').classed('callout-text callout-average-text', true).attr('transform', 'translate(' + (margin.left + x(averageEmissionsIntensity) + 5) + ', ' + margin.top + ')');

      averageTextGroup.append('text').attr('x', 0).attr('dy', '0').text('Building type average');

      averageTextGroup.append('text').text(d3.format('.2f')(averageEmissionsIntensity)).attr('x', 0).attr('dy', '.8em').classed('value quartile-' + averageQuartile, true);

      averageTextGroup.append('text').text('KG/SF').attr('x', 0).attr('dy', '2.7em').classed('units quartile-' + averageQuartile, true);

      // Text for selected building
      var selectedBuildingX = x(selectedBuilding.total_ghg_emissions_intensity);
      var selectedQuartile = this.findQuartile(quartiles, selectedBuilding.total_ghg_emissions_intensity);

      var selectedTextGroup = svg.append('g').classed('callout-text callout-selected-text', true);
      selectedTextGroup.append('text').text(selectedBuilding.property_name).classed('selected-label', true);

      selectedTextGroup.append('text').text(d3.format('.2f')(selectedBuilding.total_ghg_emissions_intensity)).attr('x', 0).attr('dy', '.8em').classed('value quartile-' + selectedQuartile, true);

      selectedTextGroup.append('text').text('KG/SF').attr('x', 0).attr('dy', '2.7em').classed('units quartile-' + selectedQuartile, true);

      var labelOnLeft = margin.left + selectedBuildingX + selectedTextGroup.node().getBBox().width > width;
      selectedTextGroup.attr('text-anchor', labelOnLeft ? 'end' : 'start').attr('transform', function () {
        var x = margin.left + selectedBuildingX + 5;
        if (labelOnLeft) {
          x -= 10;
        }
        return 'translate(' + x + ', 10)';
      });

      var legendParent = d3.select(this.viewParent).select('.emissions-dots');
      if (legendParent.node()) {
        var legendWidth = legendParent.node().offsetWidth;
        var dotMargin = 15;

        var dotScale = d3.scale.linear().domain(d3.extent(data.map(function (d) {
          return d.emissions;
        })));
        var dots = [0.1, 0.25, 0.5, 0.75, 1];

        var expectedWidth = dotMargin * (dots.length - 1) + d3.sum(dots.map(function (dot) {
          return size(dotScale.invert(dot)) * 2;
        }));

        var legendSvg = legendParent.append('svg').attr('viewBox', '0 0 ' + legendWidth + ' 100');
        var legendContainer = legendSvg.append('g').attr('transform', 'translate(' + (legendWidth - expectedWidth) / 2 + ', 15)');

        var xDotPosition = 0;
        var enterLegendDot = legendContainer.selectAll('.emissions-chart-legend-dot').data(dots).enter().append('g').classed('emissions-chart-legend-dot', true).attr('transform', function (d, i) {
          var r = size(dotScale.invert(d));
          xDotPosition += r;
          var translate = 'translate(' + xDotPosition + ', ' + (50 - r) + ')';
          xDotPosition += r + dotMargin;
          return translate;
        });

        enterLegendDot.append('circle').attr('cx', 0).attr('cy', 0).attr('r', function (d) {
          return size(dotScale.invert(d));
        }).attr('fill', function (d) {
          return '#B9B9B9';
        });

        enterLegendDot.append('text').attr('text-anchor', 'middle').classed('emissions-dots-label', true).text(function (d) {
          return d3.format('.2r')(dotScale.invert(d));
        }).attr('transform', function (d) {
          return 'translate(0, ' + (15 + size(dotScale.invert(d))) + ')';
        });
      }
    },

    fixlabels: function fixlabels(selector) {
      var chart = d3.select(selector).select('#fuel-use-chart');

      var headerLabels = chart.select('.fc-bars').selectAll('.fc-header');
      this.adjSizes(headerLabels, 0);

      var barLabels = chart.select('.fc-bars').selectAll('.fc-bar');
      this.hideLabels(barLabels);
    },

    render: function render() {
      return this.template(this.chartData());
    },

    afterRender: function afterRender() {
      if (!this.isCity) {
        this.renderEmissionsChart(this.emissionsChartData);
      }
    }
  });

  return FuelUseView;
});
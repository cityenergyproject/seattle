define([
  'jquery',
  'underscore',
  'backbone',
  './charts/fuel',
  'text!templates/scorecards/building.html'
], function($, _, Backbone, FuelUseView, BuildingTemplate){
  var BuildingScorecard = Backbone.View.extend({
    initialize: function(options){
      this.state = options.state;
      this.formatters = options.formatters;

      this.template = _.template(BuildingTemplate);

      return this;
    },

    events: {
      'click .sc-toggle--input': 'toggleView'
    },

    close: function() {
      this.scoreCardData = null;
    },

    toggleView: function(evt) {
      evt.preventDefault();

      var scorecardState = this.state.get('scorecard');
      var view = scorecardState.get('view');

      var target = evt.target;
      var value = target.dataset.view;

      if (value === view) {
        return false;
      }

      scorecardState.set({'view': value});
    },

    onViewChange: function() {
      this.render();
    },

    render: function() {
      if (!this.state.get('report_active')) return;

      var id = this.state.get('building');
      var year = this.state.get('year');
      var buildings = this.state.get('allbuildings');

      if (this.scoreCardData && this.scoreCardData.id === id) {
        this.show(buildings, this.scoreCardData.data, year);
      } else {
        // Temporary hack to get yearly data
        d3.json(`https://cityenergy-seattle.carto.com/api/v2/sql?q=SELECT+ST_X(the_geom)+AS+lng%2C+ST_Y(the_geom)+AS+lat%2C*+FROM+table_2015_stamen_phase_ii_v2_w_year+WHERE+id=${id}`, (d) => {
          if (!this.state.get('report_active')) return;

          this.scoreCardData = {
            id: this.state.get('building'),
            data: d
          };

          this.show(buildings, d, year);
        });
      }
    },

    show: function(buildings, building_data, selected_year) {
      this.processBuilding(buildings, building_data, selected_year, 'eui');
      this.processBuilding(buildings, building_data, selected_year, 'ess');
    },

    processBuilding: function(buildings, building_data, selected_year, view) {
      var scorecardState = this.state.get('scorecard');
      var data = {};
      building_data.rows.forEach(d => {
        data[d.year] = {...d};
      });

      var building = data[selected_year];
      console.log('building: ', building);
      var config = this.state.get('city').get('scorecard');

      var energy_fields = {
        source_eui: 'Source EUI',
        source_eui_wn: 'WN Source EUI',
        total_kbtu: 'Total Energy Use (kBtu)',
        total_ghg_emissions: 'Total Emisions',
        total_ghg_emissions_intensity: 'Emissions Intensity',
        comments: 'Comments'
      };

      var building_fields = {
        property_type: 'Primary Property Type',
        neighborhood: 'Neighborhood',
        councildistrict: 'Council District',
        yearbuilt: 'Year Built',
        numbuildings: 'Number of Buildings',
        numfloors: 'Number of Floors'
      };

      var viewSelector = `#${view}-scorecard-view`;
      var el = this.$el.find(viewSelector);
      var compareField = view === 'eui' ? 'site_eui' : 'energy_star_score';
      var value = building.hasOwnProperty(compareField) ? building[compareField] : null;

      var name = building.property_name; // building.get('property_name');
      var address = this.full_address(building);
      var sqft = +(building.reported_gross_floor_area);
      var prop_type = building.property_type;
      var id = building.id;
      var eui = building.site_eui;

      var chartdata = this.prepareCompareChartData(config, buildings, building, view, prop_type, id);
      const change_data = this.extractChangeData(data);

      el.html(this.template({
        active: 'active',
        name: name,
        addr: address,
        sqft: sqft.toLocaleString(),
        type: prop_type,
        id: id,
        year: selected_year,
        view: view,
        value: value,
        costs: this.costs(building, selected_year),
        compare: this.compare(building, view, config, chartdata),
        change: change_data.template,
        building_info: this.listdata(building, building_fields),
        energy_info: this.listdata(building, energy_fields)
      }));

      if (!this.chart_fueluse) {
        this.chart_fueluse = new FuelUseView({
          formatters: this.formatters,
          data: [building],
          name: name,
          year: selected_year
        });
      }

      el.find('#fuel-use-chart').html(this.chart_fueluse.render());
      this.chart_fueluse.fixlabels(viewSelector);

      this.renderChangeChart(change_data.chart, viewSelector);
      this.renderCompareChart(config, chartdata, view, prop_type, name, viewSelector);

    },

    full_address: function(building) {
      var zip = building.zip; // building.get('zip');
      var state = building.state; // building.get('state');
      var city = building.city; // building.get('city');
      var addr = building.reported_address; // building.get('reported_address');

      return addr + ', ' + city + ' ' + state + ' ' + zip;
    },

    costs: function(building, year) {
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
      }
    },

    listdata: function(building, fields) {
      return Object.keys(fields).map(f => {
        return {
          label: fields[f],
          val: (building.hasOwnProperty(f)) ? building[f] : ''
        };
      });
    },

    viewlabels: function(view, config) {
      return {
        view: view,
        label_long: config.labels[view].long,
        label_short: config.labels[view].short
      };
    },

    compare: function(building, view, config, chartdata) {
      var change_pct, change_label;
      if (view === 'eui') {
        change_pct = this.formatters.percent(building.percent_from_median);
        change_label = building.higher_or_lower.toLowerCase();
      } else {
        change_pct = this.formatters.percent( ((chartdata.building_value - chartdata.mean) / chartdata.building_value));
        change_label = (chartdata.building_value >= chartdata.mean) ? 'higher' : 'lower';
      }


      return {
        change_label: change_label,
        change_pct: change_pct
      }
    },

    calculateEuiBins: function(data_min, data_max, thresholds, schema) {
      var me = this;
      var _bins = [];
      var min, max;

      schema.forEach(function(d, i) {
        min = (thresholds[ i - 1 ]) ? thresholds[ i - 1 ] : data_min;
        max = (thresholds[ i ]) ? thresholds[ i ] : data_max;

        me.binRange(min, max, d.steps, _bins);
      });

      _bins.push(data_max);

      return _bins.sort(function(a, b) { return a - b; });
    },

    calculateEnergyStarBins: function(thresholds) {
      var me = this;
      var _bins = [];

      _bins.push( thresholds[thresholds.length - 1].range[1] );

      thresholds.forEach(function(d, i){
        me.binRange(d.range[0], d.range[1], d.steps, _bins);
      });

      return _bins.sort(function(a, b) { return a - b; });
    },

    binRange: function(min, max, steps, arr) {
      var step = (max - min) / (steps + 1);

      var s = min;
      arr.push(min);
      for (var i=0; i < steps; i++) {
        s += step;
        arr.push(s);
      }
    },

    getThresholdLabels: function(thresholds) {
      var _ = [];

      var prev = 0;
      return thresholds.map(function(d, i) {

        var start = prev;
        var end = start + d.steps;
        prev = end + 1;

        return {
          label: d.label,
          clr: d.color,
          indices: [start, end]
        }
      });
    },

    prepareCompareChartData: function(config, buildings, building, view, prop_type, id) {
      // view = 'ess';
      var compareField = view === 'eui' ? 'site_eui' : 'energy_star_score';
      var building_value = building.hasOwnProperty(compareField) ? building[compareField] : null;

      if (building_value === null) {

        building_value = 0;
        console.warn('Building has a NULL value!');
        // return;
      }

      var buildingsOfType = buildings.where({property_type: prop_type}).map(function(m) {
        return m.toJSON();
      });

      var buildingsOfType_max = d3.max(buildingsOfType, function(d){
        if (d.hasOwnProperty(compareField)) return d[compareField];
        return 0;
      });

      var buildingsOfType_min = d3.min(buildingsOfType, function(d){
        if (d.hasOwnProperty(compareField)) return d[compareField];
        return 0;
      });

      var _bins;
      var thresholds;
      if (view === 'eui') {
       _bins = this.calculateEuiBins(buildingsOfType_min, buildingsOfType_max, config.thresholds.eui[prop_type]['2015'], config.thresholds.eui_schema);
       thresholds = this.getThresholdLabels(config.thresholds.eui_schema);

      } else {
        thresholds = this.getThresholdLabels(config.thresholds.energy_star);
        _bins = this.calculateEnergyStarBins(config.thresholds.energy_star);
      }

      var data = d3.layout.histogram()
          .bins(_bins)
          .value(function(d) {
            return d[compareField];
          })(buildingsOfType);


      data.forEach(function(d, i) {
        d.min = _bins[i];
        d.max = _bins[i + 1];
      });


      var selectedIndex = null;
      var avgIndex = null;
      data.forEach(function(d, i) {
        if (selectedIndex !== null) return;

        var f = d.find(function(r){
          return r.id === id;
        });

        if (f) selectedIndex = i;
      });

      var avg = (view === 'eui') ?
        building.building_type_eui :
        d3.mean(buildingsOfType, function(d) { return d[compareField]; });

      data.forEach(function(d, i) {
        if (avgIndex !== null) return;

        var next = data[i + 1] || null;

        if (next === null) {
          avgIndex = i;
          return;
        }

        if (avg >= d.min && avg < next.min) avgIndex = i;
      });

      return {
        selectedIndex: selectedIndex,
        avgIndex: avgIndex,
        data: data,
        thresholds: thresholds,
        building_value: building_value,
        compareField: compareField,
        mean: avg
      }
    },

    renderCompareChart: function(config, chartdata, view, prop_type, name, viewSelector) {
      const container = d3.select(viewSelector);

      if (chartdata.selectedIndex === null || chartdata.avgIndex === null) {
        console.warn('Could not find required indexes!');
        return;
      }

      var compareChartConfig = config.compare_chart;
      var margin = {top: 80, right: 30, bottom: 40, left: 40},
          width = 620 - margin.left - margin.right,
          height = 300 - margin.top - margin.bottom;

      var x = d3.scale.ordinal()
          .rangeRoundBands([0, width], 0.3, 0)
          .domain(chartdata.data.map(function(d){ return d.x;}));

      var y = d3.scale.linear()
          .domain([0, d3.max(chartdata.data, function(d) { return d.y; })])
          .range([height, 0]);

      var svg = container.select("#compare-chart").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("g")
        .attr("class", "y axis")
        .call(d3.svg.axis().scale(y).orient("left").ticks(5).outerTickSize(0).innerTickSize(2));

      var threshold = svg.append('g')
        .attr('class', 'x axis')
        .attr("transform", function(d) { return "translate(0," + (height + 10) + ")"; })
        .selectAll('.threshold')
        .data(chartdata.thresholds)
        .enter()
        .append('g')
          .attr('class', 'threshold')
          .attr("transform", function(d) {
            var indices = d.indices;
            var start = x(chartdata.data[indices[0]].x);
            return "translate(" + start + ",0)";
          });

      threshold
        .append('line')
        .attr('x1', 0)
        .attr('x2', function(d) {
          var indices = d.indices;
          var start = x(chartdata.data[indices[0]].x);
          var end = x(chartdata.data[indices[1]].x) + x.rangeBand();
          return end - start;
        })
        .attr('stroke', function(d){ return d.clr; });

      threshold
        .append('text')
        .attr('fill', function(d){ return d.clr; })
        .attr('dy', 14)
        .attr('dx', function(d) {
          var indices = d.indices;
          var start = x(chartdata.data[indices[0]].x);
          var end = x(chartdata.data[indices[1]].x) + x.rangeBand();
          var middle = (end - start) / 2;
          return middle;
        })
        .attr('text-anchor', function(d, i){
          if (i === 0 && view === 'eui') {
            return 'end';
          }
          if (i === 2 && view === 'eui') return 'start';

          return 'middle';
        })
        .text(function(d){ return d.label; });

      svg
        .append('g')
        .attr('class', 'label')
        .attr("transform", function(d) { return "translate(" + (-30) + "," + (height / 2) + ")"; })
        .append('text')
        .text(compareChartConfig.y_label)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)');

      svg
        .append('g')
        .attr('class', 'label')
        .attr("transform", function(d) { return "translate(" + (width/2) + "," + (height + 40) + ")"; })
        .append('text')
        .text(compareChartConfig.x_label[view])
        .attr('text-anchor', 'middle');


      var bar = svg.selectAll(".bar")
          .data(chartdata.data)
        .enter().append("g")
          .attr("class", "bar")
          .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

      bar.append("rect")
          .attr("x", 1)
          .attr("width", x.rangeBand())
          .attr("height", function(d) { return height - y(d.y); })
          .attr('class', function(d, i) {
            if (i === chartdata.selectedIndex || i === chartdata.avgIndex) return 'selected';
            return null;
          })
          .attr('title', function(d) {
            return '>= ' + d.x + ' && < ' + (d.x + d.dx);
          });


      var xpos = x(chartdata.data[chartdata.selectedIndex].x)  + (x.rangeBand() / 2);
      var ypos = y(chartdata.data[chartdata.selectedIndex].y);


      var selectedCityHighlight = container.select("#compare-chart").append('div')
        .attr('class', 'selected-city-highlight-html')
        .style('top', (margin.top - 70) + 'px')
        .style('left', (margin.left + xpos) + 'px');


      var circle = selectedCityHighlight.append('div')
        .attr('class', 'circle');

      var innerCircle = circle.append('div').attr('class', 'inner');
      var outerCircle = circle.append('div').attr('class', 'outer');

      innerCircle.append('p')
        .text(chartdata.building_value);

      innerCircle.append('p')
        .html(compareChartConfig.highlight_metric[view]);

      outerCircle.append('p')
        .text(name);

      selectedCityHighlight.append('div')
        .attr('class', 'line')
        .style('height', (ypos + 5) + 'px');

      xpos = x(chartdata.data[chartdata.avgIndex].x)  + (x.rangeBand() / 2);
      ypos = y(chartdata.data[chartdata.avgIndex].y); // top of bar

      var avgHighlight = container.select("#compare-chart").append('div')
        .attr('class', 'avg-highlight-html')
        .style('top', (margin.top + ypos) + 'px')
        .style('left', (margin.left + xpos) + 'px')
        .append('div');

      avgHighlight.append('p')
        .text('Building type average');

      avgHighlight.append('p')
        .text(chartdata.mean.toFixed(2));

      avgHighlight.append('p')
        .html(compareChartConfig.highlight_metric[view]);
    },

    renderFuelUseChart: function(building) {
      var fuels = [
        {
          label: 'Natural Gas',
          key: 'gas'
        },
        {
          label: 'Electric',
          key: 'electricity'
        },
        {
          label: 'Steam',
          key: 'steam'
        }
      ];

      var pctFormat = function(n) {
        var val = n * 100;
        return d3.format('.0f')(val);
      }

      fuels.forEach(function(d) {
        d.emissions = {};
        d.emissions.pct = pctFormat(building[d.key + '_ghg_percent']);
        d.emissions.amt = building[d.key + '_ghg'];

        d.usage = {};
        d.usage.pct = pctFormat(building[d.key + '_pct']);
        d.usage.amt = building[d.key];
      });

      fuels = fuels.filter(function(d) {
        return d.usage.amt > 0 && d.emissions.amt > 0;
      });

      var totals = {
        usage: this.formatters.fixed(building.total_kbtu),
        emissions: this.formatters.fixed(building.total_ghg_emissions)
      };

      return {
        fuels: fuels,
        totals: totals,
        cars: this.formatters.fixedOne(building.total_ghg_emissions * 0.211)
      };

    },

    extractChangeData: function(buildings) {
      const o = [];
      const buildingYearlyEuis = {};
      Object.keys(buildings).forEach(year => {
        const building = buildings[year];

        buildingYearlyEuis[year] = building.site_eui_wn;

        o.push({
          label: building.property_name,
          value: +(building.site_eui_wn.toFixed(1)),
          year: year,
          isAvg: false
        });

        o.push({
          label: 'Building Type Average',
          value: +(building.building_type_eui.toFixed(1)),
          year: year,
          isAvg: true
        });
      });

      o.sort((a,b) => {
        return a.year - b.year;
      });

      const years = d3.extent(o, function(d){ return d.year;}).sort((a,b) => {
        return a.year - b.year;
      });

      let change;
      if (buildingYearlyEuis[years[1]] === 0) {
        change = -buildingYearlyEuis[years[0]];
      } else {
        change = ((buildingYearlyEuis[years[1]] - buildingYearlyEuis[years[0]]) / buildingYearlyEuis[years[1]]) * 100;
      }

      const direction = (change < 0) ? 'decreased' : 'increased';

      return {
        chart: o,
        template: {
          pct: this.formatters.fixedOne(Math.abs(change)) + '%',
          direction,
          years
        }
      };
    },

    renderChangeChart: function(data, viewSelector) {
      var container = d3.select(viewSelector);
      var rootElm = container.select('#change-chart-vis');
      var yearsElm = container.select('#change-chart-years');

      var diameter = 10;
      var yearExtent = d3.extent(data, function(d){ return d.year;});
      var valueExtent = d3.extent(data, function(d) { return d.value; });

      var yearWidth = yearsElm.select('p').node().offsetWidth;
      var baseWidth = yearsElm.node().offsetWidth - (yearWidth * 2);

      baseWidth += diameter;

      rootElm.style('margin-left', (yearWidth - diameter/2) + 'px');

      var margin = {top: 0, right: 0, bottom: 0, left: 0},
          width = baseWidth - margin.left - margin.right,
          height = rootElm.node().offsetHeight - margin.top - margin.bottom;

      var svg = rootElm.append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
        .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var x = d3.scale.ordinal()
          .range([0, width])
          .domain(yearExtent);

      var y = d3.scale.linear()
          .domain(valueExtent)
          .range([height, 0]);

      var line = d3.svg.line()
          .x(function(d) { return x(d.year); })
          .y(function(d) { return y(d.value); });

      var connections = d3.nest()
        .key(d => d.label)
        .entries(data);

      svg.selectAll('.line')
        .data(connections)
      .enter().append('path')
        .attr('class', 'line')
        .attr('d', d => line(d.values));

      var bar = svg.selectAll('.dot')
          .data(data)
        .enter().append('g')
          .attr('class', 'dot')
          .classed('avg', d => d.isAvg)
          .attr('transform', d => { return 'translate(' + x(d.year) + ',' + y(d.value) + ')'; });

      bar.append('circle')
        .attr('r', 5);

      var firstyear = x.domain()[0];
      var lastyear = x.domain()[1];

      var label = rootElm.selectAll('.label')
        .data(data)
      .enter().append('div')
        .attr('class', 'label')
        .classed('avg', d => d.isAvg)
        .style('left', d => {
          if (d.year === firstyear) return x(d.year) + 'px';
          return x(d.year) + 10 +'px';
        })
        .style('top',  d => { return y(d.value) + 'px'; });

      label.append('p')
        .text(d => d.value);
      label.append('p')
        .attr('class','metric small')
        .text('kbtu/sf');

      label.each(function(d) {
        var el = d3.select(this);
        var w = el.node().offsetWidth;

        if (d.year === firstyear) {
          el.style('margin-left', -(w + 10) + 'px');
        }
      });

      label.filter(d => d.year === lastyear)
        .append('span')
          .attr('class', 'building')
          .classed('avg', d => d.isAvg)
          .text(d => d.label);
    }
  });

  return BuildingScorecard;
});

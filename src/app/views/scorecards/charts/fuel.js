define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/scorecards/charts/fueluse.html'
], function($, _, Backbone, d3, FuelUseTemplate) {
  var FuelUseView = Backbone.View.extend({
    className: 'fueluse-chart',

    TYPICAL_CAR_EMMISSION: 4.7,

    initialize: function(options){
      this.template = _.template(FuelUseTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.emissionsChartData = options.emissionsChartData;
      this.building_name = options.name || '';
      this.year = options.year || '';
      this.isCity = options.isCity || false;

      this.fuels = [
        {
          label: 'Gas',
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
    },

    getMean: function(key, data) {
      if (data.pluck) {
        return d3.mean(data.pluck(key));
      } else {
        return d3.mean(data.map(d => d[key]));
      }
    },

    getSum: function(key, data) {
      if (data.pluck) {
        return d3.sum(data.pluck(key));
      } else {
        return d3.sum(data.map(d => d[key]));
      }
    },

    pctFormat: function(n) {
      var val = n * 100;
      return d3.format('.0f')(val);
    },

    validNumber: function(n) {
      return _.isNumber(n) && _.isFinite(n);
    },

    validFuel: function(pct, amt) {
      return this.validNumber(pct) && pct > 0 &&
            this.validNumber(amt) && amt > 0;
    },

    getBuildingFuels: function(fuels, data) {
      fuels.forEach(d => {
        const emmission_pct = this.getMean(d.key + '_ghg_percent', data);
        const emmission_amt = this.getMean(d.key + '_ghg', data);
        const usage_pct = this.getMean(d.key + '_pct', data);
        const usage_amt = this.getMean(d.key, data);

        d.emissions = {};
        d.emissions.isValid = this.validFuel(emmission_pct, emmission_amt);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;
        d.emissions.pct_actual = emmission_pct;
        d.emissions.amt = emmission_amt;

        d.usage = {};
        d.usage.isValid = this.validFuel(usage_pct, usage_amt);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
        d.usage.pct_actual = usage_pct;
        d.usage.amt = usage_amt;
      });

      return fuels.filter(d => {
        return d.usage.isValid && d.emissions.isValid;
      });
    },

    getCityWideFuels: function(fuels, data) {
      let total_emissions = data.total_emissions;
      let total_usage = data.total_consump;


      fuels.forEach(d => {
        const emission_key = `pct_${d.key}_ghg`;
        const usage_key = `pct_${d.key}`;

        const emmission_pct = data[emission_key];
        const usage_pct = data[usage_key];

        d.emissions = {};
        d.emissions.isValid = this.validFuel(emmission_pct, total_emissions);
        d.emissions.pct = d.emissions.pct_raw = emmission_pct * 100;
        d.emissions.pct_actual = emmission_pct;

        d.usage = {};
        d.usage.isValid = this.validFuel(usage_pct, total_usage);
        d.usage.pct = d.usage.pct_raw = usage_pct * 100;
        d.usage.pct_actual = usage_pct;
      });

      return fuels.filter(d => {
        return d.usage.isValid && d.emissions.isValid;
      });
    },

    fixPercents: function(fuels, prop) {
      const values = fuels.map((d, i) => {
        const decimal = +((d[prop].pct_raw % 1));
        const val = Math.floor(d[prop].pct_raw);
        return {
          idx: i,
          val,
          iszero: val === 0,
          decimal: val === 0 ? 1 : decimal
        };
      }).sort((a, b) => {
        return b.decimal - a.decimal;
      });

      const sum = d3.sum(values, d => d.val);

      let diff = 100 - sum;

      values.forEach(d => {
        if (diff === 0) return;

        diff -= 1;
        d.val += 1;

        d.iszero = false;
      });

      // we need to bump up zero values
      const zeros = values.filter(d => d.iszero);
      let zeros_length = zeros.length;

      if (zeros_length > 0) {
        while (zeros_length > 0) {
          zeros_length--;
          values.forEach(d => {
            if (!d.iszero && d.val > 1) {
              d.val -= 1;
            }

            if (d.iszero) {
              d.val += 1;
            }
          });
        }
      }

      values.forEach(d => {
        fuels[d.idx][prop].pct = d.val;
        fuels[d.idx][prop].pct_raw = d.val;
      });
    },

    chartData: function() {
      const data = this.data;

      let total_ghg_emissions;
      let total_usage;

      let fuels;
      if (this.isCity) {
        fuels = this.getCityWideFuels([...this.fuels], data);
        total_ghg_emissions = data.total_emissions;
        total_usage = data.total_consump;
      } else {
        fuels = this.getBuildingFuels([...this.fuels], data);
        total_ghg_emissions = this.getSum('total_ghg_emissions', data);
        total_usage = this.getSum('total_kbtu', data);
      }

      this.fixPercents(fuels, 'emissions');
      this.fixPercents(fuels, 'usage');

      var totals = {
        usage: d3.format(',d')(d3.round(total_usage, 0)),
        emissions: d3.format(',d')(d3.round(total_ghg_emissions, 0))
      };

      return {
        fuels,
        totals,
        total_ghg_emissions,
        total_ghg_emissions_intensity: data[0].total_ghg_emissions_intensity,
        isCity: this.isCity,
        building_name: this.building_name,
        year: this.year,
        emission_klass: fuels.length === 1 ? 'onefuel' : '',
        cars: this.formatters.fixedOne(total_ghg_emissions / this.TYPICAL_CAR_EMMISSION)
      };
    },

    getLabelSizes: function(labels) {
      const sizes = [];

      labels.each(function(){
        const pw = this.offsetWidth;
        const cw = this.firstChild.offsetWidth;

        if (pw === 0) return;

        sizes.push({
          elm: this,
          pw,
          cw,
          dirty: cw > pw,
          pct: +(this.style.width.replace('%', ''))
        });
      });

      return sizes;
    },

    adjSizes: function(labels, ct) {
      const sizes = this.getLabelSizes(labels);

      if (!sizes.length) return;

      let ctr = ct || 0;
      ctr += 1;
      if (ctr > 100) return;

      const dirty = _.findIndex(sizes, d => d.dirty);

      if (dirty > -1) {
        const available = sizes.filter(d => !d.dirty);

        let additional = 0;

        available.forEach(d => {
          additional += 1;
          d3.select(d.elm).style('width', (d.pct - 1) + '%');
        });

        d3.select(sizes[dirty].elm).style('width', (sizes[dirty].pct + additional) + '%');

        this.adjSizes(labels, ctr);
      }
    },

    hideLabels: function(labels) {
      const sizes = this.getLabelSizes(labels);
      sizes.forEach(d => {
        if (d.dirty) {
          d3.select(d.elm.firstChild).style('display', 'none');
        }
      });
    },

    findQuartile(quartiles, value) {
      let i = 1;
      for (; i <= quartiles.length; i++) {
        if (value < quartiles[i - 1]) return i;
      }
      return i - 1;
    },

    renderEmissionsChart: function(data) {
      const selectedBuilding = this.data[0];
      const averageEmissionsIntensity = d3.mean(data.map(d => d.emissionsIntensity));

      const parent = d3.select('#emissions-intensity-chart');
      const margin = { top: 50, right: 30, bottom: 40, left: 40 };
      const width = 620 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;

      const svg = parent.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

      const container = svg.append('g')
        .attr('width', width)
        .attr('height', height)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const maxEmissionsIntensity = d3.max(data.map(r => r.emissionsIntensity));
      const x = d3.scale.linear()
        .domain([0, maxEmissionsIntensity * 1.05])
        .range([0, width]);

      const maxEui = d3.max(data.map(r => r.eui));
      const y = d3.scale.linear()
        .domain([0, maxEui * 1.15])
        .range([height, 0]);

      const size = d3.scale.linear()
        .domain([0, d3.max(data.map(r => r.emissions))])
        .range([5, 25]);

      const xAxis = d3.svg.axis()
        .orient('bottom')
        .outerTickSize(0)
        .innerTickSize(2)
        .scale(x);
      svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxis);

      const yAxis = d3.svg.axis()
        .orient('left')
        .outerTickSize(0)
        .innerTickSize(2)
        .scale(y);
      svg.append('g')
        .attr('class', 'y axis')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .call(yAxis);

      svg.append('g')
        .classed('label', true)
        .attr('transform', `translate(${width / 2}, ${height + margin.top + 30})`)
          .append('text')
          .attr('text-anchor', 'middle')
          .text('GHG Emissions Per Square Foot');

      svg.append('g')
        .classed('label', true)
        .attr('transform', `translate(8, ${height / 2 + margin.top}) rotate(-90)`)
          .append('text')
          .attr('text-anchor', 'middle')
          .text('Energy Use Per Square Foot (EUI)');


      // Bring selected building to front
      const buildingData = data.filter(d => d.id === selectedBuilding.id)[0];
      const scatterpointData = data.slice();
      scatterpointData.push(buildingData);

      const quartileColors = {
        1: '#0047BA',
        2: '#90AE60',
        3: '#F7C34D',
        4: '#C04F31'
      };
      const emissionsIntensities = data.map(d => d.emissionsIntensity).sort();
      const quartiles = [0.25, 0.5, 0.75, 1].map(q => d3.quantile(emissionsIntensities, q));

      container.selectAll('circle')
          .data(scatterpointData)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.emissionsIntensity))
        .attr('cy', d => y(d.eui))
        .attr('r', d => size(d.emissions))
        .attr('fill-opacity', d => d.id === selectedBuilding.id ? 1 : 0.15)
        .attr('fill', d => quartileColors[this.findQuartile(quartiles, d.emissionsIntensity)]);

      // Show average intensity
      container.append('line')
        .attr('stroke', '#D5D5D5')
        .attr('stroke-dasharray', '8 5')
        .attr('x1', x(averageEmissionsIntensity))
        .attr('x2', x(averageEmissionsIntensity))
        .attr('y1', y(0))
        .attr('y2', 0);

      // Draw line to selected building
      container.append('line')
        .attr('stroke', '#1F5DBE')
        .attr('x1', x(selectedBuilding.total_ghg_emissions_intensity))
        .attr('x2', x(selectedBuilding.total_ghg_emissions_intensity))
        .attr('y1', y(selectedBuilding.site_eui) - size(selectedBuilding.total_ghg_emissions) - 3)
        .attr('y2', -margin.top);

      // Text for average
      const averageText = parent.append('div');
      averageText
        .classed('avg-highlight-html', true)
        .style('top', `${margin.top}px`)
        .style('left', `${margin.left + x(averageEmissionsIntensity) + 5}px`);

      const averageTextContent = averageText.append('div');
      const averageQuartile = this.findQuartile(quartiles, averageEmissionsIntensity);
      averageTextContent.append('p')
        .text('Building type average');
      averageTextContent.append('p')
        .text(d3.format('.2f')(averageEmissionsIntensity))
        .classed(`quartile-${averageQuartile}`, true);
      averageTextContent.append('p')
        .html('KG/SF')
        .classed(`quartile-${averageQuartile}`, true);

      // Text for selected building
      const selectedText = parent.append('div')
        .classed('avg-highlight-html selected-building', true)
        .style('top', '0px');

      const selectedBuildingX = x(selectedBuilding.total_ghg_emissions_intensity);
      if (selectedBuildingX <= (width * 0.75)) {
        selectedText.style('left', `${margin.left + selectedBuildingX + 5}px`);
      } else {
        selectedText.style('right', `${width - selectedBuildingX + margin.right + 5}px`)
          .classed('right-aligned', true);
      }

      const selectedTextContent = selectedText.append('div');
      const selectedQuartile = this.findQuartile(quartiles, selectedBuilding.total_ghg_emissions_intensity);
      selectedTextContent.append('p')
        .text(selectedBuilding.property_name);
      selectedTextContent.append('p')
        .text(d3.format('.2f')(selectedBuilding.total_ghg_emissions_intensity))
        .classed(`quartile-${selectedQuartile}`, true);
      selectedTextContent.append('p')
        .html('KG/SF')
        .classed(`quartile-${selectedQuartile}`, true);

      const legendParent = d3.select('.emissions-dots');
      if (legendParent.node()) {
        const legendWidth = legendParent.node().offsetWidth;
        const dotMargin = 15;

        const dotScale = d3.scale.linear().domain(d3.extent(data.map(d => d.emissions)));
        const dots = [0.1, 0.25, 0.5, 0.75, 1];

        const expectedWidth = dotMargin * (dots.length - 1) + d3.sum(dots.map(dot => size(dotScale.invert(dot)) * 2));

        const legendSvg = d3.select('.emissions-dots').append('svg')
          .attr('width', legendWidth)
          .attr('height', 100);
        const legendContainer = legendSvg.append('g')
          .attr('transform', `translate(${(legendWidth - expectedWidth) / 2}, 15)`);

        let xDotPosition = 0;
        const enterLegendDot = legendContainer.selectAll('.emissions-chart-legend-dot')
          .data(dots)
          .enter()
            .append('g')
          .classed('emissions-chart-legend-dot', true)
          .attr('transform', (d, i) => {
            const r = size(dotScale.invert(d));
            xDotPosition += r;
            const translate = `translate(${xDotPosition}, ${50 - r})`;
            xDotPosition += r + dotMargin;
            return translate;
          });

        enterLegendDot
          .append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', d => size(dotScale.invert(d)))
          .attr('fill', d => '#F1F1F1');

        enterLegendDot
          .append('text')
          .attr('text-anchor', 'middle')
          .classed('emissions-dots-label', true)
          .text(d => d3.format('.2r')(dotScale.invert(d)))
          .attr('transform', d => `translate(0, ${15 + size(dotScale.invert(d))})`);
      }
    },

    fixlabels: function(selector) {
      const chart = d3.select(selector).select('#fuel-use-chart');

      const headerLabels = chart.select('.fc-bars').selectAll('.fc-header');
      this.adjSizes(headerLabels, 0);

      const barLabels = chart.select('.fc-bars').selectAll('.fc-bar');
      this.hideLabels(barLabels);
    },

    renderPieChart: function(id, data, width, height) {
      const radius = Math.min(width, height) / 2;

      const svg = d3.select(`#${id}`)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
          .attr('transform', `translate(${width / 2},${height / 2})`);

      var pie = d3.layout.pie()
        .sort(null)
        .value(d => d.value);

      const arcs = svg.selectAll('.arc')
        .data(pie(data))
        .enter().append('g')
          .classed('arc', true);

      const arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

      const arcColors = {
        gas: '#C04F31',
        electricity: '#90AE60',
        steam: '#DE8F41'
      };

      arcs.append('path')
        .attr('d', arc)
        .style('fill', d => arcColors[d.data.type]);
    },

    renderEmissionsPieChart: function(data) {
      const pieData = [
        { type: 'gas', value: data.gas_ghg_percent * 100 },
        { type: 'electricity', value: data.electricity_ghg_percent * 100 },
        { type: 'steam', value: data.steam_ghg_percent * 100 }
      ];
      this.renderPieChart('emissions-pie-chart', pieData, 100, 100);
    },

    renderEnergyConsumptionPieChart: function(data) {
      const pieData = [
        { type: 'gas', value: data.gas_pct * 100 },
        { type: 'electricity', value: data.electricity_pct * 100 },
        { type: 'steam', value: data.steam_pct * 100 }
      ];
      this.renderPieChart('energy-consumption-pie-chart', pieData, 100, 100);
    },

    render: function(){
      var d = this.chartData();
      this.renderEmissionsChart(this.emissionsChartData);
      this.renderEnergyConsumptionPieChart(this.data[0]);
      this.renderEmissionsPieChart(this.data[0]);
      return this.template(d);
    }
  });

  return FuelUseView;
});

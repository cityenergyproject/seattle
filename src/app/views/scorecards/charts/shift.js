define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/scorecards/charts/shift.html'
], function($, _, Backbone, d3, ShiftTemplate){

  var ShiftView = Backbone.View.extend({
    className: 'shift-chart',

    initialize: function(options){
      this.template = _.template(ShiftTemplate);
      this.formatters = options.formatters;
      this.data = options.data;
      this.view = options.view;
      this.no_year = options.no_year || false;
      this.selected_year = options.selected_year;
      this.previous_year = options.previous_year;
    },

    validNumber: function(x) {
      return _.isNumber(x) && _.isFinite(x);
    },

    calculateChange: function() {
      const years = [];

      this.data.filter(d => {
        return d.influencer;
      }).forEach(d => {
        years.push({
          yr: d.year,
          val: d.value
        });
      });

      years.sort((a,b) => {
        return a.yr - b.yr;
      });

      var last = years.length - 1;

      return ((years[last].val - years[last - 1].val) / years[last].val) * 100;
    },

    extractChangeData: function() {
      this.data.sort((a,b) => {
        return a.year - b.year;
      });

      const years = d3.extent(this.data, d => d.year);

      const change = this.calculateChange();

      const direction = (change < 0) ? 'decreased' : change === 0 ? '': 'increased';

      const isValid = this.validNumber(change);

      return {
        chart: this.data,
        template: {
          isValid,
          direction,
          years,
          change,
          pct: this.formatters.fixedOne(Math.abs(change)) + '%'
        }
      };
    },

    getGradientId: function(base, field) {
      return `${base}_${field}`;
    },

    setSVGGradient: function(rootElm, id, data) {
      const defs = rootElm.select('svg').append('defs');

      const fields = data.filter(d => d.colorize).reduce((a,b) => {
        if (!a.hasOwnProperty(b.field)) {
          a[b.field] = {
            min: b.year,
            max: b.year,
            minclr: b.clr,
            maxclr: b.clr
          };

          return a;
        }

        if (b.year < a[b.field].min) {
          a[b.field].min = b.year;
          a[b.field].minclr = b.clr;
        } else if (b.year > a[b.field].max) {
          a[b.field].max = b.year;
          a[b.field].maxclr = b.clr
        }

        return a;
      }, {})

      Object.keys(fields).forEach(k => {
        const field = fields[k];

        const gradient = defs.append('linearGradient')
          .attr('id', this.getGradientId(id, k))
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', field.minclr)
            .attr('stop-opacity', 1);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', field.maxclr)
            .attr('stop-opacity', 1);
      });
    },

    renderChangeChart: function(isValid, data, selector) {
      const container = d3.select(selector);

      var rootElm = container.select('#change-chart-vis');
      var yearsElm = container.select('#change-chart-years');

      if (!isValid) return;

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

      var gradientID = 'gradient-' + this.view;
      this.setSVGGradient(rootElm, gradientID, data);

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
        .attr('class', d => {
          const colorize = d.values[0].colorize ? '' : ' no-clr';
          const field = d.values[0].field;

          return `line shift-line-${field} ${colorize}`;
        })
        .style('stroke', d => {
          const colorize = d.values[0].colorize;
          if (!colorize) return null;
          const field = d.values[0].field;

          return 'url(#' + this.getGradientId(gradientID, field); + ')';
        })
        .attr('d', d => line(d.values));

      var bar = svg.selectAll('.dot')
          .data(data)
        .enter().append('g')
          .attr('class', d => {
            const colorize = d.colorize ? '' : ' no-clr';
            const field = d.field;

            return `dot shift-dot-${field} ${colorize}`;
          })
          .attr('transform', d => { return 'translate(' + x(d.year) + ',' + y(d.value) + ')'; });

      bar.append('circle')
        .attr('r', 5)
        .attr('fill', d => d.clr);

      var firstyear = x.domain()[0];
      var lastyear = x.domain()[1];

      var label = rootElm.selectAll('.label')
        .data(data)
      .enter().append('div')
        .attr('class', 'label')
        .attr('class', d => {
          const colorize = d.colorize ? '' : ' no-clr';
          const field = d.field;

          return `label shift-label-${field} ${colorize}`;
        })
        .style('color', d => d.clr)
        .style('left', d => {
          if (d.year === firstyear) return x(d.year) + 'px';
          return x(d.year) + 10 +'px';
        })
        .style('top',  d => { return y(d.value) + 'px'; });

      var innerLabel = label.append('table').append('td');

      innerLabel
        .append('p')
        .text(d => this.formatters.fixedOne(d.value));
      innerLabel
        .append('p')
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
        .select('table')
        .append('td')
        .append('span')
          .attr('class', 'building')
          .text(d => d.label);

      const me = this;
      let prev;
      label.each(function(d) {
        if (prev) {
          let rect1 = me.makeRect(prev);
          let rect2 = me.makeRect(this);
          let attempts = 10;

          while(me.collision(rect1, rect2) && attempts > 0) {
            attempts--;
            prev.style.top = (rect1.top - 2) + 'px';
            this.style.top = (rect2.top + 2) + 'px';

            rect1 = me.makeRect(prev);
            rect2 = me.makeRect(this);
          }

        }
        prev = this;
      });

    },

    makeRect: function(el) {
      const t = el.offsetTop;
      const l = el.offsetLeft;

      return {
        top: t,
        right: l + el.offsetWidth,
        bottom: t + el.offsetHeight,
        left: l
      }
    },

    collision: function(rect1, rect2) {
      return !(rect1.right < rect2.left ||
              rect1.left > rect2.right ||
              rect1.bottom < rect2.top ||
              rect1.top > rect2.bottom);
    },

    query: function() {
      return 'SELECT year,SUM(total_ghg_emissions) as emissions,SUM(total_kbtu) as consumption FROM (SELECT year, COALESCE(total_ghg_emissions, 0) as total_ghg_emissions, COALESCE(total_kbtu, 0) as total_kbtu FROM table_2015_stamen_phase_ii_v2_w_year)q GROUP BY year';
    },

    loadData: function(cb) {
      d3.json(`https://cityenergy-seattle.carto.com/api/v2/sql?q=${this.query()}`, (d) => {
        return cb(d);
      });
    },

    chartData: function(cb) {
      if (!this.data) {
        /*

          o.push({
            label,
            field: metric.field,
            value,
            clr,
            year: +year,
            colorize: metric.colorize,
            influencer: metric.influencer
          });

         */
        this.loadData((data) => {
          if (!data) {
            console.error('Problem loading citywide change data!');
            return;
          }

          this.data = [];
          data.rows.forEach(obj => {
            this.data.push({
              label: 'Citywide GHG emissions',
              field: 'emissions',
              value: +(obj.emissions.toFixed(1)),
              clr: '#aaa',
              year: +obj.year,
              colorize: true,
              influencer: true
            });

            this.data.push({
              label: 'Citywide Total Energy Consumption',
              field: 'consumption',
              value: +(obj.consumption.toFixed(1)),
              year: +obj.year,
              clr: '#666',
              isAvg: false,
              colorize: true
            });
          });

          cb(this.extractChangeData());
        });
      } else {
        cb(this.extractChangeData());
      }
    },

    render: function(cb, viewSelector){
      if (this.no_year) {
        console.log('NO YEAR');
        cb(this.template({
          noyear: true,
          year_needed: this.previous_year
        }));
        return;
      }
      this.chartData((d) => {
        cb(this.template(d.template));
        this.renderChangeChart(d.template.isValid, d.chart, viewSelector);
      });
    }
  });

  return ShiftView;
});

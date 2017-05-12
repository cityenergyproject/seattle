define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'text!templates/layout/scorecard.html'
], function($, _, Backbone, D3, ScorecardTemplate){
  var Scorecard = Backbone.View.extend({
    initialize: function(options){
      this.state = options.state;
      this.listenTo(this.state, 'change:allbuildings', this.onBuildings);
      this.template = _.template(ScorecardTemplate);
      this.render();
    },

    full_address: function(building) {
      var zip = building.get('zip');
      var state = building.get('state');
      var city = building.get('city');
      var addr = building.get('reported_address');

      return addr + ', ' + city + ' ' + state + ' ' + zip;
    },

    onBuildings: function() {
      var buildings = this.state.get('allbuildings');
      var rid = Math.floor(Math.random() * 1000) + 1;
      var building = buildings.at(rid);

      var name = building.get('property_name');
      var address = this.full_address(building);
      var sqft = +(building.get('reported_gross_floor_area'));
      var prop_type = building.get('property_type');
      var id = building.get('id');
      var eui = building.get('site_eui');

      console.log(building);

      $('#scorecard').html(this.template({
        name: name,
        addr: address,
        sqft: sqft.toLocaleString(),
        type: prop_type,
        id: id,
        year: 2015,
        eui: eui
      }));

      this.renderCompareChart(buildings, prop_type, id, name, eui);
    },

    renderCompareChart: function(buildings, prop_type, id, name, eui) {
      var buildingsOfType = buildings.where({property_type: prop_type}).map(function(m) {
        return m.toJSON();
      });

      var data = d3.layout.histogram()
          .bins(22)
          .value(function(d) {
            return d.site_eui;
          })(buildingsOfType);

      data.forEach(function(d) {
        var min = d3.min(d, function(v){
          if (v.hasOwnProperty('site_eui')) return v.site_eui;
          return 0;
        });

        var max = d3.max(d, function(v){
          if (v.hasOwnProperty('site_eui')) return v.site_eui;
          return 0;
        });

        d.min = min;
        d.max = max;
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

      var sum =  buildingsOfType.reduce(function(a, b) { return a + b.site_eui; }, 0);
      var avg = sum / buildingsOfType.length;

      data.forEach(function(d, i) {
        if (avgIndex !== null) return;
        if (avg >= d.min && avg <= d.max) avgIndex = i;
      });

      console.log(selectedIndex, avg, avgIndex);
      console.log(data);

      var thresholds = [
        {
          label: 'lowest',
          clr: '#1F5DBE',
          indices: [0,1]
        },
        {
          label: 'medium low',
          clr: '#90AE60',
          indices: [2,3]
        },
        {
          label: 'medium high',
          clr: '#F7C34D',
          indices: [4,5]
        },
        {
          label: 'highest',
          clr: '#C04F31',
          indices: [6, data.length - 1]
        },
      ];

      var margin = {top: 80, right: 30, bottom: 40, left: 40},
          width = 620 - margin.left - margin.right,
          height = 300 - margin.top - margin.bottom;

      var x = d3.scale.ordinal()
          .rangeRoundBands([0, width], 0.3, 0)
          .domain(data.map(function(d){ return d.x;}));

      var y = d3.scale.linear()
          .domain([0, d3.max(data, function(d) { return d.y; })])
          .range([height, 0]);

      var svg = d3.select("#compare-chart").append("svg")
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
        .data(thresholds)
        .enter()
        .append('g')
          .attr('class', 'threshold')
          .attr("transform", function(d) {
            var indices = d.indices;
            var start = x(data[indices[0]].x);
            return "translate(" + start + ",0)";
          });

      threshold
        .append('line')
        .attr('x1', 0)
        .attr('x2', function(d) {
          var indices = d.indices;
          var start = x(data[indices[0]].x);
          var end = x(data[indices[1]].x) + x.rangeBand();
          return end - start;
        })
        .attr('stroke', function(d){ return d.clr; });

      threshold
        .append('text')
        .attr('fill', function(d){ return d.clr; })
        .attr('dy', 14)
        .attr('dx', function(d) {
          var indices = d.indices;
          var start = x(data[indices[0]].x);
          var end = x(data[indices[1]].x) + x.rangeBand();
          var middle = (end - start) / 2;
          return middle;
        })
        .attr('text-anchor', function(d, i){
          if (i === 0) {
            return 'end';
          }
          if (i === 2) return 'start';

          return 'middle';
        })
        .text(function(d){ return d.label; });

      svg
        .append('g')
        .attr('class', 'label')
        .attr("transform", function(d) { return "translate(" + (-30) + "," + (height / 2) + ")"; })
        .append('text')
        .text('Number of buildings')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)');

      svg
        .append('g')
        .attr('class', 'label')
        .attr("transform", function(d) { return "translate(" + (width/2) + "," + (height + 40) + ")"; })
        .append('text')
        .text('Energy use Intensity (EUI)')
        .attr('text-anchor', 'middle');


      var bar = svg.selectAll(".bar")
          .data(data)
        .enter().append("g")
          .attr("class", "bar")
          .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

      bar.append("rect")
          .attr("x", 1)
          .attr("width", x.rangeBand())
          .attr("height", function(d) { return height - y(d.y); })
          .attr('class', function(d, i) {
            if (i === selectedIndex || i === avgIndex) return 'selected';
            return null;
          });


      var xpos = x(data[selectedIndex].x)  + (x.rangeBand() / 2);
      var ypos = y(data[selectedIndex].y);


      var selectedCityHighlight = d3.select("#compare-chart").append('div')
        .attr('class', 'selected-city-highlight-html')
        .style('top', (margin.top - 70) + 'px')
        .style('left', (margin.left + xpos) + 'px');


      var circle = selectedCityHighlight.append('div')
        .attr('class', 'circle');

      var innerCircle = circle.append('div').attr('class', 'inner');
      var outerCircle = circle.append('div').attr('class', 'outer');

      innerCircle.append('p')
        .text(eui);

      innerCircle.append('p')
        .html('KBTU/FT<sup>2</sup>');

      outerCircle.append('p')
        .text(name);

      selectedCityHighlight.append('div')
        .attr('class', 'line')
        .style('height', (ypos + 5) + 'px');

      xpos = x(data[avgIndex].x)  + (x.rangeBand() / 2);
      ypos = y(data[avgIndex].y); // top of bar

      var avgHighlight = d3.select("#compare-chart").append('div')
        .attr('class', 'avg-highlight-html')
        .style('top', (margin.top + ypos) + 'px')
        .style('left', (margin.left + xpos) + 'px')
        .append('div');

      avgHighlight.append('p')
        .text('Building type average');

      avgHighlight.append('p')
        .text(avg.toFixed(2));

      avgHighlight.append('p')
        .html('KBTU/FT<sup>2</sup>');
    },

    render: function(){
      return this;
    }
  });

  return Scorecard;
});

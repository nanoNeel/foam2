foam.CLASS({
  package: 'org.chartjs',
  name: 'AbstractChartCView',
  extends: 'foam.graphics.CView',
  requires: [
    'foam.dao.PromisedDAO',
    'foam.dao.MDAO',
    'foam.mlang.sink.GroupBy',
    'foam.mlang.sink.Plot',
    'org.chartjs.Lib',
  ],
  properties: [
    'chart',
    'chartType',
    'colors',
    'data',
    {
      name: 'config',
      factory: function() {
        return {
          type: this.chartType,
          datasets: [{}],
          options: {
            responsive: false,
            maintainAspectRatio: false
          }
        };
      }
    },
  ],
  reactions: [
    ['data', 'propertyChange', 'update' ],
    ['', 'propertyChange.data', 'update' ],
    ['', 'propertyChange.chart', 'update' ],
  ],
  classes: [
    {
      name: 'ChartData',
      properties: [
        'key',
        'data',
      ],
    },
  ],
  methods: [
    function initCView(x) {
      this.chart = new this.Lib.CHART(x, this.config);
      this.configChart_(this.chart);
    },
    function paintSelf(x) {
      this.chart.render();
    },
    function configChart_(chart) {
      // template method
    },
    function genChartData_(data) {
      // Template method, in child classes generate the chart data
      // from our data.
    },
    function normalizeData() {
      var getData = function(data) {
        if ( this.GroupBy.isInstance(data) ) {
          var ps = [];
          var o = [];
          data.sortedKeys().forEach(function(k) {
            ps.push(getData(data.groups[k]).then(function(o2) {
              o2.forEach(function(o3) {
                o.push([k].concat(o3));
              })
            }))
          });
          return Promise.all(ps).then(function() { return o });
        } else if ( this.Plot.isInstance(data) ) {
          return Promise.resolve(data.points);
        } else if ( data && data.value ) {
          return Promise.resolve([data.value])
        } else {
          return Promise.resolve([data]);
        }
      }.bind(this);
      return getData(this.data).then(function(o) {
        o.sort(foam.util.compare);
        return o;
      });
    },
    function toChartData(data) {
      var dimensions = data.length && data[0].length;

      if ( dimensions == 3 ) {
        var xValues = [];
        data.forEach(function(row) {
          var x = row[1];
          if ( xValues.indexOf(x) == -1 ) xValues.push(x);
        });
        xValues.sort(foam.util.compare);

        var datasets = [];
        for ( var i = 0 ; i < data.length ; ) {
          var o = { label: data[i][0], data: [] };
          for ( var xi = 0 ; xi < xValues.length ; xi++ ) {
            if ( i >= data.length ) break;
            if ( o.label != data[i][0] ) break;
            var x = xValues[xi];
            var y = null;
            if ( x == data[i][1] ) {
              y = data[i][2];
              i++;
            }
            o.data.push({ x: x, y: y })
          }
          datasets.push(o);
        }
        return {
          labels: xValues,
          datasets: datasets,
        };
      } else {
        return {
          labels: data.map(function(o) { return o[0] }),
          datasets: [
            {
              label: 'Total', // TODO how to customize this?
              data: data.map(function(o) { return o[1] })
            }
          ]
        };
      }
    },
  ],
  listeners: [
    {
      name: 'update',
      isFramed: true,
      code: function() {
        if ( this.chart && this.data ) {
          // Simply doing this.chart.data = this.data will cause the entire
          // chart to re-render when chart.update() is called. Doing a deep
          // copyFrom makes the chart update only what it needs to which is a
          // much nicer animation.
          var copyFrom = function(to, from) {
            if ( foam.Array.isInstance(from) ) {
              to = to || [];
              while ( to.length > from.length ) {
                to.pop();
              }
              for ( var i = 0; i < from.length; i++ ) {
                to[i] = copyFrom(to[i], from[i]);
              }
              return to;
            } else if ( foam.Object.isInstance(to) ) {
              to = to || {};
              Object.keys(from).forEach(function(k) {
                to[k] = copyFrom(to[k], from[k])
              });
              return to;
            }
            return from;
          }

          this.normalizeData().then(function(o) {
            var data = this.genChartData_(o);
            copyFrom(this.chart.data, data);
            this.chart.update();
          }.bind(this))

        }
      }
    }
  ]
});

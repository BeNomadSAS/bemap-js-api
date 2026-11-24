var sample;

var Sample = function() {
  var benomadFr = new bemap.Destination(7.13397, 43.6358);
  var antibesFr = new bemap.Destination(7.12139, 43.58018);
  var marseilleFr = new bemap.Destination(5.37149, 43.29337);
  var nimesFr = new bemap.Destination(4.35855, 43.83512);
  var lyonFr = new bemap.Destination(4.82897, 45.7594);
  var parisFr = new bemap.Destination(2.34144, 48.85721);

  this.map = undefined;
  this.routing = undefined;

  this.init = function() {
    this.map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers();
    this.map.move(benomadFr.getLon(), benomadFr.getLat(), 10);
    this.map.rotation(0);
  };

  this.runRouting = function(map) {
    if (this.routing) {
      this.routing.reset();
    }

    this.routing = new bemap.Routing(bemapMainCtx).compute({
      request: {
        destinations: [benomadFr, antibesFr],
        options: ['EVENT', 'EVT_DUPLICATE_FILTER', 'EVT_ROUTESHEET', 'EVT_POLYLINE', 'EVT_DURATION', 'EVT_LENGTH']
      },
      success: function(routing, response, doc, xhr) {
        console.log("Route calculated with success.");
        routing.showOnMap(map);
      }
    });

    //var routeB = routing.compute({'geoserver': "osm"});
  };

  this.run = function() {
    this.runRouting(this.map);
  };
};

onLoaded = function() {
  sample = new Sample();
  sample.init();
};

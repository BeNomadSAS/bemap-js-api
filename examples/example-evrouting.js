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
  this.isochrone = undefined;
  this.evseRouting = undefined;
  this.geocoding = undefined;

  this.init = function() {
    this.map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers();
    this.map.move(benomadFr.getLon(), benomadFr.getLat(), 10);
  };

  this.runRouting = function(map) {
    if (this.routing) {
      this.routing.reset();
    }

    this.routing = new bemap.Routing(bemapMainCtx, {
      'nativeBeMapParams': '&evfVehicle=Zoe&evfTempExt=20&evfInitBatLvl=100'
    });
    this.routing.compute({
      request: {
        destinations: [benomadFr, antibesFr]
      },
      success: function(routing, response, doc, xhr) {
        console.log("Route calculated with success.");
        routing.showOnMap(map);
      }
    });

    //var routeB = routing.compute({'geoserver': "osm"});
  };

  this.runIsochrone = function(map) {
    if (this.isochrone) {
      this.isochrone.reset();
    }

    this.isochrone = new bemap.Isochrone(bemapMainCtx, {
      'nativeBeMapParams': '&evfVehicle=Zoe&evfTempExt=20&evfInitBatLvl=100'
    });
    this.isochrone.destinations = [benomadFr];
    this.isochrone.criterias = ['ECO_ENERGY'];
    this.isochrone.isoChroneLimit = 2000;
    this.isochrone.compute({
      success: function(isochrone, response, doc, xhr) {
        console.log("Isochrone calculated with success.");
        isochrone.showOnMap(map);
      }
    });
  };

  this.chargingStationPopupTextCallback = function(step) {
    var html = '<p>';

    if (step.batteryChargeLevel) {
      html += 'Battery: ' + step.batteryChargeLevel + '%<br/>';
    }
    if (step.chargingTime) {
      html += 'Charging time: ' + step.chargingTime + 'ms<br/>';
    }
    if (step.consumedFromPreviousStop) {
      html += 'Consumed: ' + step.consumedFromPreviousStop + 'kW<br/>';
    }
    if (step.maxNominalPower) {
      html += 'Maximum power: ' + step.maxNominalPower + 'kW<br/>';
    }
    if (step.numberOfChargingPoint) {
      html += 'Number of charge points: ' + step.numberOfChargingPoint + '<br/>';
    }

    html += '</p>';
    return html;
  };

  this.runEvseRouting = function(map) {
    if (this.evseRouting) {
      this.evseRouting.reset();
    }

    this.evseRouting = new bemap.EvseRouting(bemapMainCtx, {
      'nativeBeMapParams': '&evfVehicle=Zoe&evfTempExt=20&evfInitBatLvl=100&evf=0.75,0.012,0.693,22,1468,100,300,2.1,-2,20,22,31'
    });
    this.evseRouting.destinations = [parisFr, lyonFr];
    this.evseRouting.compute({
      success: function(routing, response, doc, xhr) {
        console.log("EVSE Routing calculated with success.");
        routing.showOnMap(map, {
          "chargingStationStepImageSrc": "images/evse-connector.png",
          "chargingStationPopupTextCallback": sample.chargingStationPopupTextCallback
        });
      }
    });
  };

  this.runGeocoding = function(map) {
    if (this.geocoding) {
      this.geocoding.reset();
    }

    var searchInfo = new bemap.GeoSearchInfo({
      'country': 'France',
      'city': 'Paris',
      'street': 'Villa des pyréné',
    });

    this.geocoding = new bemap.Geocoder(bemapMainCtx, {
      'language': "xx",
      'maxResult': "5"
    }).geocode({
      'searchInfo': searchInfo,
      'success': function(geocoder, items, doc, xhr) {
        console.log("Geocoding success");
        console.log(items);
      },
      'failed': function(error, doc, xhr) {
        console.log("Geocoding failed");
      }
    });
  };

  this.run = function() {
    //this.runRouting(this.map);
    //this.runIsochrone(this.map);
    this.runEvseRouting(this.map);
    //this.runGeocoding(this.map);
  };
};

onLoaded = function() {
  sample = new Sample();
  sample.init();
};

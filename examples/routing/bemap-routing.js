/**
 * BeNomad BeMap JavaScript API - Routing
 */


/**
 * @classdesc
 * Base class for routing calculation.
 * @public
 * @constructor
 * @abstract
 * @param {bemap.Context} context BeMap-JS-API Context. Mandatory.
 * @param {object} options see below the available values.
 */
bemap.Routing = function(context, options) {
  bemap.Service.call(this, context, options);

  var opts = options || {};

  // Request parameters

  /**
   * Destinations
   * @type {bemap.Destinaion}
   * @protected
   */
  this.destinations = opts.destinations ? opts.destinations : [];

  /**
   * Array of route Criteria.
   * @type {bemap.Criteria}
   */
  this.criterias = opts.criterias ? opts.criterias : [];

  this.departureTime = opts.departureTime > 0 ? opts.departureTime : 0;

  this.evCnnType = opts.evCnnType > 0 ? opts.evCnnType : null;

  this.evf = opts.evf > 0 ? opts.evf : null;

  this.evRange = opts.evRange > 0 ? opts.evRange : null;

  this.isoChroneLimit = opts.isoChroneLimit > 0 ? opts.isoChroneLimit : 0;

  this.language = opts.language ? opts.language : "xx";

  this.maxAlter = 0;

  this.options = opts.options && opts.options.length > 0 ? opts.options : ['EVENT', 'EVT_POLYLINE'];

  this.speed = opts.speed > 0 ? opts.speed : 0;

  this.speedType = opts.speedType > 0 ? opts.speedType : null;

  this.transportType = "CAR";

  this.vf = opts.vf > 0 ? opts.vf : null;

  this.xyRadius = opts.xyRadius > 0 ? opts.xyRadius : 40;

  /**
   * Native parameters of BeMap server.
   * @type {String}
   * @protected
   */
  this.nativeBeMapParams = opts.nativeBeMapParams ? opts.nativeBeMapParams : null;

  // Response

  /**
   * Calculated route(s).
   * @type {bemap.Route}
   * @protected
   */
  this.routes = [];

  /**
   * ID of geometry.
   * @type {String}
   * @protected
   */
  this.geometryId = 'routePolyline';

  /**
   * Draw a polygon with the polyline array.
   * @type {boolean}
   * @protected
   */
  this.poylineAsPolygon = false;

  // Internal resource.

  this.popup = undefined;

};
bemap.inherits(bemap.Routing, bemap.Service);

/**
 * Get the calculated route object.
 * @public
 * @param {integer} index of route.
 * @return {bemap.Route} the calculated route.
 */
bemap.Routing.prototype.getRoute = function(index) {
  return this.routes[index];
};

/**
 * Get the calculated route object.
 * @public
 * @return {bemap.Route} the calculated route.
 */
bemap.Routing.prototype.getFirstRoute = function() {
  return this.routes[0];
};

/**
 * Reset the Routing object. Clear the previous result.
 * @public
 * @return {bemap.Routing} this
 */
bemap.Routing.prototype.reset = function() {
  if (this.routes) {
    for (var i = 0; i < this.routes.length; i++) {
      var route = this.routes[i];
      this.resetRoute(route);
    }
  }

  this.routes = [];

  if (this.popup) {
    this.popup.remove();
    this.popup = undefined;
  }

  return this;
};

bemap.Routing.prototype.resetRoute = function(route) {
  var i;

  if (route.chargingStationSteps) {
    for (i = 0; i < route.chargingStationSteps.length; i++) {
      var step = route.chargingStationSteps[i];
      if (step.markerMapObject) {
        step.markerMapObject.remove();
        step.markerMapObject = undefined;
      }
    }
  }

  if (route.events) {
    for (i = 0; i < route.events.length; i++) {
      var event = route.events[i];
      if (event.geometryMapObject) {
        event.geometryMapObject.remove();
        event.geometryMapObject = undefined;
      }
    }
  }

  if (route.geometryMapObject) {
    route.geometryMapObject.remove();
    route.geometryMapObject = undefined;
  }
};

/**
 * Generate the BeMap request in URL encoded format.
 * @private
 * @param {object} options See below the available values.
 * @param {String} options.geoserver Geoserver name will be used for this computation.
 * @return {String} the request URL encoded.
 */
bemap.Routing.prototype.buildRequest = function(options) {
  var opts = options || {};
  var data = '&geoserver=' + (opts.geoserver ? opts.geoserver : this.ctx.getGeoserver());

  for (i = 0; i < this.destinations.length; i++) {
    var des = this.destinations[i];

    if (des !== null && bemap.inheritsof(des, bemap.Destination)) {
      data += '&xy=' + des.getLon() + "," + des.getLat();
    } else if (des !== null && bemap.inheritsof(des, bemap.Coordinate)) {
      data += '&xy=' + des.getLon() + "," + des.getLat();
    } else {
      console.error("One of destinations is not a bemap.Destination or bemap.Coordinate object!");
      return;
    }
  }

  if (this.criterias && this.criterias !== null && this.criterias.length > 0) {
    data += '&criterias=';
    first = true;
    for (i = 0; i < this.criterias.length; i++) {
      if (first) {
        first = false;
      } else {
        data += ',';
      }
      data += this.criterias[i];
    }
  }

  if (this.departureTime > 0) {
    data += '&departureTime=' + this.departureTime;
  }

  if (this.evCnnType) {
    data += '&evCnnType=' + this.evCnnType;
  }

  if (this.evf) {
    data += '&evf=' + this.evf;
  }

  if (this.evRange) {
    data += '&evRange=' + this.evRange;
  }

  if (this.isoChroneLimit > 0) {
    data += '&isoChroneLimit=' + this.isoChroneLimit;
  }

  if (this.language) {
    data += '&language=' + this.language;
  }

  if (this.maxAlter > 0) {
    data += '&maxAlter=' + this.maxAlter;
  }

  if (this.options && this.options !== null && this.options.length > 0) {
    data += '&options=';
    first = true;
    for (i = 0; i < this.options.length; i++) {
      if (first) {
        first = false;
      } else {
        data += ',';
      }
      data += this.options[i];
    }
  }

  if (this.speed > 0) {
    data += '&speed=' + this.speed;
  }

  if (this.speedType) {
    data += '&speedType=' + this.speedType;
  }

  if (this.transportType) {
    data += '&transportType=' + this.transportType;
  }

  if (this.vf) {
    data += '&vf=' + this.vf;
  }

  if (this.xyRadius > 0) {
    data += '&xyRadius=' + this.xyRadius;
  }

  if (this.nativeBeMapParams && this.nativeBeMapParams !== null) {
    data += this.nativeBeMapParams;
  }

  return data;
};

/**
 * Execute the routing calculation.
 * @public
 * @param {object} options See below the available values.
 * @param {String} options.geoserver Geoserver name will be used for this computation.
 * @param {function} options.success the function to call in case of successed request.
 * @param {function} options.failed the function to call in case of failed request.
 * @return {bemap.Routing} this
 */
bemap.Routing.prototype.compute = function(options) {
  this.reset();

  if (this.destinations && this.destinations.length < 2) {
    console.error("Minimum of 2 destionations are required!");
    return;
  }

  var opts = options || {};
  var i = 0;
  var first = true;
  var url = this.ctx.getBaseUrl() + 'bnd';
  var data = 'version=1.0.0&action=routing&mode=MODE_VIAS&format=json';

  if (this.ctx.isAuthInPost()) {
    data += '&' + this.ctx.getAuthUrlParams();
  } else {
    url += '?' + this.ctx.getAuthUrlParams();
  }

  data += this.buildRequest(opts);

  return this.execute(url, data, opts);
};

/**
 * Excute the request by calling the BeMap server and wait the answer.
 * @private
 * @param {object} options Request options.
 * @return {bemap.Routing} this
 */
bemap.Routing.prototype.execute = function(url, data, options) {
  var opts = options || {};
  var _this = this;

  bemap.ajax(
    'POST',
    url,
    data,
    function(xhr, doc) {
      _this.responseParser(xhr, doc, opts);
    },
    function(xhr, doc) {
      _this.responseParser(xhr, doc, opts);
    }, {
      'requestFormat': 'urlencoded'
    }
  );

  return this;
};

/**
 * Convert the BeMap response to the BeMap JS API object.
 * @private
 **/
bemap.Routing.prototype.responseParser = function(xhr, doc, options) {
  var opts = options || {};

  doc = JSON.parse(doc);
  if (!doc || this.checkErrorParser(xhr, doc, options)) {
    return;
  }

  var bnd = doc.BND;
  if (!bnd) {
    return;
  }

  this.routeParser(bnd, options);

  if (opts.success) {
    opts.success(this, bnd, doc, xhr);
  }
};

/**
 * Convert the BeMap route(s) to the BeMap JS API Route object(s) and save into the routes array.
 * @private
 **/
bemap.Routing.prototype.routeParser = function(bnd, options) {
  var i = 0;
  var rts = bnd.Routes.Route;

  if (rts && rts.length > 0) {
    for (i = 0; i < rts.length; i++) {
      var r = rts[i];
      var route = new bemap.Route();

      route.length = r.Length;
      route.duration = r.Duration;
      route.averageSpeed = r.AverageSpeed;

      if (r.BoundingBox) {
        var rbbox = r.BoundingBox;
        route.extent = new bemap.BoundingBox(rbbox.minX, rbbox.minY, rbbox.maxX, rbbox.maxY);
      }

      if (r.Polyline && r.Polyline.Line && r.Polyline.Line.length > 0) {
        this.polylineParser(route, r.Polyline.Line);
      }
      if (r.Events && r.Events.length > 0) {
        this.eventsParser(route, r.Events);
      }

      this.routes.push(route);
    }
  }
};

/**
 * Convert the BeMap polyline to the BeMap JS API Polyline object and save into the route object.
 * @private
 **/
bemap.Routing.prototype.polylineParser = function(route, line, options) {
  route.polyline = [];
  for (var i = 0; i < line.length; i++) {
    var pts = line[i];
    route.polyline.push(new bemap.Coordinate(pts.X, pts.Y));
  }
};

/**
 * Convert the events.
 * @private
 **/
bemap.Routing.prototype.eventsParser = function(route, events, options) {
  route.events = [];
  if (!events) {
    return;
  }
  for (var i = 0; i < events.length; i++) {
    this.evtMarkersParser(route, events[i].markers, options);
  }
};

/**
 * Convert the markers.
 * @private
 **/
bemap.Routing.prototype.evtMarkersParser = function(route, markers, options) {
  if (!markers) {
    return;
  }
  for (var i = 0; i < markers.length; i++) {
    this.evtEntriesParser(route, markers[i].entries, options);
  }
};

/**
 * Convert the entries.
 * @private
 **/
bemap.Routing.prototype.evtEntriesParser = function(route, entries, options) {
  if (!entries) {
    return;
  }

  var routeEvent = new bemap.Route.Event();
  route.events.push(routeEvent);

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry.type === 'String' && entry.name === 'countryCode' && entry.value) {
      routeEvent.countryCode = entry.value;

    } else if (entry.type === 'long' && entry.name === 'length' && entry.value) {
      routeEvent.length = entry.value;

    } else if (entry.type === 'double' && entry.name === 'duration' && entry.value) {
      routeEvent.duration = entry.value;

    } else if (entry.type === 'Geometry' && entry.name === 'polyline' && entry.value) {
      if (!routeEvent.polyline) {
        routeEvent.polyline = [];
      }

      var line = entry.value.split(' ');
      for (var j = 0; j < line.length; j++) {
        var pts = line[j].split(',');
        var x = Number(pts[0]);
        var y = Number(pts[1]);
        routeEvent.polyline.push(new bemap.Coordinate(x, y));
      }

    } else if (entry.type === 'Routesheet' && entry.name === 'routesheet' && entry.instruction) {
      this.evtEntryRoutesheetInstructionParser(routeEvent, entry.instruction, options);

    } else if (entry.type === 'ChargingStationStep' && entry.name === 'chargingStationStep') {
      this.evtEntryChargingStationStepParser(routeEvent, entry, options);
    }
  }
};

/**
 * Convert the entry route-sheet instruction.
 * @private
 **/
bemap.Routing.prototype.evtEntryRoutesheetInstructionParser = function(routeEvent, instruction, options) {
  var routesheetInstruction = new bemap.Route.RoutesheetInstruction();
  var c = new bemap.Coordinate(instruction.coordinate.x, instruction.coordinate.y);
  routesheetInstruction.coordinate = c;
  bemap.fillFields(instruction, routesheetInstruction);
  routeEvent.routesheetInstruction = routesheetInstruction;
};

/**
 * Convert the entry ChargingStationStep.
 * @private
 **/
bemap.Routing.prototype.evtEntryChargingStationStepParser = function(routeEvent, chargingStationStep, options) {
  var step = new bemap.ChargingStationStep();
  step.entrance = new bemap.Coordinate(chargingStationStep.longitude, chargingStationStep.latitude);
  bemap.fillFields(chargingStationStep, step);
  routeEvent.chargingStationSteps.push(step);
};

/**
 * Show the route(s) on map.
 * @param {bemap.Map} map the new color of text border to set.
 * @param {Object} options See below the available values.
 * @param {bemap.LineStyle} options.polylineStyle Style of line used by the renderer.
 * @param {String} options.chargingStationStepImageSrc Image path of pool stations.
 * @param {String} options.chargingStationStepNoPopup If set to true, disable the popup when the icon is clicked.
 * @param {function} options.chargingStationPopupTextCallback Function called wehen a pool statiion is clicked, the called function get the step point object and return the text of popup.
 * @return {bemap.Routing} Return this.
 */
bemap.Routing.prototype.showOnMap = function(map, options) {
  if (!this.routes) {
    return;
  }

  var opts = options || {};

  if (!opts.polylineStyle || !bemap.inheritsof(opts.polylineStyle, bemap.LineStyle)) {
    opts.polylineStyle = new bemap.LineStyle({
      width: 3,
      color: new bemap.Color(13, 80, 157, 1)
    });
  }

  if (!opts.polygonStyle || !bemap.inheritsof(opts.polygonStyle, bemap.PolygonStyle)) {
    opts.polygonStyle = new bemap.PolygonStyle({
      fillColor: new bemap.Color(255, 0, 255, 0.25),
      borderColor: new bemap.Color(255, 0, 255, 0.25),
      borderWidth: 3
    });
  }

  for (var i = 0; i < this.routes.length; i++) {
    var route = this.routes[i];
    if (opts.polylineId === undefined) {
      opts.polylineId = i;
    }

    if (this.poylineAsPolygon) {
      this.showPolygon(map, route, opts);
    } else {
      if (route.polyline) {
        this.showPolyline(map, route, opts);
      }
      if (route.events && route.events.length > 0) {
        this.showEventPolyline(map, route, opts);
      }
    }

    if (route.extent) {
      map.moveToBoundingBox(route.extent);
    }

    this.showChargingStationSteps(map, route.chargingStationSteps, opts);
  }

  return this;
};

/**
 * Show a polyline on map
 * @private
 **/
bemap.Routing.prototype.showPolyline = function(map, route, options) {
  var opts = options || {};
  var p = new bemap.Polyline(
    route.polyline, {
      style: opts.polylineStyle,
      id: this.geometryId + opts.polylineId
    }
  );
  route.geometryMapObject = p;
  map.addPolyline(p);
};

/**
 * Show a polygon on map
 * @private
 **/
bemap.Routing.prototype.showPolygon = function(map, route, options) {
  var opts = options || {};
  var p = new bemap.Polygon(
    route.polyline, {
      style: opts.polygonStyle,
      id: this.geometryId + opts.polygonId
    }
  );
  route.geometryMapObject = p;
  map.addPolygon(p);
};

/**
 * Show a polyline on map
 * @private
 **/
bemap.Routing.prototype.showEventPolyline = function(map, route, options) {
  var opts = options || {};
  var events = route.events;

  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var polyline = event.polyline;

    var p = new bemap.Polyline(
      polyline, {
        style: opts.polylineStyle,
        id: this.geometryId + opts.polylineId + '#evt' + i
      }
    );

    event.geometryMapObject = p;
    map.addPolyline(p);
  }
};

/**
 * Show a charging station step(s) on map
 * @param {object} options See below the available values.
 * @param {String} options.chargingStationStepImageSrc Image path of pool stations.
 * @param {String} options.chargingStationStepNoPopup If set to true, disable the popup when the icon is clicked.
 * @param {function} options.chargingStationPopupTextCallback Function called wehen a pool statiion is clicked, the called function get the step point object and return the text of popup.
 * @private
 **/
bemap.Routing.prototype.showChargingStationSteps = function(map, chargingStationSteps, options) {
  if (!chargingStationSteps || chargingStationSteps.lengh == 0) {
    return;
  }

  for (var i = 0; i < chargingStationSteps.length; i++) {
    this.showChargingStationStep(map, chargingStationSteps[i], options);
  }
};

/**
 * Show a charging station step on map
 * @private
 **/
bemap.Routing.prototype.showChargingStationStep = function(map, step, options) {
  if (!step.entrance) {
    return;
  }

  var _this = this;
  var src = options.chargingStationStepImageSrc ? options.chargingStationStepImageSrc : 'images/map-marker-red.svg';
  var marker = new bemap.Marker(
    step.entrance, {
      icon: new bemap.Icon({
        src: src,
        anchorX: options.chargingStationStepImageAnchorX ? options.chargingStationStepImageAnchorX : 0.50,
        anchorY: options.chargingStationStepImageAnchorY ? options.chargingStationStepImageAnchorY : 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
      })
    });
  map.addMarker(marker);

  step.markerMapObject = marker;

  if (!options.chargingStationStepNoPopup) {
    marker.on(bemap.Map.EventType.CLICK, function() {
      _this.popupChargingStationStep(map, step, options);
    });
  }
};

/**
 * Show a charging station step on map
 * @param {object} options See below the available values.
 * @param {function} options.chargingStationPopupTextCallback Function called wehen a pool statiion is clicked, the called function get the step point object and return the text of popup.
 * @private
 **/
bemap.Routing.prototype.popupChargingStationStep = function(map, step, options) {
  if (!this.popup) {
    this.popup = new bemap.Popup({
      coordinate: step.entrance,
      visible: false
    });
    map.addPopup(this.popup);
  }

  var html;
  if (options.chargingStationPopupTextCallback) {
    html = options.chargingStationPopupTextCallback(step);

  } else {
    html = '<p>';

    if (step.id) {
      html += 'Id: ' + step.id + '<br/>';
    }

    if (step.entrance) {
      var entrance = step.entrance;
      html += 'Latitude, longitude: ' + entrance.getLat() + ', ' + entrance.getLon() + '<br/>';
    }

    if (step.country || step.city || step.street) {
      html += 'Address:<br/>';

      if (step.streeNumber && step.street) {
        html += step.streeNumber + ' ' + step.street + '<br/>';
      } else {
        if (step.streeNumber) {
          html += step.streeNumber;
        }
        if (step.street) {
          html += step.street;
        }
        html += '<br/>';
      }

      if (step.postalCode && step.city) {
        html += step.postalCode + ' ' + step.city + '<br/>';
      } else {
        if (step.postalCode) {
          html += step.postalCode;
        }
        if (step.city) {
          html += step.city;
        }
        html += '<br/>';
      }

      if (step.country) {
        html += step.country + '<br/>';
      }
    }

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
  }

  this.popup.setInformation(html);
  this.popup.setCoordinate(step.entrance).show();
};

var bemap = bemap || {};
bemap.sample = bemap.sample || {};
bemap.sample.layers = {};
bemap.sample.destinations = [];
$(document).ready(function() {
  bemap.sample.init();

  var map = new bemap.LeafletMap(bemapMainCtx, 'map1').defaultLayers().move(2.0, 47.0, 5);

  bemap.sample.geo = new bemap.Geocoder(bemapMainCtx);

  bemap.sample.rou = new bemap.Routing(bemapMainCtx);

  map.on(bemap.Map.EventType.CLICK, function(mapEvent) {
    bemap.sample.reverseGeocoding(mapEvent);
  });

  bemap.sample.markerIcon = new bemap.Icon({
    src: 'start.svg',
    anchorX: 0.5,
    anchorY: 1,
    height: 36,
    width: 32,
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction',
    scale: 1
  });

  bemap.sample.map = map;
});

bemap.sample.reverseGeocoding = function(mapEvent) {
  console.log("reverseGeocoding");
  var p = mapEvent.coordinate;

  var elements = {
    geoserver: bemapMainCtx.geoserver,
    searchInfo: new bemap.RevGeoSearchInfo({
      xy: p.lon + ',' + p.lat,
      radius: "500",
      maxResult: "1"
    }),
    success: function(response, doc, object, xhr) {

      bemap.sample.reverseGeocodingParser(mapEvent, doc, response);
    }
  }
  //call revgeocode methode
  bemap.sample.geo.revGeocode(elements)
}

bemap.sample.reverseGeocodingParser = function(mapEvent, jsonDoc, response) {
  console.log("reverseGeocodingParser");
  var map = bemap.sample.map;
  var popup = bemap.sample.popup;
  var p = mapEvent.coordinate;

  var elements = jsonDoc.BND.Elements.Element;
  popup = new bemap.Popup({
    coordinate: p,
    visible: true,
    information: bemap.sample.buildPopup(elements)
  });

  map.addPopup(popup);

  bemap.sample.popup = popup;

  var container = $('#responseContainer table tbody');

  if (elements.length == 0) {
    return;
  }

  bemap.sample.addPoi(elements[0], container);
};

bemap.sample.resetTable = function() {
  console.log("resetTable");

  $('#myTable > tbody > tr').remove();
  bemap.sample.rou.reset()
  bemap.sample.map.clearPopup();
  bemap.sample.destinations = []
}



bemap.sample.buildPopup = function(e) {
  console.log("buildPopup");

  if (e.length == 0) {
    var html = '<p style="font-size:22px;color:red;"><span class=""></span> Address not found!</p>';

    console.error("Address not found!");

    return html;
  }

  var el = e[0];
  var p = el.PostalAddress;
  var c = el.Coordinate;

  var html = '<div class="row">';
  html += '<div class="col-md-12">';
  html += '<h4 style="color: blue">Local Data</h4>';
  html += 'City: ' + p.City + '</br>';
  html += 'Country: ' + p.Country + '</br>';
  html += 'Postal Code: ' + p.PostalCode + '</br>';
  html += 'Lon: ' + c.x + '</br>';
  html += 'Lat: ' + c.y + '</br>';
  html += '<div class="row">';
  html += '<div class="col-md-6">';
  html += '</br><button type="button" class="btn btn-primary addInfo" id="addInfo"><span></span> Add POI</button>';
  html += '</div></div></div></div></div>';

  return html;
}

bemap.sample.addPoi = function(element, container) {
  console.log("addPoi");

  var p = element.PostalAddress;
  var c = element.Coordinate;

  $('.addInfo').on("click", function() {

    var destination = {
      city: p.City,
      country: p.Country,
      postalCode: p.PostalCode,
      streetNumber: p.StreetNumber,
      street: p.Street,
      x: c.x,
      y: c.y,
      sl: element.SpeedLimit
    };

    var html = '<tr id="Row" class="cursorPointer">';
    html += '<td>' + destination.city + '</td>';
    html += '<td>' + destination.country + '</td><td>' + destination.postalCode + '</td>';
    html += '<td>' + destination.streetNumber + ' ' + destination.street + '</td>';
    html += '<td id="longitude">' + destination.x + '</td><td id="latitude">' + destination.y + '</td>';
    html += '</tr>';

    container.append(html);
    container.parent().closest('div').show()

    var coord = new bemap.Coordinate(c.x, c.y)
    var markerOptions = {
      map: bemap.sample.map,
      icon: bemap.sample.markerIcon,
      coord: coord,
      properties: html

    }
    bemap.sample.rou.createMarker(markerOptions)


    bemap.sample.destinations.push(coord)
  });
}

bemap.sample.run = function() {
  console.log("run");

  var elements = {}
  elements.request = {}
  elements.geoserver = bemapMainCtx.geoserver;

  /*
  destinations
  */
  if (bemap.sample.destinations && bemap.sample.destinations !== null) {
    elements.request.destinations = bemap.sample.destinations;
  }
  /*
  CRITERIAS
  */
  var criteriasArray = [];
  var $criteriasBox = $("input[name='criterias']:checked");
  if ($("input[name='criterias']").is(":checked")) {
    $criteriasBox.each(function() {
      criteriasArray.push($(this).val());
    });
    elements.request.criterias = criteriasArray;
    criteriasArray = [];
  }
  /*
  departureTime
  */
  var departureTime = $('#departureDate').val()
  var myDate = new Date(departureTime);
  var myDateMili = myDate.getTime();
  if (departureTime) {
    elements.request.departureTime = myDateMili;
  }
  /*
  maxAlter
  */
  if ($('#maxAlter').val() > 0) {
    elements.request.maxAlter = $('#maxAlter').val();
  }
  /*
  options
  */
  if ($('#options').val().length !== 0) {
    elements.request.options = $('#options').val();
  }
  /*
  transportType
  */
  if ($("input[name='vehicle']").is(":checked")) {
    elements.request.transportType = $("input[name='vehicle']:checked").val()
  }
  /*
  vf
  */
  if ($("input[name='feature']").is(":checked")) {
    elements.request.vf = $("#height").val() + ',' + $("#width").val() + ',' + $("#length").val() + ',' + $("#weight").val() + ',' + $("#axelWeight").val();
  }
  /*
  elements.success
  */
  elements.success = function(response, doc, object, xhr) {

    console.log("parsed");
    console.log(response);
    console.log("not parsed");
    console.log(doc);
    console.log("this object");
    console.log(object);
    console.log("request");
    console.log(xhr);

    var opts = {
      //changeColor : false
    }

    bemap.sample.rou.showOnMap(bemap.sample.map, opts, function(data) {
      console.log("info after click on polyline");
      console.log(data);
    })

    var optionsMarker = {
      map: bemap.sample.map,
      response: doc,
      icon: bemap.sample.markerIcon
    }

    var testMarkers = bemap.sample.rou.showOnMapMarkers(optionsMarker, function(res) {
      console.log("info after click on marker");
      console.log(res);
    })
  }
  bemap.sample.rou.compute(elements);
}


bemap.sample.init = function() {

  $('#criteriasFASTEST').click(function() {
    var t = $('#criteriasSHORTEST');
    if ($(this).prop('checked', true) && t.prop('checked', true)) {
      t.prop('checked', false);
    }
  });

  $('#criteriasSHORTEST').click(function() {
    var t = $('#criteriasFASTEST');
    if ($(this).prop('checked', true) && t.prop('checked', true)) {
      t.prop('checked', false);
    }
  });

  $("input[name='vehicle']:checkbox").click(function() {
    $("input[name='vehicle']:checkbox").not(this).prop('checked', false);
  });

  $('#run').click(function() {
    bemap.sample.run();
  });
  $('#clear').click(function() {
    bemap.sample.resetTable();
  });
};

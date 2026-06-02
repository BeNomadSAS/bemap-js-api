onLoaded = function () {
  var map = new bemap.LeafletMap(bemapMainCtx, 'map1').defaultLayers({
    styles: 'darkblue'
  }).move(7.2, 43.5, 5);

  map.addLayer(new bemap.WmsLayer({
    name: "traffic",
    url: "http://bemap-beta.benomad.com/bgis/wms?",
    styles: "traffic",
    transparent: true,
    format: 'image/png24'
  }));

  var markerLayer = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);
  var circleLayer = map.getLayerByName(bemap.Map.DEFAULT_LAYER.CIRCLE);
  var polygonLayer = map.getLayerByName(bemap.Map.DEFAULT_LAYER.POLYGON);
  var polylineLayer = map.getLayerByName(bemap.Map.DEFAULT_LAYER.POLYLINE);

  var clusterIcon = new bemap.Icon({
    src: 'styles/icones/icon--point.svg',
    anchorX: 0.5,
    anchorY: 0.5,
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction',
    scale: 0.12
  });
  var clusterLayer = new bemap.ClusterLayer();
  map.addLayer(clusterLayer);

  var defaultMarkerIcon = new bemap.Icon({
    src: 'images/map-marker-red.svg',
    anchorX: 0.5,
    anchorY: 1,
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction'
  });

  var markera = new bemap.Marker(
    new bemap.Coordinate(5.581, 43.564), {
    icon: defaultMarkerIcon
  });
  map.addMarker(markera, {
    layer: clusterLayer
  });

  var markerb = new bemap.Marker(
    new bemap.Coordinate(4.855, 44.056), {
    icon: defaultMarkerIcon
  });
  map.addMarker(markerb, {
    layer: clusterLayer
  });

  var markerc = new bemap.Marker(
    new bemap.Coordinate(6.416, 43.882), {
    icon: defaultMarkerIcon
  });
  map.addMarker(markerc, {
    layer: clusterLayer
  });
  var markerd = new bemap.Marker(
    new bemap.Coordinate(6.877, 43.484), {
    icon: defaultMarkerIcon
  });
  map.addMarker(markerd, {
    layer: clusterLayer
  });

  var markere = new bemap.Marker(
    new bemap.Coordinate(0.153, 46.088), {
    icon: defaultMarkerIcon
  });
  map.addMarker(markere, {
    layer: clusterLayer
  });

  var markerf = new bemap.Marker(
    new bemap.Coordinate(0.461, 45.120), {
    icon: defaultMarkerIcon
  });
  map.addMarker(markerf, {
    layer: clusterLayer
  });

  var marker = new bemap.Marker(
    new bemap.Coordinate(0, 0), {
    icon: new bemap.Icon({
      src: 'images/map-marker-red.svg',
      anchorX: 0.5,
      anchorY: 1,
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction'
    }),
    id: 'marker1'
  });
  map.addMarker(marker, {
    layer: markerLayer
  });

  var marker2 = new bemap.Marker(
    new bemap.Coordinate(7.5, 43.8), {
    icon: new bemap.Icon({
      src: 'images/evse-connector.png',
      anchorX: 0.5,
      anchorY: 1,
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction'
    }),
    id: 'marker2'
  });
  map.addMarker(marker2, {
    layer: markerLayer
  });

  var polyline = new bemap.Polyline(
    [new bemap.Coordinate(0, 0), new bemap.Coordinate(10, 43), new bemap.Coordinate(25, 60)], {
    style: new bemap.LineStyle({
      width: 10,
      color: new bemap.Color(198, 83, 140, 0.5),
      type: bemap.LineStyle.TYPE.PLANE
    }),
    id: 'polyline1'
  }
  );
  map.addPolyline(polyline, {
    layer: polylineLayer
  });


  var polyline2 = new bemap.Polyline(
    [new bemap.Coordinate(-2.021, 53.488), new bemap.Coordinate(12.041, 35.639), new bemap.Coordinate(33.046, 23.483)], {
    style: new bemap.LineStyle({
      width: 10,
      color: new bemap.Color(54, 32, 18, 0.5),
      type: bemap.LineStyle.TYPE.PLANE
    }),
    id: 'polyline1'
  }
  );
  map.addPolyline(polyline2, {
    layer: polylineLayer
  });

  var coords = [new bemap.Coordinate(-14.944785, 14.141063),
  new bemap.Coordinate(-3.162456, 32.871094),
  new bemap.Coordinate(17.308688, 28.652344),
  new bemap.Coordinate(30.297018, 8.4375)
  ];

  var polygon = new bemap.Polygon(coords, {
    style: new bemap.PolygonStyle({
      fillColor: new bemap.Color(112, 219, 112, 0.5),
      borderColor: new bemap.Color(112, 219, 112, 0.5),
      borderWidth: 4
    }),
    id: 'polygon1'
  });

  map.addPolygon(polygon, {
    layer: polygonLayer
  });

  var coords2 = [new bemap.Coordinate(21.7089, 54.3933),
  new bemap.Coordinate(30.4101, 52.3487),
  new bemap.Coordinate(35.5517, 46.3165),
  new bemap.Coordinate(18.5888, 43.2291)
  ];

  var polygon2 = new bemap.Polygon(coords2, {
    style: new bemap.PolygonStyle({
      fillColor: new bemap.Color(211, 89, 13, 0.5),
      borderColor: new bemap.Color(211, 89, 13, 0.5),
      borderWidth: 4
    }),
    id: 'polygon2'
  });

  map.addPolygon(polygon2, {
    layer: polygonLayer
  });

  var ccoords = new bemap.Coordinate(12.726084, 42.011719);

  var circle = new bemap.Circle(ccoords, 900000, {
    style: new bemap.CircleStyle({
      fillColor: new bemap.Color(119, 51, 255, 0.5),
      borderColor: new bemap.Color(119, 51, 255, 0.5),
      borderWidth: 4
    }),
    id: 'circle1'
  });
  map.addCircle(circle, {
    layer: circleLayer
  });

  var ccoords2 = new bemap.Coordinate(14, 53);

  var circle2 = new bemap.Circle(ccoords2, 90000, {
    style: new bemap.CircleStyle({
      fillColor: new bemap.Color(240, 0, 0, 0.5),
      borderColor: new bemap.Color(240, 0, 0, 0.5),
      borderWidth: 4
    }),
    id: 'circle2'
  });
  map.addCircle(circle2, {
    layer: circleLayer
  });

  marker.setCoordinate(new bemap.Coordinate(12.726084, 42.011719));
  circle.setCenter(new bemap.Coordinate(10, 50));
  circle.setRadius(90000);


  circle.on(bemap.Map.EventType.CLICK, function (mapEvent) {
    var popup = new bemap.Popup({
      coordinate: mapEvent.getCoordinate(),
      information: "<b>Hello!</b><br>I am a circle."
    });
    map.addPopup(popup);
    //circle.remove();
  });

  marker.on(bemap.Map.EventType.CLICK, function (mapEvent) {
    var popup = new bemap.Popup({
      coordinate: mapEvent.getCoordinate(),
      information: "<b>Hello world!</b><br>I am a popup."
    });
    map.addPopup(popup);
    //marker.remove();
  });

  polygon.on(bemap.Map.EventType.CLICK, function (mapEvent) {
    var popup = new bemap.Popup({
      coordinate: mapEvent.getCoordinate(),
      information: "<b>Hi!</b><br>I am a polygon."
    });
    map.addPopup(popup);
    //polygon.remove();
  });

  polyline.on(bemap.Map.EventType.CLICK, function (mapEvent) {
    var popup = new bemap.Popup({
      coordinate: mapEvent.getCoordinate(),
      information: "<b>Hi!</b><br>I am a Polyline."
    });
    map.addPopup(popup);
    polyline.remove();
  });

  polyline.on(bemap.Map.EventType.POINTERMOVE, function (mapEvent) {
    console.log("POINTERMOVE");
  });

  marker.draggable(function (mapEvent) {
    var coordinate = marker.getCoordinate();
  });

  circle.draggable(function (mapEvent) {
    var coordinate = circle.getCoordinate();
  });

  /*  polygon.draggable(function(mapEvent) {
    var coordinate = polygon.getCoordinate();
  });*/

  map.on(bemap.Map.EventType.CLICK, function (mapEvent) {
    var popup = new bemap.Popup({
      coordinate: mapEvent.getCoordinate(),
      information: "You clicked the map at LatLng (" + mapEvent.getCoordinate().getLat() + "   ,  " + mapEvent.getCoordinate().getLon() + ")"
    });
    map.addPopup(popup);
    //popup.setCoordinate(new bemap.Coordinate(7.5,43.5));
  });

  /*  map.on('contextmenu', (e) => {
      L.popup()
        .setLatLng(e.latlng)
        //.setContent('<pre>Hello</pre>')
        .addTo(map)
        .openOn(map);
    });
  */


  //popup.remove();

  markerLayer.setVisible(false);
  markerLayer.setVisible(true);
  //map.removeLayer(markerLayer);

  circleLayer.setVisible(false);
  circleLayer.setVisible(true);
  //map.removeLayer(circleLayer);

  polygonLayer.setVisible(false);
  polygonLayer.setVisible(true);
  //map.removeLayer(polygonLayer);

  polylineLayer.setVisible(false);
  polylineLayer.setVisible(true);
  //map.removeLayer(polylineLayer);

};

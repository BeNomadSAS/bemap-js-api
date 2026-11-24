onLoaded = function() {

  var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35012, 48.85889, 15);

  var coords = [new bemap.Coordinate(2.34673, 48.86332),
      new bemap.Coordinate(2.35842, 48.85798),
      new bemap.Coordinate(2.35372, 48.85223),
      new bemap.Coordinate(2.34392, 48.85174),
      new bemap.Coordinate(2.33507, 48.85414),
      new bemap.Coordinate(2.33395, 48.86001),
      new bemap.Coordinate(2.34673, 48.86332)
  ];

  var lcoords = [new bemap.Coordinate(2.34673, 48.86332),
      new bemap.Coordinate(2.35372, 48.85223),
  ];

  var ccoords = new bemap.Coordinate(2.35842, 48.85798);

  var icon = new bemap.Icon({
      src: 'images/map-marker-red.svg',
      anchorX: 0.5,
      anchorY: 1,
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction'
  });

  var marker = new bemap.Marker(
      new bemap.Coordinate(2.33507, 48.85414), {
          icon: icon,
          id: 'marker1',
          name: 'The Marker 1',
      });

  var circle = new bemap.Circle(ccoords, 500, {
      style: new bemap.CircleStyle({
        fillColor: new bemap.Color(255, 0, 0, 0.25),
        borderColor: new bemap.Color(255, 0, 255, 0.25),
        borderWidth: 3
        }),
    id: 'circle1'
  });

  var polygon = new bemap.Polygon(coords, {
      style: new bemap.PolygonStyle({
        fillColor: new bemap.Color(255, 0, 255, 0.25),
        borderColor: new bemap.Color(255, 0, 255, 0.25),
        borderWidth: 3
        }),
    id: 'polygon1'
  });

  var polyline = new bemap.Polyline(lcoords, {
          style: new bemap.LineStyle({
              width: 3,
              color: new bemap.Color(255, 0, 255, 1)
          }),
          id: 'polyline1'
      }
  );

  map.addMarker(marker);
  map.addCircle(circle);
  map.addPolygon(polygon);
  map.addPolyline(polyline);

  circle.draggable(function(mapEvent) {
    var coordinate = circle.getCenter();
    console.log(coordinate);
  });

  map.draggablePolygon(polygon, function(mapEvent) {
    var coordinate = polygon.getCoordinates();
    console.log(coordinate);
  });

  map.draggablePolyline(polyline, function(mapEvent) {
    var coordinate = polyline.getCoordinates();
    console.log(coordinate);
  });

  marker.draggable(function(mapEvent) {
    var coordinate = marker.getCoordinate();
    console.log(coordinate);
  });
};

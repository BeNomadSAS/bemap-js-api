onLoaded = function() {
  // ctx.tilesHost on bemapMainCtx routes the background through
  // BeNomad Tiles automatically. No style: option needed.
  var map = new bemap.MapLibreMap(bemapMainCtx, 'map1', {
    zoom: 3
  }).move(2.35, 48.85, 6);

  // Add a marker
  var marker = new bemap.Marker(
    new bemap.Coordinate(2.35, 48.85), {
      icon: new bemap.Icon({
        src: 'images/map-marker-red.svg',
        anchorX: 0.5,
        anchorY: 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
      }),
      id: 'paris'
    }
  );
  map.addMarker(marker);

  // Add a polyline
  var polyline = new bemap.Polyline(
    [new bemap.Coordinate(2.35, 48.85), new bemap.Coordinate(7.26, 43.71), new bemap.Coordinate(5.37, 43.29)], {
      style: new bemap.LineStyle({
        width: 4,
        color: new bemap.Color(13, 80, 157, 1)
      }),
      id: 'route1'
    }
  );
  map.addPolyline(polyline);

  // Add a popup
  var popup = new bemap.Popup({
    information: '<h3>Paris</h3><p>Capital of France</p>',
    coordinate: new bemap.Coordinate(2.35, 48.85)
  });
  map.addPopup(popup);

  // Map click event
  map.on(bemap.Map.EventType.CLICK, function(evt) {
    console.log('Clicked at:', evt.coordinate.getLon(), evt.coordinate.getLat());
  });
};

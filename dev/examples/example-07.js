onLoaded = function() {
  var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.316310441446311, 48.85786177229846, 18);

  // contextmenu
  map.on(bemap.Map.EventType.POINTERUP, function(mapEvent) {
    console.log("clicked on " + mapEvent.coordinate.getLon() + ", " + mapEvent.coordinate.getLat());
  });
};

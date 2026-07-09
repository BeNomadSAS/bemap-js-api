onLoaded = function() {
    // Center on metropolitan France so every object below sits nicely on-screen.
    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.6, 46.7, 5.5);

    var icon = new bemap.Icon({
        src: 'images/map-marker-red.svg',
        anchorX: 0.5,
        anchorY: 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
    });

    // All coordinates are bemap.Coordinate(lon, lat) — kept inside France so the
    // markers and polyline form a coherent scene instead of scattering worldwide.
    var marker = new bemap.Marker(
        new bemap.Coordinate(2.3522, 48.8566), {   // Paris
            icon: icon,
            id: 'marker1'
        });

    var marker2 = new bemap.Marker(
        new bemap.Coordinate(-0.5792, 44.8378), {   // Bordeaux
            icon: icon,
            id: 'marker2'
        });

    var polyline = new bemap.Polyline(
        [new bemap.Coordinate(-1.5536, 47.2184),   // Nantes
         new bemap.Coordinate(4.8357, 45.7640),    // Lyon
         new bemap.Coordinate(7.2620, 43.7102)], { // Nice
            style: new bemap.LineStyle({
                width: 3,
                color: new bemap.Color(255, 0, 255, 1)
            }),
            id: 'polyline1'
        }
    );

    var multimarker = new bemap.MultiMarker(
        [new bemap.Coordinate(1.4442, 43.6047),    // Toulouse
         new bemap.Coordinate(7.7521, 48.5734)], { // Strasbourg
            icon: icon,
            id: 'multimarker1'
        });

    map.addPolyline(polyline);
    map.addMarker(marker);
    map.addMarker(marker2);
    map.addMultiMarker(multimarker);
    var polylineLayer = map.getLayerByName(bemap.Map.DEFAULT_LAYER.POLYLINE);
    var markerLayer = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);

    // marker.setCoordinate(new bemap.Coordinate(7.12, 43.15));

    var mapPointerUpListener = map.on(bemap.Map.EventType.POINTERUP, function(mapEvent) {
        console.log("map => pointerup: " + mapEvent.properties.test);
    }, {
        test: "ok1"
    });

    map.onMarker(marker, bemap.Map.EventType.POINTERUP, function(mapEvent) {
        console.log("marker => pointerup :" + mapEvent.bemapObject.getId());
    });

    map.onMarkers(bemap.Map.EventType.POINTERUP, function(mapEvent) {
        console.log("onMarkers => pointerup :" + mapEvent.bemapObject.getId());
    }, {
        layerFilter: markerLayer
    });

    map.onMultiMarkers(bemap.Map.EventType.POINTERUP, function(mapEvent) {
        console.log("onMultiMarkers => pointerup :" + mapEvent.bemapObject.getId());
    });

    map.onPolyline(polyline, bemap.Map.EventType.POINTERUP, function(mapEvent) {
        console.log("onPolyline => pointerup :" + mapEvent.bemapObject.getId());
    });

    marker.draggable(function(mapEvent) {
        console.log("draggableMarker :" + mapEvent.bemapObject.getId());
    });

    marker2.draggable(function(mapEvent) {
        console.log("draggableMarker :" + mapEvent.bemapObject.getId());
    });

    // map.draggableMarkers(function(mapEvent) {
    //     console.log("draggableMarkers :" + mapEvent.bemapObject.getId());
    // }, {
    //     layerFilter: markerLayer
    // });

    // map.draggableMultiMarkers(function(mapEvent) {
    //     console.log("draggableMultiMarkers :" + mapEvent.bemapObject.getId());
    // });

    map.draggablePolyline(polyline, function(mapEvent) {
        console.log("draggablePolyline :" + mapEvent.bemapObject.getId());
    });

    // NOTE: do NOT removeListener() the marker drag here. This page's whole point
    // is draggable markers AND polylines, so both drag listeners must stay live.
    // The earlier `map.removeListener(markerDraggableListener)` disarmed the
    // marker drag (on OpenLayers it clears events.draggable/callback.draggable),
    // which is exactly why markers could not be dragged (PMT-28). removeListener
    // is demonstrated in its own example, not here.

    //polylineLayer.clear();
    //markerLayer.clear();
};

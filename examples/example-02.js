onLoaded = function() {
    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(0, 0, 2);

    var icon = new bemap.Icon({
        src: 'images/map-marker-red.svg',
        anchorX: 0.5,
        anchorY: 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
    });

    var marker = new bemap.Marker(
        new bemap.Coordinate(0, 0), {
            icon: icon,
            id: 'marker1'
        });

    var marker2 = new bemap.Marker(
        new bemap.Coordinate(4, 7), {
            icon: icon,
            id: 'marker2'
        });

    var polyline = new bemap.Polyline(
        [new bemap.Coordinate(0, 0), new bemap.Coordinate(10, 43), new bemap.Coordinate(25, 60)], {
            style: new bemap.LineStyle({
                width: 3,
                color: new bemap.Color(255, 0, 255, 1)
            }),
            id: 'polyline1'
        }
    );

    var multimarker = new bemap.MultiMarker(
        [new bemap.Coordinate(15, 23), new bemap.Coordinate(55, 0)], {
            icon: icon,
            id: 'multimarker1',
            name: 'Multi-marker',
            textStyle: new bemap.TextStyle()
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

    var markerDraggableListener = marker.draggable(function(mapEvent) {
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


    map.removeListener(mapPointerUpListener);
    map.removeListener(markerDraggableListener);

    //polylineLayer.clear();
    //markerLayer.clear();
};

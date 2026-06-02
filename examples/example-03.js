onLoaded = function() {
    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(0, 0, 2);

    var icon = new bemap.Icon({
        src: 'images/map-marker-red.svg',
        anchorX: 0.5,
        anchorY: 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
    });

    var textStyle = new bemap.TextStyle();

    var marker = new bemap.Marker(
        new bemap.Coordinate(0, 0), {
            icon: icon,
            id: 'marker1',
            name: 'The Marker 1',
            textStyle: textStyle
        });

    var marker2 = new bemap.Marker(
        new bemap.Coordinate(4, 7), {
            icon: icon,
            id: 'marker2',
            name: 'The Marker 2',
            textStyle: textStyle
        });

    map.addMarker(marker);
    map.addMarker(marker2);
    var markerLayer = map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER);

    map.on(bemap.Map.EventType.MOVEEND, function(evt) {
     console.log("MOVEEND");
    });
};

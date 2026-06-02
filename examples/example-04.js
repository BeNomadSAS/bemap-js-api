onLoaded = function() {
    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.35012, 48.85889, 15);

    var icon = new bemap.Icon({
        src: 'images/map-marker-red.svg',
        anchorX: 0.5,
        anchorY: 1,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
    });

    var textStyle = new bemap.TextStyle();

    var marker = new bemap.Marker(
        new bemap.Coordinate(2.35012, 48.85889), {
            icon: icon,
            id: 'marker1',
            name: 'The Marker 1',
            textStyle: textStyle
        });

    var coords = [new bemap.Coordinate(2.34673, 48.86332),
        new bemap.Coordinate(2.35842, 48.85798),
        new bemap.Coordinate(2.35372, 48.85223),
        new bemap.Coordinate(2.34392, 48.85174),
        new bemap.Coordinate(2.33507, 48.85414),
        new bemap.Coordinate(2.33395, 48.86001),
        new bemap.Coordinate(2.34673, 48.86332)
    ];

    var polygon = new bemap.Polygon(coords, {
        style: new bemap.PolygonStyle({
            fillColor: new bemap.Color(255, 0, 255, 0.25),
            borderColor: new bemap.Color(255, 0, 255, 0.25),
            borderWidth: 3
        }),
        id: 'polygon1'
    });

    map.addMarker(marker);
    map.addPolygon(polygon);

    console.log("Zoom = " + map.getZoom());
};

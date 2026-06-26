onLoaded = function() {
    var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers({
        markerAsCluster: false
    }).move(7.2, 43.59, 2);

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

    var marker2 = new bemap.Marker(
        new bemap.Coordinate(7.00001, 43.00001), {
            icon: new bemap.Icon({
                src: 'images/map-marker-red.svg',
                anchorX: 0.5,
                anchorY: 1,
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction'
            }),
            id: 'marker2'
        });

    var marker3 = new bemap.Marker(
        new bemap.Coordinate(5, 30), {
            icon: new bemap.Icon({
                src: 'images/map-marker-red.svg',
                anchorX: 0.5,
                anchorY: 1,
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction'
            }),
            id: 'marker3'
        });

    var polyline = new bemap.Polyline(
        [new bemap.Coordinate(0, 0), new bemap.Coordinate(10, 43), new bemap.Coordinate(25, 60)], {
            style: new bemap.LineStyle({
                width: 3,
                color: new bemap.Color(255, 0, 255, 1),
                type: bemap.LineStyle.TYPE.PLANE
            }),
            id: 'polyline1'
        }
    );

    var multimarker = new bemap.MultiMarker(
        [new bemap.Coordinate(15, 23), new bemap.Coordinate(55, 0)], {
            icon: new bemap.Icon({
                src: 'images/map-marker-red.svg',
                anchorX: 0.5,
                anchorY: 1,
                anchorYUnits: 'fraction',
                anchorXUnits: 'fraction'
            }),
            id: 'multimarker1'
        });

    var popup = new bemap.Popup({
        information: "<p>ceci est une popup de test</p>",
        coordinate: new bemap.Coordinate(30, 10)
    });

    var geocoder = new bemap.Geocoder(bemapMainCtx, {
        language: "french",
    });

    var searchInfo = new bemap.GeoSearchInfo({
        city: 'villeneuve-loubet',
        country: 'france',
        street: 'rue docteur julien lefebvre',
        streetNumber: '855',
    });

    var otherSearchInfo = new bemap.RevGeoSearchInfo({
        xy: "7.202222,43.761058",
        radius: "50",
        language: "fr",
        maxResult: 5,
        options: "ROAD_FEATURE"
    });

    geocoder.geocode({
        searchInfo: searchInfo,
        success: function(geocoder, items, doc, xhr) {
            console.log("Geocoding result:", items);
        },
        failed: function(error, doc, xhr) {
            console.log("Geocoding failed:", error);
        }
    });

    geocoder.revGeocode({
        searchInfo: otherSearchInfo,
        success: function(geocoder, items, doc, xhr) {
            console.log("RevGeocoding result:", items);
        },
        failed: function(error, doc, xhr) {
            console.log("RevGeocoding failed:", error);
        }
    });

    /**
     * Add objects to the map.
     */

    map.addMarker(marker);
    map.addMarker(marker2);
    map.addMarker(marker3);
    map.addPolyline(polyline);

    console.log(map);


    var callback = function(evt) {
        console.log("salut");
    };

    var callback2 = function(evt) {
        console.log("callback2");
    };

    var list = map.onPolyline(polyline, 'click', callback);

    map.removeListener(list);

    marker.on('click', callback2);
    // for (var i = 0; i < 1000; i++) {
    //     var marker_test = new bemap.Marker(new bemap.Coordinate(Math.random() * 10, Math.random() * 10));
    //     map.addMarker(marker_test);
    //     marker_test.draggable(callback);
    // }
    // map.addMultiMarker(multimarker);
    map.addPopup(popup);

    // marker.draggable(callback2);

    // polyline.on("click", function(evt) {
    //     console.log("polyline");
    // });

    // polyline.on("click", function(evt) {
    //     console.log("polyline2");
    // });

    /**
     * Remove objects from the map.
     */

    // polyline.remove();
    // map.removePolyline(polyline);

    // multimarker.remove();
    // map.removeMultimarker(multimarker);


    // marker.remove();
    // map.removeMarker(marker);

    /**
     * Remove all the objects from the map.
     */

    // map.clearLayer(map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER));

    // map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER).clear();

    /**
     * Remove a layer from the map.
     */

    // map.removeLayer(map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER));
    // map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER).remove();

    /**
     * set the visiblility of a layer.
     */
    // map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER).setVisible(false);
    // map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER).setVisible(true);

    // map.visibleLayer(map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER), false);
    // map.visible(map.getLayerByName(bemap.Map.DEFAULT_LAYER.MARKER), true);
};

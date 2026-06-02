var bemap = bemap || {};
$(document).ready(function() {
  //initialisation of map
  var map = new bemap.LeafletMap(bemapMainCtx, 'map1').defaultLayers({
    styles: 'darkblue'
  }).move(2.0, 47.0, 5);

  bemap.map = map;
  bemap.layers = {}
  //call the autocomplete class
  //var ac = new bemap.Autocomplete(bemapMainCtx);
  //options to change icon presence
  var options = {
    src: 'stop.svg'
  }

  var options1 = {
    map : bemap.map,
    id: '#country',
    animation : true
  };
  //call autocomplete methode
  /*ac.autocomp(options1, function(result) {
    console.log("result of selected item");
    console.log(result);
    //create marker on map with autocomplete methode
    ac.showOnMap(bemap.map, result.coordinate, options);
    //bemap js api mapping methode
    bemap.map.move(result.coordinate.longitude, result.coordinate.latitude, 15);
  })*/

  /*$("#city").keyup(function() {
    ac.query(bemap.map, this.value, function(result) {
      console.log("result with all propositions from autocomplete");
      console.log(result);
    });
  })*/

  //call th egeocoder class
  var geo = new bemap.Geocoder(bemapMainCtx);
  var geo1 = new bemap.Geocoding(bemapMainCtx);

  //after click clear all markers from map
  $('#reset').click(function() {
    geo.cleanMarkers()
  })

  //call geocoder functions
  $('#find').click(function() {

    var icone = {
      src: 'stop.svg',
      anchorX: 0.25,
      anchorY: 1,
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      scale: 1
    }
    /*to call function of geocode is required to create object with:
     * geoserver
     * searchInfo - object bemap.GeoSearchInfo with all input fields (id's or var)
     * call success function to get callback (response - parsed, doc - notparsed, object - this, xhr - request)
     */
    var elements = {
      geoserver: bemapMainCtx.geoserver,
      searchInfo: new bemap.GeoSearchInfo({
        searchType: $('#searchType').val(),
        country: $('#country').val(),
        postalCode: $('#postalCode').val(),
        city: $('#city').val(),
        street: $('#street').val(),
        language: $('#language').val(),
        maxResult: $('#quantity').val()
      }),
      success: function(response, doc, object, xhr) {
        console.log("parsed");
        console.log(response);
        console.log("not parsed");
        console.log(doc);
        console.log("this object");
        console.log(object);
        console.log("request");
        console.log(xhr);
        //example of creating markers with bemap-js-api mapping
        /*for (var i = 0; i < response.geocodingItems.length; i++) {
          var res = response.geocodingItems[i]

          var icon = new bemap.Icon({
            src: 'start.svg',
            anchorX:  0.25,
            anchorY:  1,
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: 1
          });

          var marker = new bemap.Marker(
            res.Coordinate, {
              properties: res,
              icon: icon,
              id: res.index
            });
          map.addMarker(marker);

          marker.on(bemap.Map.EventType.CLICK, function(mapEvent) {
            console.log(mapEvent);
          });
        }*/



        bemap.layers.chuj = new bemap.VectorLayer();
        bemap.map.addLayer(bemap.layers.chuj);
        //example of creating markers with geocoder solutions
        var container = $('#responseContainer');
        //is required to create object with map, response form server and container in which create table, optionally icon if want to create markers
        var options = {
          map: bemap.map,
          response: response,
          container: container,
          icone: icone,
          layer: bemap.layers.chuj
        }
        //create markers, optionally call function to get click response
        geo1.showOnMap(options, function(res) {
          console.log("info after click on marker");
          console.log(res);
        });
        //create table, optionally call function to get click response
        geo1.createTable(options, function(res) {
          console.log('info after click on list');
          console.log(res);

          var options1 = {
            map: bemap.map,
            response: res,
            icone: icone
          }
          //create marker from click on table, optionally call function to get click response
          geo1.showOnMap(options1, function(data) {
            console.log('info after click on marker made by list');
            console.log(data);
          })
        });

      }
    }
    //call geocode methode
    geo.geocode(elements);
  });

  $('#findRev').click(function() {
    var icone = {
      src: 'stop.svg',
      anchorX: 0.25,
      anchorY: 1,
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      scale: 1
    };
    /*to call function of revgeocode is required to create object with:
     * geoserver
     * searchInfo - object bemap.GeoSearchInfo with all input fields (id's or var)
     * call success function to get callback (response - parsed, doc - notparsed, object - this, xhr - request)
     */
    var elements = {
      geoserver: bemapMainCtx.geoserver,
      searchInfo: new bemap.RevGeoSearchInfo({
        xy: $('#longitude').val() + ',' + $('#latitude').val(),
        radius: $('#radius').val(),
        language: $('#languageRev').val(),
        maxResult: $('#maxResult').val()
      }),
      success: function(response, doc, object, xhr) {

        var container = $('#responseContainer');
        //is required to create object with map, response form server and contaner in which create table optionally icon if want to create markers
        var options = {
          map: bemap.map,
          response: response,
          container: container,
          icone: icone
        }
        //create marker, optionally call function to get click response
        geo.showOnMap(options);
        //create table, optionally call function to get click response
        geo.createTable(options, function(res) {
          console.log('info after click on list');
          console.log(res);
          var options1 = {
            map: bemap.map,
            response: res,
            icone: icone
          }
          //create marker from table click, optionally call function to get click response
          geo.showOnMap(options1);
        });
      }
    }
    //call revgeocode methode
    geo.revGeocode(elements)

  });




$("#marker").click(function(){
  geo1.cleanMarkers()
  console.log('chuj');
console.log(bemap.map);
console.log(bemap.layers);

//bemap.layers.chuj.setVisible(false)
})






  trafficWms = new bemap.BemapLayer({
    geoserver: "default",
    url : "/bgis/wms",
    //layers : '6913,6912,6911,6910,9990',
    styles : 'traffic',
    format : 'image/png24',
    // attributes : 'FEATURE_CLASS_CODE,TRAFIC_INFO'
    attributes : '1,21581',
    isBaseLayer : false,
    transitionEffect : "resize",
    singleTile : false,
    opacity : 0.7
  });

  bemap.map.addLayer(trafficWms)
});

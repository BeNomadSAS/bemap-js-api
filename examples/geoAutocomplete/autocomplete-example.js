var bemap = bemap || {};
$(document).ready(function() {
  //initialisation of map
  var map = new bemap.LeafletMap(bemapMainCtx, 'map1').defaultLayers({
    styles: 'darkblue'
  }).move(2.0, 47.0, 5);


  var auto = new bemap.GeoAutocomplete(bemapMainCtx);
  // DEBUG: Test version
  //var auto = new bemap.GeoAutocompleteTest(bemapMainCtx, );

  var countryId = $('#country');

  var inputId = $('#city');
  var options = {
    inputId: inputId,
    target: "city",
    countryCode: countryId,
    //city: "warszawa",
    maxResult: 15,
    timer: 1000, //in ms
    searchType : $('#searchType').val()
    //showList: false
  };

  var inputId2 = $('#street');
  var city = $('#city');
  var options2 = {
    inputId: inputId2,
    target: "street",
    countryCode: countryId,
    city: city,
    maxResult: 15,
    timer: 1000, //in ms
    searchType : $('#searchType').val()
    //showList: false
  };
  auto.autocomplete(options, function(res) {
    console.log(res);
  });
  auto.autocomplete(options2, function(res) {
    console.log(res);
  });
});

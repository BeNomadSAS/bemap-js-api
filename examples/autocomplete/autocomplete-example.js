var bemap = bemap || {};
$(document).ready(function() {

  var map = new bemap.LeafletMap(bemapMainCtx, 'map1').defaultLayers({
    styles: 'darkblue'
  }).move(2.0, 47.0, 5);

  bemap.map = map;

  var ac = new bemap.Autocomplete(bemapMainCtx);

  /*
  $('#autoInput').keyup(function() {
    ac.query(bemap.map, this.value, function(result) {
      console.log(result);
    });
  })
  */
  var options = {
    src: 'stop.svg'
  }

  var options1 = {
    map : map,
    id: '#autoInput',
    animation : true
  }

  var options2 = {
    map : map,
    id: '#autoInput1'
  }

  var options3 = {
    map : map,
    id: '#autoInput2'
  }

  ac.autocomp(options1, function(result) {
    ac.showOnMap(map, result.coordinate, options);
  })

  ac.autocomp(options2, function(result) {
    //ac.centerOnMap(bemap.map, result.coordinate);
    bemap.map.move(result.coordinate.longitude, result.coordinate.latitude, 15)
  })
  ac.autocomp(options3)
})

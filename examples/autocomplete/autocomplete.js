var bemap = bemap || {};

bemap.Autocomplete = function(context, options) {
  this.context = context;
  this.geoserver = context.geoserver;

  var opts = options ? options : {};

  if (opts.geoserver) {
    this.geoserver = opts.geoserver;
  }
};

bemap.Autocomplete.prototype.query = function(map, query, listener) {
  if (!map) {
    console.error("Map is required!");
  } else {
    var coordinate = map.getCenter()
  }
  var url = bemapMainCtx.getBaseUrl() + 'service/geocoding/autocomplete/1.0?' + bemapMainCtx.getAuthUrlParams();
  var request = {
    "geoserver": this.geoserver,
    "addressDetails": false,
    "coordinate": {
      "longitude": coordinate.getLon(),
      "latitude": coordinate.getLat()
    },
    "place": query
  };
  bemap.ajax('POST', url, request, function(xhr, response) {
    var responseJson = JSON.parse(response);
    var data = [];
    var items = responseJson.items;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var label = item.place.replace(/\|/g, '').replace(/ {2,}/g, ' ');
      data.push({
        value: label,
        label: label,
        item: item
      });
    }
    listener(data);
  });
};

//bemap.Autocomplete.prototype.autocomp = function(map, id, selectListener, animation) {

bemap.Autocomplete.prototype.autocomp = function(options, selectListener) {

  var map = options.map ? options.map : console.error("Map is required");
  var id = options.id ? options.id : console.error("Id is required");
  var animation = options.animation ? options.animation : false;

  var that = this;
  var tag = $(id);
  var parentTag = tag.parent();
  var feedbackTag = $('.form-control-feedback', parentTag);
  if (animation) {
    tag.keyup(function() {
      if ($(this).val() == "") {
        parentTag.parent().removeClass('has-success has-warning');
        feedbackTag.removeClass('glyphicon-ok glyphicon-refresh');
      }
    });
  }
  tag.autocomplete({
    source: function(request, response) {
      if (animation) {
        parentTag.parent().removeClass('has-success').addClass('has-warning');
        feedbackTag.removeClass('glyphicon-ok');
        feedbackTag.addClass('glyphicon-refresh');
      }
      that.query(map, request.term, function(data) {
        response(data);
      });
    },
    select: function(event, ui) {
      if (animation) {
        feedbackTag.addClass('glyphicon-refresh-animate');
        parentTag.parent().removeClass('has-warning').addClass('has-success');
        feedbackTag.removeClass('glyphicon-refresh-animate');
        feedbackTag.removeClass('glyphicon-refresh');
        feedbackTag.addClass('glyphicon-ok');
      }

      if (selectListener) {
        selectListener(ui.item.item);
      };
      return true;
    }
  });
};

bemap.Autocomplete.prototype.showOnMap = function(map, coord, options) {

  var opts = options ? options : {};
  var layer = opts.layer ? opts.layer : '';

  if (!coord) {
    console.error("Coordinates are required!");
  }

  var coordinate = coord;
  map.move(coordinate.longitude, coordinate.latitude, 10);
  var c = new bemap.Coordinate(coordinate.longitude, coordinate.latitude);

  var icon = new bemap.Icon({
    src: opts.src ? opts.src : 'start.svg',
    anchorX: opts.anchorX ? opts.anchorX : 0.25,
    anchorY: opts.anchorY ? opts.anchorY : 1,
    anchorXUnits: opts.anchorXUnits ? opts.anchorXUnits : 'fraction',
    anchorYUnits: opts.anchorYUnits ? opts.anchorYUnits : 'fraction',
    scale: opts.scale ? opts.scale : 1
  });

  if (!bemap.marker) {
    var marker = new bemap.Marker(c, {
      icon: icon
    });
    if (layer) {
      map.addMarker(marker, {
        layer: layer
      });
    }else {
      map.addMarker(marker);
    };
    bemap.marker = marker;
  }
  bemap.marker.setCoordinate(c);
};

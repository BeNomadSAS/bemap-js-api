var bemap = bemap || {};
bemap.layers = {};
bemap.geo = {};

bemap.Geocoding = function(context, options) {
  this.context = context;
  this.geoserver = context.geoserver;

  var opts = options ? options : {};

  if (opts.geoserver) {
    this.geoserver = opts.geoserver;
  }
};

bemap.Geocoding.prototype.buildRequest = function(elements) {

  var post = 'version=1.0.0&geoserver=' + this.geoserver + '&action=geocoding&format=json';
  post += '&searchType=' + (elements.searchType ? elements.searchType : '');
  post += '&country=' + (elements.country ? encodeURI(elements.country) : '');
  post += '&postalCode=' + (elements.postalCode ? encodeURI(elements.postalCode) : '');
  post += '&city=' + (elements.city ? encodeURI(elements.city) : '');
  post += '&street=' + (elements.street ? encodeURI(elements.street) : '');
  post += '&language=' + (elements.language ? elements.language : '');
  post += '&maxResult=' + (elements.maxResult ? elements.maxResult : 5);
  return post;
};

bemap.Geocoding.prototype.findGeo = function(map, elements, listener) {
  //  this.buildRequest();

  //var waitGlyphiconClasses = 'glyphicon glyphicon-refresh glyphicon-refresh-animate';
  var url = bemapMainCtx.getBaseUrl() + 'bnd?' + bemapMainCtx.getAuthUrlParams();
  var post = this.buildRequest(elements);

  //var findBtnSpan = $('#find span');
  //findBtnSpan.addClass(waitGlyphiconClasses);
  $('#responseContainer').empty();

  bemap.ajax("POST", url, post, function(xhr, doc) {
    //findBtnSpan.removeClass(waitGlyphiconClasses);
    console.log(doc);
    listener(doc)

  }, function(xhr, doc) {
    console.error("error during load: " + doc);
    //findBtnSpan.removeClass(waitGlyphiconClasses);
    map.move(0, 0, 10);
  });
};

bemap.Geocoding.prototype.createTable = function(options, listener) {

  if (!bemap.markerMapObject) {
    bemap.markerMapObject = [];
  };

  if (!options) {
    console.error("Options required");
  };

  if (!options.container) {
    console.error("Container required");
  };

  if (!options.response) {
    console.error("Response required");
  };

  var container = options.container;
  var doc = options.response;

  container.empty();

  var html = '<div><table class="table table-hover table-striped">';
  html += '<thead><th>City</th><th>Country</th><th>PostalCode</th><th>Place</th></thead><tbody>';

  for (var i = 0; i < doc.geocodingItems.length; i++) {

    var e = doc.geocodingItems[i];

    var p = e.PostalAddress[0];
    html += '<tr class="cursorPointer" data="' + i + '">';
    html += '<td>' + (p.city && p.city !== null ? p.city : '') + '</td>';
    html += '<td>' + (p.country && p.country !== null ? p.country : '') + '</td><td>' + (p.postalCode && p.postalCode !== null ? p.postalCode : '') + '</td>';
    html += '<td>' + (p.streetNumber && p.streetNumber !== null ? p.streetNumber : '') + ' ' + (p.street && p.street !== null ? p.street : '') + '</td></tr>';
  }

  html += '</tbody></table></div>';

  var theDiv = document.getElementById(container[0].id);
  theDiv.innerHTML += html;

  var theTr = document.querySelector('#' + container[0].id + ' tbody tr');

  theTr.addEventListener('click', function() {

    var index = this.getAttribute('data');

    var e = doc.geocodingItems[index];

    if (listener) {
      listener(e);
    };
  });
};


bemap.Geocoding.prototype.showOnMap = function(options, listener) {

  var map = options.map ? options.map : bemap.map;
  var layer = options.layer ? options.layer : '';
  console.log(layer);
  if (!options) {
    console.error("Options required");
  };

  if (!options.response) {
    console.error("Response required");
  };

  var doc = options.response;

  var icone = options.icone ? options.icone : {};

  this.cleanMarkers();

  if (doc.geocodingItems) {
    for (var i = 0; i < doc.geocodingItems.length; i++) {

      var e = doc.geocodingItems[i];

      this.createMarker(map, e, icone, layer, function(data) {
        if (listener) {
          listener(data);
        };
      });
    };
  } else {
    this.createMarker(map, doc, icone, layer, function(data) {
      if (listener) {
        listener(data);
      };
    });
  };
};

bemap.Geocoding.prototype.cleanMarkers = function() {
  if (bemap.markerMapObject) {
    for (i = 0; i < bemap.markerMapObject.length; i++) {
      var marker = bemap.markerMapObject[i];
      marker.remove();
      marker = undefined;
    };
    bemap.markerMapObject = [];
  } else {
    bemap.markerMapObject = [];
  };
};

bemap.Geocoding.prototype.createMarker = function(map, e, icone, layer, listener) {
  console.log(icone);

  map = map ? map : bemap.map;
  icone = icone ? icone : {};

  var posx = e.Coordinate.lon;
  var posy = e.Coordinate.lat;
  var c = new bemap.Coordinate(posx, posy);
  var icon = new bemap.Icon({
    src: icone.src ? icone.src : console.error("required icon/icon adress is wrong"),
    anchorX: icone.anchorX ? icone.anchorX : 0.25,
    anchorY: icone.anchorY ? icone.anchorY : 1,
    height: icone.height ? icone.height : '',
    width: icone.width ? icone.width : '',
    anchorXUnits: icone.anchorXUnits ? icone.anchorXUnits : 'fraction',
    anchorYUnits: icone.anchorYUnits ? icone.anchorYUnits : 'fraction',
    scale: icone.scale ? icone.scale : 1
  });

  if (bemap.markerMapObject) {
    for (var i = 0; i < bemap.markerMapObject.length; i++) {
      var merk = bemap.markerMapObject[i];
      if (merk.id == e.index) {
        map.move(posx, posy, 16);
        return
      };
    };
  };

  var marker = new bemap.Marker(
    c, {
      properties: e,
      icon: icon,
      id: e.index
    }
  );

  if (layer) {
    map.addMarker(marker, {
      layer: layer
    });
  } else {
    map.addMarker(marker);
  };

  bemap.markerMapObject.push(marker);

  marker.on(bemap.Map.EventType.CLICK, function(mapEvent) {
    if (listener) {
      listener(mapEvent);
    };
  });
};

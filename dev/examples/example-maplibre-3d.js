onLoaded = function() {

  /* ----------------------------------------------------------------
   * SPA-embed bridge: when this page lives inside the BeMap 2026
   * dashboard iframe, every button click reports the code snippet
   * that ran via postMessage. The dashboard's outer code panel
   * picks it up and shows the customer exactly what they need to
   * paste to reproduce the effect.
   * ---------------------------------------------------------------- */
  var _EMBED = (function () { try { return window.parent !== window; } catch (e) { return false; } })();
  function _post(p) { if (_EMBED) { try { window.parent.postMessage(p, '*'); } catch (e) {} } }
  // run(label, code, fn) — sends `code` to the dashboard code panel + console,
  // then runs `fn`. Catches errors and surfaces them in the dashboard console.
  function run(label, code, fn) {
    _post({ type: 'bemap:fn:code', code: '// ' + label + '\n' + code, label: 'example-maplibre-3d.js' });
    _post({ type: 'bemap:fn:log',  provider: 'demo', status: 'info', msg: 'run: ' + label });
    try { fn(); } catch (e) {
      _post({ type: 'bemap:fn:log', provider: 'demo', status: 'err', msg: label + ' — ' + e.message });
    }
  }

  // Background = BeNomad Tiles (via ctx.tilesHost). The globe projection,
  // atmosphere, and lighting are applied AFTER the map opens.
  var map = new bemap.MapLibreMap(bemapMainCtx, 'map1', {
    projection: 'globe',
    pitch: 20,
    bearing: 0,
    zoom: 1.5
  }).move(10, 30, 1.5);

  // Sky + light tuning — applied once the style has loaded.
  map.native.once('load', function () {
    try {
      map.native.setSky({
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0]
      });
      map.native.setLight({
        anchor: 'map',
        position: [1.5, 90, 80],
        color: '#ffffff',
        intensity: 0.4
      });
    } catch (e) { /* MapLibre v5 — silent fallback if the API shifts */ }
  });

  var spinning = false;
  var spinInterval = null;

  /* ----- Reset ----- */
  document.getElementById('btnReset').onclick = function() {
    run('Reset all',
      "map.setProjection('globe');\n" +
      "map.easeTo({ pitch: 20, bearing: 0, zoom: 1.5, center: [10, 30], duration: 1000 });\n" +
      "// stop spin if running\n" +
      "if (spinInterval) clearInterval(spinInterval);",
      function () {
        map.setProjection('globe');
        map.easeTo({ pitch: 20, bearing: 0, zoom: 1.5, center: [10, 30], duration: 1000 });
        if (spinning) {
          clearInterval(spinInterval);
          spinning = false;
          document.getElementById('btnSpin').textContent = 'Start Spin';
        }
        document.getElementById('sunSlider').value = 90;
        document.getElementById('btnAtmosphere').textContent = 'Atmosphere OFF';
      }
    );
  };

  /* ----- Projection ----- */
  document.getElementById('btnGlobe').onclick = function() {
    run('Globe projection',
      "map.setProjection('globe');\n" +
      "map.easeTo({ pitch: 20, zoom: 1.5, center: [10, 30], duration: 1500 });",
      function () {
        map.setProjection('globe');
        map.easeTo({ pitch: 20, zoom: 1.5, center: [10, 30], duration: 1500 });
      }
    );
  };
  document.getElementById('btnMercator').onclick = function() {
    run('Mercator 3D',
      "map.setProjection('mercator');\n" +
      "map.easeTo({ pitch: 60, zoom: 5, center: [11.5, 47.3], duration: 1500 });",
      function () {
        map.setProjection('mercator');
        map.easeTo({ pitch: 60, zoom: 5, center: [11.5, 47.3], duration: 1500 });
      }
    );
  };

  /* ----- Pitch ----- */
  document.getElementById('btnPitch0').onclick = function() {
    run('Pitch 0° (flat)', "map.easeTo({ pitch: 0, duration: 1000 });",
        function () { map.easeTo({ pitch: 0, duration: 1000 }); });
  };
  document.getElementById('btnPitch60').onclick = function() {
    run('Pitch 60° (tilted)', "map.easeTo({ pitch: 60, duration: 1000 });",
        function () { map.easeTo({ pitch: 60, duration: 1000 }); });
  };

  /* ----- Bearing ----- */
  document.getElementById('btnBearing0').onclick = function() {
    run('Bearing 0° (north)', "map.easeTo({ bearing: 0, duration: 1000 });",
        function () { map.easeTo({ bearing: 0, duration: 1000 }); });
  };
  document.getElementById('btnBearing90').onclick = function() {
    run('Bearing 90° (east)', "map.easeTo({ bearing: 90, duration: 1000 });",
        function () { map.easeTo({ bearing: 90, duration: 1000 }); });
  };

  /* ----- Fly to ----- */
  document.getElementById('btnFlyParis').onclick = function() {
    run('Fly to Paris', "map.flyTo(2.35, 48.85, 12);",
        function () { map.flyTo(2.35, 48.85, 12); });
  };
  document.getElementById('btnFlyNY').onclick = function() {
    run('Fly to New York', "map.flyTo(-74.0, 40.71, 12);",
        function () { map.flyTo(-74.0, 40.71, 12); });
  };
  document.getElementById('btnFlyTokyo').onclick = function() {
    run('Fly to Tokyo', "map.flyTo(139.69, 35.68, 12);",
        function () { map.flyTo(139.69, 35.68, 12); });
  };

  /* ----- Spinning globe ----- */
  document.getElementById('btnSpin').onclick = function() {
    if (spinning) {
      run('Stop spinning globe',
        "clearInterval(spinInterval);\nspinning = false;",
        function () {
          clearInterval(spinInterval);
          spinning = false;
          document.getElementById('btnSpin').textContent = 'Start Spin';
        }
      );
    } else {
      run('Start spinning globe',
        "spinInterval = setInterval(function () {\n" +
        "  var c = map.native.getCenter();\n" +
        "  map.native.jumpTo({ center: [c.lng + 0.5, c.lat], bearing: map.native.getBearing() + 0.3 });\n" +
        "}, 30);",
        function () {
          spinning = true;
          document.getElementById('btnSpin').textContent = 'Stop Spin';
          spinInterval = setInterval(function() {
            var center = map.native.getCenter();
            map.native.jumpTo({ center: [center.lng + 0.5, center.lat], bearing: map.native.getBearing() + 0.3 });
          }, 30);
        }
      );
    }
  };

  /* ----- Sun position ----- */
  document.getElementById('sunSlider').oninput = function() {
    var val = parseInt(this.value);
    run('Sun position = ' + val + '°',
      "var style = map.native.getStyle();\n" +
      "style.light = { anchor: 'map', position: [1.5, " + val + ", 80], color: '#ffffff', intensity: 0.5 };\n" +
      "map.native.setStyle(style);",
      function () {
        try {
          var style = map.native.getStyle();
          style.light = { anchor: 'map', position: [1.5, val, 80], color: '#ffffff', intensity: 0.5 };
          map.native.setStyle(style);
        } catch (e) {}
      }
    );
  };

  /* ----- Atmosphere toggle ----- */
  document.getElementById('btnAtmosphere').onclick = function() {
    run('Toggle atmosphere',
      "var style = map.native.getStyle();\n" +
      "if (style.sky) delete style.sky;\n" +
      "else style.sky = { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] };\n" +
      "map.native.setStyle(style);",
      function () {
        try {
          var style = map.native.getStyle();
          if (style.sky) {
            delete style.sky;
            document.getElementById('btnAtmosphere').textContent = 'Atmosphere ON';
          } else {
            style.sky = { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] };
            document.getElementById('btnAtmosphere').textContent = 'Atmosphere OFF';
          }
          map.native.setStyle(style);
        } catch (e) {}
      }
    );
  };

  /* ----- Markers + polygon on first style load ----- */
  map.native.on('load', function() {
    var cities = [
      { name: 'Paris', lon: 2.35, lat: 48.85 },
      { name: 'New York', lon: -74.0, lat: 40.71 },
      { name: 'Tokyo', lon: 139.69, lat: 35.68 },
      { name: 'Sydney', lon: 151.21, lat: -33.87 },
      { name: 'Cape Town', lon: 18.42, lat: -33.93 },
      { name: 'São Paulo', lon: -46.63, lat: -23.55 },
      { name: 'Moscow', lon: 37.62, lat: 55.75 },
      { name: 'Dubai', lon: 55.27, lat: 25.20 }
    ];

    for (var i = 0; i < cities.length; i++) {
      var city = cities[i];
      var marker = new bemap.Marker(
        new bemap.Coordinate(city.lon, city.lat), {
          icon: new bemap.Icon({ src: 'images/map-marker-red.svg', anchorX: 0.5, anchorY: 1, anchorXUnits: 'fraction', anchorYUnits: 'fraction' }),
          id: city.name
        }
      );
      map.addMarker(marker);
    }

    var polygon = new bemap.Polygon(
      [new bemap.Coordinate(-10, 35), new bemap.Coordinate(40, 35),
       new bemap.Coordinate(40, 70), new bemap.Coordinate(-10, 70)], {
        style: new bemap.PolygonStyle({
          fillColor: new bemap.Color(50, 100, 255, 0.15),
          borderColor: new bemap.Color(50, 100, 255, 0.8),
          borderWidth: 2
        }),
        id: 'europe-zone'
      }
    );
    map.addPolygon(polygon);
  });

  /* ----- Click on the globe → log the coordinate ----- */
  map.on(bemap.Map.EventType.CLICK, function(evt) {
    var lon = evt.coordinate.getLon().toFixed(2);
    var lat = evt.coordinate.getLat().toFixed(2);
    console.log('Globe clicked:', lon, lat);
  });
};

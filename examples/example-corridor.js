onLoaded = function() {
  var map = bemap.createMap(bemapMainCtx, 'map1').defaultLayers().move(2.34673, 48.86332, 7);

  var polygonStyle = new bemap.LineStyle({
    width: 3,
    color: new bemap.Color(198, 83, 140, 0.5),
    type: bemap.LineStyle.TYPE.PLANE
  });

  var circleStyle = new bemap.CircleStyle({
    fillColor: new bemap.Color(255, 0, 0, 0.25),
    borderColor: new bemap.Color(255, 0, 255, 0.25),
    borderWidth: 3
  });

  var coords = getData();

  var polyline = new bemap.Polyline(
    coords, {
      style: polygonStyle,
      id: 'polygon1'
    }
  );
  map.addPolyline(polyline);

  var showCirle = false;
  if (!showCirle) {
    return;
  }

  for (var i = 0; i < coords.length; i++) {
    var circle = new bemap.Circle(coords[i], 10, {
      style: circleStyle,
      id: 'circle' + i
    });
    map.addCircle(circle);
  }
};

getData = function() {
  return [
    new bemap.Coordinate(2.682783143965155, 48.511868322682695),
    new bemap.Coordinate(2.6986288066867195, 48.47958769573339),
    new bemap.Coordinate(2.7525718943406225, 48.44422122959888),
    new bemap.Coordinate(2.7596607841635405, 48.43930665922821),
    new bemap.Coordinate(2.8445952260206453, 48.37710863080863),
    new bemap.Coordinate(2.925953307287215, 48.325759194088405),
    new bemap.Coordinate(3.024270591004362, 48.282131517235584),
    new bemap.Coordinate(3.0321242500894994, 48.278398323862454),
    new bemap.Coordinate(3.1374342500894996, 48.22492832386246),
    new bemap.Coordinate(3.16034962795564, 48.21086067813731),
    new bemap.Coordinate(3.24987962795564, 48.14540067813731),
    new bemap.Coordinate(3.251896176737112, 48.14390282505225),
    new bemap.Coordinate(3.3215502080781847, 48.091346049458295),
    new bemap.Coordinate(3.407482037688421, 48.05873040031985),
    new bemap.Coordinate(3.413883761149679, 48.056147701471055),
    new bemap.Coordinate(3.4178640626965446, 48.05444522269862),
    new bemap.Coordinate(3.2867765403971863, 47.747969819756506),
    new bemap.Coordinate(3.2859703520120873, 47.74831464755311),
    new bemap.Coordinate(3.1810179623115786, 47.788149599680146),
    new bemap.Coordinate(3.139773823262888, 47.81092717494775),
    new bemap.Coordinate(3.052126453632447, 47.87706064990071),
    new bemap.Coordinate(2.974498810485281, 47.93381822300932),
    new bemap.Coordinate(2.885093868299267, 47.97921260396731),
    new bemap.Coordinate(2.779659408995638, 48.025998482764415),
    new bemap.Coordinate(2.7583040383809343, 48.0373981159832),
    new bemap.Coordinate(2.6618140383809346, 48.098298115983205),
    new bemap.Coordinate(2.6522992158364596, 48.10477334077179),
    new bemap.Coordinate(2.5662000508949103, 48.16782430326526),
    new bemap.Coordinate(2.477728105659377, 48.225828770401115),
    new bemap.Coordinate(2.4194965489432834, 48.29176891449143),
    new bemap.Coordinate(2.3783565489432834, 48.37557891449143),
    new bemap.Coordinate(2.369501505061101, 48.39739138497327),
    new bemap.Coordinate(2.341393850775538, 48.48366481432229),
    new bemap.Coordinate(2.6583308406533357, 48.58692204437575),
    new bemap.Coordinate(2.682783143965155, 48.511868322682695)
  ];
};

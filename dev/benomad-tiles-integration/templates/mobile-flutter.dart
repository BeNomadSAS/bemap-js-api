// ============================================================================
// Path C — Mobile (Flutter + maplibre_gl), z/x/y tiles.
//
// Why z/x/y and not pmtiles Range on mobile: MapLibre Native's SQLite ambient
// cache only works with classic {z}/{x}/{y} endpoints, not the pmtiles://
// protocol. Token rides as ?token= because maplibre_gl 0.25.x can't inject
// headers on tile requests; if your version exposes transformRequest, prefer
// the X-Session-Token header instead.
//
// deps (pubspec.yaml): maplibre_gl ^0.25.0, http ^1.2.0, flutter_secure_storage ^9.0.0
// ============================================================================
import 'dart:convert';
import 'dart:ui' show PlatformDispatcher;
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const String kTilesBase = 'https://mptiles-api-beta.benomad.net'; // swap per env
const String kTilesetFile = 'OSM_250901_WORLD'; // or the alias resolved from /api/maps

class BenomadTiles {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'benomad_tiles_token';
  String? _token;

  /// Login → JWT (valid ~1h). Store securely; never log the token in production.
  Future<void> login(String username, String password) async {
    final creds = base64Encode(utf8.encode('$username:$password'));
    final r = await http.post(Uri.parse('$kTilesBase/api/login'),
        headers: {'Authorization': 'Basic $creds', 'User-Agent': 'YourApp/1.0'});
    if (r.statusCode != 200) throw Exception('login failed: ${r.statusCode}');
    _token = (jsonDecode(r.body) as Map)['token'] as String;
    await _storage.write(key: _tokenKey, value: _token);
  }

  Future<String?> token() async => _token ??= await _storage.read(key: _tokenKey);

  Future<bool> sessionValid() async {
    final t = await token();
    if (t == null) return false;
    final r = await http.get(Uri.parse('$kTilesBase/api/status?token=$t'),
        headers: {'User-Agent': 'YourApp/1.0'});
    return r.statusCode == 200; // 401 → re-login
  }

  /// Fetch the server style and substitute the two BeNomad placeholders,
  /// pointing the source at authenticated z/x/y URLs. Pass result to
  /// MaplibreMap(styleString: ...). On 401 (token expired), re-login then
  /// rebuild and controller.setStyle(newStyle).
  Future<String> buildStyle() async {
    final t = await token();
    final r = await http.get(Uri.parse('$kTilesBase/api/default-style?token=$t'),
        headers: {'User-Agent': 'YourApp/1.0'});
    if (r.statusCode != 200) throw Exception('style failed: ${r.statusCode}');
    final style = jsonDecode(r.body) as Map<String, dynamic>;

    final meta = (style['metadata'] ?? {}) as Map<String, dynamic>;
    final srcPh = (meta['source_placeholder'] as String?) ?? 'TILES_SOURCE';
    final labelPh = (meta['place_label_placeholder'] as String?) ?? '__BILINGUAL_PLACE__';

    final sources = style['sources'] as Map<String, dynamic>;
    final baseSrc = (sources[srcPh] ?? {'type': 'vector'}) as Map<String, dynamic>;
    sources['tiles'] = {
      ...baseSrc,
      'tiles': ['$kTilesBase/$kTilesetFile/{z}/{x}/{y}.pbf?token=$t'],
      'minzoom': 0, 'maxzoom': 14, 'scheme': 'xyz',
    };
    if (srcPh != 'tiles') sources.remove(srcPh);

    final lang = PlatformDispatcher.instance.locale.languageCode.toLowerCase();
    final translated = ['coalesce', ['get', 'name_$lang'], ['get', 'name_en'], ['get', 'name']];
    final bilingual = [
      'format',
      translated, {'font-scale': 1.0, 'text-font': ['literal', ['Noto Sans Bold']]},
      ['case', ['all', ['has', 'name'], ['!=', translated, ['get', 'name']]], ['concat', '\n', ['get', 'name']], ''],
      {'font-scale': 0.75, 'text-font': ['literal', ['Noto Sans Regular']]},
    ];

    for (final layer in (style['layers'] as List)) {
      final l = layer as Map<String, dynamic>;
      if (l['source'] == srcPh) l['source'] = 'tiles';
      final layout = l['layout'] as Map<String, dynamic>?;
      if (layout != null && layout['text-field'] == labelPh) layout['text-field'] = bilingual;
    }
    return jsonEncode(style);
  }
}

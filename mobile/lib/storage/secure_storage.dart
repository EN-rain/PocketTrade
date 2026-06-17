import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists JWT tokens + user profile in [FlutterSecureStorage].
/// Notifies listeners when tokens change so GoRouter can re-evaluate redirects.
class TokenStore extends ChangeNotifier {
  TokenStore(this._storage);

  final FlutterSecureStorage _storage;
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _userKey = 'user_json';

  String? _access;
  String? _refresh;
  Map<String, dynamic>? _user;

  String? get accessTokenSync => _access;
  String? get refreshTokenSync => _refresh;
  Map<String, dynamic>? get userSync => _user;

  Future<String?> readAccess() async {
    _access = await _storage.read(key: _accessKey);
    return _access;
  }

  Future<String?> readRefresh() async {
    _refresh = await _storage.read(key: _refreshKey);
    return _refresh;
  }

  Future<Map<String, dynamic>?> readUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        _user = decoded;
        return _user;
      }
    } catch (_) {
      _user = null;
    }
    return null;
  }

  Future<void> setTokens({
    required String access,
    required String refresh,
    Map<String, dynamic>? user,
  }) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
    _access = access;
    _refresh = refresh;
    if (user != null) {
      _user = user;
      await _storage.write(key: _userKey, value: jsonEncode(user));
    }
    notifyListeners();
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userKey);
    _access = null;
    _refresh = null;
    _user = null;
    notifyListeners();
  }
}

import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pocket_trade/api/api_client.dart';
import 'package:pocket_trade/storage/secure_storage.dart';

class _FakeAdapter implements HttpClientAdapter {
  int refreshCalls = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    const jsonHeaders = {
      Headers.contentTypeHeader: ['application/json'],
    };

    if (options.path.endsWith('/auth/refresh')) {
      refreshCalls += 1;
      await Future<void>.delayed(const Duration(milliseconds: 30));
      return ResponseBody.fromString(
        '{"accessToken":"session-a","refreshToken":"session-b"}',
        200,
        headers: jsonHeaders,
      );
    }

    if (options.path.endsWith('/users/me')) {
      if (options.headers['Authorization'] != 'Bearer session-a') {
        return ResponseBody.fromString(
          '{"statusCode":401,"message":"expired"}',
          401,
          headers: jsonHeaders,
        );
      }
      return ResponseBody.fromString(
        '{"id":1,"email":"user@example.test","role":"user"}',
        200,
        headers: jsonHeaders,
      );
    }

    if (options.path.endsWith('/auth/logout')) {
      return ResponseBody.fromString(
        '{"statusCode":503,"message":"offline"}',
        503,
        headers: jsonHeaders,
      );
    }

    return ResponseBody.fromString('{}', 404, headers: jsonHeaders);
  }

  @override
  void close({bool force = false}) {}
}

Dio _testDio(_FakeAdapter adapter) {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://api.example.test',
    responseType: ResponseType.json,
    contentType: 'application/json',
  ));
  dio.httpClientAdapter = adapter;
  return dio;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late TokenStore tokenStore;

  setUp(() async {
    FlutterSecureStorage.setMockInitialValues({});
    tokenStore = TokenStore(const FlutterSecureStorage());
    await tokenStore.setTokens(access: 'expired-a', refresh: 'expired-b');
  });

  test(
      'concurrent unauthorized responses across clients share one refresh operation',
      () async {
    final adapter = _FakeAdapter();
    final firstClient = ApiClient(
      baseUrl: 'https://api.example.test',
      tokenStore: tokenStore,
      dio: _testDio(adapter),
      refreshDio: _testDio(adapter),
    );
    final secondClient = ApiClient(
      baseUrl: 'https://api.example.test',
      tokenStore: tokenStore,
      dio: _testDio(adapter),
      refreshDio: _testDio(adapter),
    );

    final results =
        await Future.wait([firstClient.getMe(), secondClient.getMe()]);

    expect(results, hasLength(2));
    expect(adapter.refreshCalls, 1);
    expect(await tokenStore.readAccess(), 'session-a');
    expect(await tokenStore.readRefresh(), 'session-b');
  });

  test('logout clears local credentials even when server revocation fails',
      () async {
    final adapter = _FakeAdapter();
    final client = ApiClient(
      baseUrl: 'https://api.example.test',
      tokenStore: tokenStore,
      dio: _testDio(adapter),
      refreshDio: _testDio(adapter),
    );

    await client.logout();

    expect(await tokenStore.readAccess(), isNull);
    expect(await tokenStore.readRefresh(), isNull);
  });
}

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/services.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'router.dart';
import 'storage/secure_storage.dart';
import 'theme/app_theme.dart';
import 'theme/theme_mode_controller.dart';

Future<void> main() async {
  final widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);

  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await Firebase.initializeApp();

  const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  final tokenStore = TokenStore(storage);
  await tokenStore.hydrate();
  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: PocketTradeApp(tokenStore: tokenStore),
    ),
  );
  WidgetsBinding.instance.addPostFrameCallback((_) {
    FlutterNativeSplash.remove();
  });
}

class PocketTradeApp extends ConsumerWidget {
  const PocketTradeApp({super.key, required this.tokenStore});

  final TokenStore tokenStore;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeControllerProvider);
    return MaterialApp.router(
      title: 'PocketTrade',
      debugShowCheckedModeBanner: false,
      theme: buildPocketTradeTheme(Brightness.light),
      darkTheme: buildPocketTradeTheme(Brightness.dark),
      themeMode: themeMode,
      routerConfig: appRouter(tokenStore),
    );
  }
}

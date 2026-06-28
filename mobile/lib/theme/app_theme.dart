import 'package:flutter/material.dart';

ThemeData buildPocketTradeTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  const primary = Color(0xFF0B6B61);
  const backgroundLight = Color(0xFFF5F7F6);
  const backgroundDark = Color(0xFF091412);
  const surfaceLight = Colors.white;
  const surfaceDark = Color(0xFF10201D);
  const surfaceHighLight = Color(0xFFE8EFEC);
  const surfaceHighDark = Color(0xFF16302C);
  const borderLight = Color(0xFFD4DDDA);
  const borderDark = Color(0xFF285048);
  const textLight = Color(0xFF10201D);
  const textDark = Color(0xFFF2FBF8);

  final scheme = ColorScheme.fromSeed(
    seedColor: primary,
    brightness: brightness,
  ).copyWith(
    primary: isDark ? const Color(0xFF58C2B5) : primary,
    secondary: isDark ? const Color(0xFF58C2B5) : const Color(0xFF1F5FBF),
    tertiary: isDark ? const Color(0xFF58C2B5) : const Color(0xFFE59E0B),
    surface: isDark ? surfaceDark : surfaceLight,
    surfaceContainerHighest: isDark ? surfaceHighDark : surfaceHighLight,
    error: isDark ? const Color(0xFFFF8A80) : const Color(0xFFB42318),
    onSurface: isDark ? textDark : textLight,
    onSurfaceVariant:
        isDark ? const Color(0xFFB7CDC8) : const Color(0xFF607873),
    primaryContainer:
        isDark ? const Color(0xFF133A35) : const Color(0xFFDCEFEB),
    onPrimaryContainer: isDark ? textDark : textLight,
    outline: isDark ? borderDark : borderLight,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: isDark ? backgroundDark : backgroundLight,
    colorScheme: scheme,
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      backgroundColor: isDark ? backgroundDark : backgroundLight,
      foregroundColor: scheme.onSurface,
      surfaceTintColor: Colors.transparent,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? const Color(0xFF102825) : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: borderLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: isDark ? borderDark : borderLight),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: scheme.primary, width: 1.4),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        side: BorderSide(color: isDark ? borderDark : borderLight),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    cardTheme: CardThemeData(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      margin: EdgeInsets.zero,
      color: isDark ? surfaceDark : surfaceLight,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.all(Radius.circular(8)),
        side: BorderSide(
            color: isDark ? const Color(0xFF1B3530) : const Color(0xFFE2E8E5)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: isDark ? surfaceDark : Colors.white,
      indicatorColor:
          isDark ? const Color(0xFF163A34) : const Color(0xFFDCEFEB),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
  );
}

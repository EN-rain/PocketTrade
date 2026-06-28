import 'package:flutter/material.dart';

ThemeData buildPocketTradeTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  const primary = Color(0xFF0B6B61);
  const backgroundLight = Color(0xFFF5F7F6);
  const backgroundDark = Color(0xFF081211);
  const surfaceLight = Colors.white;
  const surfaceDark = Color(0xFF0F1B1A);
  const surfaceHighLight = Color(0xFFE8EFEC);
  const surfaceHighDark = Color(0xFF152625);
  const borderLight = Color(0xFFD4DDDA);
  const borderDark = Color(0xFF27504A);
  const textLight = Color(0xFF10201D);
  const textDark = Color(0xFFF2F8F6);
  const primaryDark = Color(0xFF63C7BA);
  const secondaryDark = Color(0xFF9FC4BB);
  const tertiaryDark = Color(0xFFD6B779);
  const errorDark = Color(0xFFFF9A8F);

  final scheme = ColorScheme.fromSeed(
    seedColor: primary,
    brightness: brightness,
  ).copyWith(
    primary: isDark ? primaryDark : primary,
    secondary: isDark ? secondaryDark : const Color(0xFF1F5FBF),
    tertiary: isDark ? tertiaryDark : const Color(0xFFE59E0B),
    surface: isDark ? surfaceDark : surfaceLight,
    surfaceContainerHighest: isDark ? surfaceHighDark : surfaceHighLight,
    error: isDark ? errorDark : const Color(0xFFB42318),
    onSurface: isDark ? textDark : textLight,
    onSurfaceVariant:
        isDark ? const Color(0xFFB4C8C2) : const Color(0xFF607873),
    primaryContainer:
        isDark ? const Color(0xFF173733) : const Color(0xFFDCEFEB),
    onPrimaryContainer: isDark ? textDark : textLight,
    outline: isDark ? borderDark : borderLight,
    outlineVariant: isDark ? const Color(0xFF1A2E2C) : const Color(0xFFE2E8E5),
    surfaceContainer:
        isDark ? const Color(0xFF122120) : const Color(0xFFF0F5F3),
    surfaceContainerLow:
        isDark ? const Color(0xFF0D1716) : const Color(0xFFF7FAF9),
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
      fillColor: isDark ? const Color(0xFF112220) : Colors.white,
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
          color: isDark ? const Color(0xFF1A2E2C) : const Color(0xFFE2E8E5),
        ),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: isDark ? surfaceDark : Colors.white,
      indicatorColor:
          isDark ? const Color(0xFF163330) : const Color(0xFFDCEFEB),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: isDark ? const Color(0xFF173733) : null,
      contentTextStyle: TextStyle(
        color: isDark ? textDark : null,
      ),
      actionTextColor: isDark ? primaryDark : null,
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: isDark ? primaryDark : primary,
      circularTrackColor:
          isDark ? const Color(0xFF1A2E2C) : const Color(0xFFE2E8E5),
    ),
    textSelectionTheme: TextSelectionThemeData(
      cursorColor: isDark ? primaryDark : primary,
      selectionColor: (isDark ? primaryDark : primary).withValues(alpha: 0.24),
      selectionHandleColor: isDark ? primaryDark : primary,
    ),
  );
}

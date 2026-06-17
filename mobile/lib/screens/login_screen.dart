import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../storage/secure_storage.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.tokenStore, required this.apiUrl});

  final TokenStore tokenStore;
  final String apiUrl;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  late final ApiClient _api = ApiClient(baseUrl: widget.apiUrl, tokenStore: widget.tokenStore);

  bool _otpSent = false;
  bool _loading = false;
  String? _error;
  String? _devCode;

  Future<void> _requestOtp() async {
    final email = _emailCtrl.text.trim().toLowerCase();
    if (!email.contains('@')) {
      setState(() => _error = 'Enter a valid email address');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _devCode = null;
    });
    try {
      final res = await _api.requestOtp(email);
      setState(() {
        _otpSent = true;
        _devCode = res['devCode'] as String?;
      });
    } catch (e) {
      setState(() => _error = 'Failed to send OTP: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final email = _emailCtrl.text.trim().toLowerCase();
    final code = _otpCtrl.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'OTP must be 6 digits');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.verifyOtp(email, code);
      await widget.tokenStore.setTokens(
        access: res['accessToken'] as String,
        refresh: res['refreshToken'] as String,
        user: Map<String, dynamic>.from(res['user'] as Map),
      );
      await FirebaseMessaging.instance.requestPermission();
      final pushToken = await FirebaseMessaging.instance.getToken();
      if (pushToken != null) {
        await _api.registerPushToken(pushToken, 'android');
      }
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      setState(() => _error = 'Invalid OTP: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.mail_outline, size: 64, color: Colors.blueAccent),
                const SizedBox(height: 16),
                Text(
                  'PocketTrade',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _emailCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Email address',
                    hintText: 'you@example.com',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  enabled: !_otpSent,
                ),
                const SizedBox(height: 16),
                if (_otpSent) ...[
                  TextField(
                    controller: _otpCtrl,
                    decoration: const InputDecoration(
                      labelText: '6-digit code',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(6),
                    ],
                  ),
                  if (_devCode != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Dev mode code: $_devCode',
                      style: const TextStyle(color: Colors.orange),
                    ),
                  ],
                  const SizedBox(height: 16),
                ],
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_error!, style: const TextStyle(color: Colors.red)),
                  ),
                  const SizedBox(height: 12),
                ],
                FilledButton(
                  onPressed: _loading ? null : (_otpSent ? _verifyOtp : _requestOtp),
                  child: _loading
                      ? const SizedBox(
                          height: 18, width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_otpSent ? 'Verify' : 'Send OTP'),
                ),
                if (_otpSent)
                  TextButton(
                    onPressed: _loading ? null : _requestOtp,
                    child: const Text('Resend OTP'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

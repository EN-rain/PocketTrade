import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../models/app_user.dart';
import '../storage/secure_storage.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.apiUrl, required this.tokenStore});
  final String apiUrl;
  final TokenStore tokenStore;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  AppUser? _user;
  String? _error;
  bool _loading = true;

  late final ApiClient _api = ApiClient(baseUrl: widget.apiUrl, tokenStore: widget.tokenStore);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await _api.getMe();
      if (!mounted) return;
      setState(() {
        _user = AppUser.fromJson(res);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load profile: $e';
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    await _api.logout();
    if (!mounted) return;
    context.go('/login');
  }

  Future<void> _showMyListings() async {
    final raw = await _api.myListings();
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: ListView(
          children: raw.map((e) {
            final m = Map<String, dynamic>.from(e as Map);
            final id = m['id'].toString();
            return ListTile(
              title: Text('${m['brand']} ${m['model']}'),
              subtitle: Text(m['status']?.toString() ?? ''),
              trailing: PopupMenuButton<String>(
                onSelected: (v) async {
                  if (v == 'sold') await _api.markSold(id);
                  if (v == 'remove') await _api.removeListing(id);
                  if (v == 'republish') await _api.republish(id);
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'sold', child: Text('Mark sold')),
                  PopupMenuItem(value: 'remove', child: Text('Remove')),
                  PopupMenuItem(value: 'republish', child: Text('Republish')),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Future<void> _editProfile() async {
    final nameCtrl = TextEditingController(text: _user?.displayName ?? '');
    final locationCtrl = TextEditingController(text: _user?.location ?? '');
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Edit profile'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Display name')),
            TextField(controller: locationCtrl, decoration: const InputDecoration(labelText: 'Location')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );
    if (saved == true) {
      await _api.updateMe({'displayName': nameCtrl.text.trim(), 'location': locationCtrl.text.trim()});
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
              : Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const CircleAvatar(radius: 40, child: Icon(Icons.person, size: 48)),
                      const SizedBox(height: 16),
                      Text(_user?.email ?? '', style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
                      const SizedBox(height: 8),
                      Text(_user?.displayName ?? 'No display name', textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      FilledButton.icon(onPressed: _editProfile, icon: const Icon(Icons.edit), label: const Text('Edit profile')),
                      OutlinedButton.icon(onPressed: () => context.push('/favorites'), icon: const Icon(Icons.favorite_outline), label: const Text('Saved listings')),
                      OutlinedButton.icon(onPressed: _showMyListings, icon: const Icon(Icons.list_alt), label: const Text('My listings')),
                      OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.notifications_outlined), label: const Text('Notification preferences')),
                      OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.description_outlined), label: const Text('Terms and privacy')),
                      const Spacer(),
                      OutlinedButton.icon(onPressed: _logout, icon: const Icon(Icons.logout), label: const Text('Log out')),
                    ],
                  ),
                ),
    );
  }
}

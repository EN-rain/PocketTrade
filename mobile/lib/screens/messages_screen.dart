import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../storage/secure_storage.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key, required this.apiUrl, required this.tokenStore});
  final String apiUrl;
  final TokenStore tokenStore;

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  late final ApiClient _api = ApiClient(baseUrl: widget.apiUrl, tokenStore: widget.tokenStore);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final raw = await _api.conversations();
    if (!mounted) return;
    setState(() {
      _items = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No conversations yet'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final c = _items[i];
                      final listing = Map<String, dynamic>.from(c['listing'] as Map? ?? {});
                      final messages = c['messages'] as List<dynamic>? ?? const [];
                      final last = messages.isNotEmpty ? Map<String, dynamic>.from(messages.first as Map) : null;
                      return ListTile(
                        title: Text('${listing['brand'] ?? ''} ${listing['model'] ?? ''}'),
                        subtitle: Text(last?['content']?.toString() ?? 'No messages yet'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push('/chat/${c['id']}'),
                      );
                    },
                  ),
                ),
    );
  }
}

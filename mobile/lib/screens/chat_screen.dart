import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../api/api_client.dart';
import '../storage/secure_storage.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.apiUrl, required this.tokenStore, required this.conversationId});
  final String apiUrl;
  final TokenStore tokenStore;
  final String conversationId;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _ctrl = TextEditingController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  io.Socket? _socket;
  late final ApiClient _api = ApiClient(baseUrl: widget.apiUrl, tokenStore: widget.tokenStore);

  @override
  void initState() {
    super.initState();
    _load();
    _connectSocket();
  }

  Future<void> _connectSocket() async {
    final token = await widget.tokenStore.readAccess();
    if (token == null) return;
    _socket = io.io(
      widget.apiUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );
    _socket!.onConnect((_) {
      _socket!.emit('joinConversation', {'conversationId': int.parse(widget.conversationId)});
    });
    _socket!.on('messageCreated', (payload) {
      final message = Map<String, dynamic>.from(payload as Map);
      if (message['conversationId'].toString() == widget.conversationId && mounted) {
        setState(() => _messages.add(message));
      }
    });
    _socket!.connect();
  }

  Future<void> _load() async {
    final raw = await _api.messages(widget.conversationId);
    setState(() {
      _messages = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      _loading = false;
    });
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    _ctrl.clear();
    await _api.sendMessage(widget.conversationId, text);
    await _load();
  }

  @override
  void dispose() {
    _socket?.dispose();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                        child: Text(_messages[i]['content']?.toString() ?? ''),
                      ),
                    ),
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(children: [
                Expanded(child: TextField(controller: _ctrl, decoration: const InputDecoration(hintText: 'Message', border: OutlineInputBorder()))),
                const SizedBox(width: 8),
                IconButton.filled(onPressed: _send, icon: const Icon(Icons.send)),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

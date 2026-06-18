import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../api/api_client.dart';
import '../models/listing.dart';
import '../storage/secure_storage.dart';

class ListingDetailsScreen extends StatefulWidget {
  const ListingDetailsScreen({
    super.key,
    required this.apiUrl,
    required this.listingId,
    required this.tokenStore,
  });
  final String apiUrl;
  final String listingId;
  final TokenStore tokenStore;

  @override
  State<ListingDetailsScreen> createState() => _ListingDetailsScreenState();
}

class _ListingDetailsScreenState extends State<ListingDetailsScreen> {
  late final ApiClient _api = ApiClient(baseUrl: widget.apiUrl, tokenStore: widget.tokenStore);
  Listing? _listing;
  String? _error;
  bool _loading = true;
  bool _actioning = false;

  static final _money = NumberFormat.simpleCurrency(decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await _api.getListing(widget.listingId);
      if (!mounted) return;
      setState(() {
        _listing = Listing.fromJson(res);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load listing: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Listing')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
              : _listing == null
                  ? const Center(child: Text('Listing not found'))
                  : _buildBody(_listing!),
    );
  }

  Widget _buildBody(Listing l) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (l.images.isNotEmpty)
            SizedBox(
              height: 280,
              child: PageView.builder(
                itemCount: l.images.length,
                itemBuilder: (context, i) => CachedNetworkImage(
                  imageUrl: l.images[i].url,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(color: Colors.grey.shade200),
                  errorWidget: (_, __, ___) => Container(
                    color: Colors.grey.shade200,
                    child: const Icon(Icons.broken_image),
                  ),
                ),
              ),
            )
          else
            Container(
              height: 280,
              color: Colors.grey.shade200,
              child: const Icon(Icons.phone_iphone, size: 80, color: Colors.grey),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${l.brand} ${l.model}', style: Theme.of(context).textTheme.headlineSmall),
                if (l.status == 'sold') ...[
                  const SizedBox(height: 8),
                  const Chip(label: Text('Sold')),
                ],
                const SizedBox(height: 8),
                Text(_money.format(l.price),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    )),
                const Divider(height: 24),
                _spec('Storage', l.storage),
                _spec('Condition', l.condition),
                if (l.color.isNotEmpty) _spec('Colour', l.color),
                _spec('Location', l.location),
                _spec('Posted', DateFormat.yMMMd().format(l.createdAt)),
                const SizedBox(height: 16),
                const Text('Description', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(l.description),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _actioning ? null : () async {
                          setState(() => _actioning = true);
                          final conversation = await _api.startConversation(l.id);
                          if (!mounted) return;
                          setState(() => _actioning = false);
                          context.push('/chat/${conversation['id']}');
                        },
                        icon: const Icon(Icons.chat_bubble_outline),
                        label: const Text('Message Seller'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filledTonal(
                      tooltip: 'Save',
                      onPressed: () async {
                        await _api.addFavorite(l.id);
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
                      },
                      icon: const Icon(Icons.favorite_outline),
                    ),
                    IconButton.filledTonal(
                      tooltip: 'Report',
                      onPressed: () async {
                        await _api.report({'reportedListingId': int.parse(l.id), 'reason': 'scam', 'details': 'Reported from listing details'});
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Report submitted')));
                      },
                      icon: const Icon(Icons.flag_outlined),
                    ),
                    if (l.seller != null)
                      IconButton.filledTonal(
                        tooltip: 'Block seller',
                        onPressed: () async {
                          await _api.blockUser(l.seller!.id);
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seller blocked')));
                        },
                        icon: const Icon(Icons.block),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _spec(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: const TextStyle(color: Colors.grey)),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}

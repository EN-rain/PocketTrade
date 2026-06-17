import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../models/listing.dart';
import '../storage/secure_storage.dart';
import '../widgets/listing_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.apiUrl, required this.tokenStore});

  final String apiUrl;
  final TokenStore tokenStore;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _scrollCtrl = ScrollController();
  final List<Listing> _items = [];
  int _page = 1;
  bool _hasMore = true;
  bool _loadingFirst = true;
  bool _loadingMore = false;
  String? _error;

  late final ApiClient _api = ApiClient(
    baseUrl: widget.apiUrl,
    tokenStore: widget.tokenStore,
  );

  @override
  void initState() {
    super.initState();
    _loadFirst();
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadFirst() async {
    setState(() {
      _items.clear();
      _page = 1;
      _hasMore = true;
      _loadingFirst = true;
      _error = null;
    });
    await _loadMore();
    if (mounted) setState(() => _loadingFirst = false);
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final res = await _api.listListings(page: _page);
      final items = (res['items'] as List<dynamic>? ?? const [])
          .map((e) => Listing.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      final total = (res['total'] as num?)?.toInt() ?? 0;
      if (!mounted) return;
      setState(() {
        _items.addAll(items);
        _hasMore = _items.length < total;
        _page += 1;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Failed to load listings: $e');
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget body;
    if (_loadingFirst) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: _loadFirst, child: const Text('Retry')),
            ],
          ),
        ),
      );
    } else if (_items.isEmpty) {
      body = const Center(child: Text('No listings yet — be the first to sell!'));
    } else {
      body = RefreshIndicator(
        onRefresh: _loadFirst,
        child: GridView.builder(
          controller: _scrollCtrl
            ..addListener(() {
              if (_scrollCtrl.position.pixels >=
                  _scrollCtrl.position.maxScrollExtent - 200) {
                _loadMore();
              }
            }),
          padding: const EdgeInsets.all(8),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.7,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: _items.length + (_loadingMore ? 2 : 0),
          itemBuilder: (context, i) {
            if (i >= _items.length) {
              return const Center(child: CircularProgressIndicator());
            }
            final l = _items[i];
            return ListingCard(
              listing: l,
              onTap: () => context.push('/listing/${l.id}'),
            );
          },
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse phones'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadFirst),
        ],
      ),
      body: body,
    );
  }
}

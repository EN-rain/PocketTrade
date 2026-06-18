import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../models/listing.dart';
import '../storage/secure_storage.dart';
import '../widgets/listing_card.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, required this.apiUrl, required this.tokenStore});
  final String apiUrl;
  final TokenStore tokenStore;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _qCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _storageCtrl = TextEditingController();
  final _minPriceCtrl = TextEditingController();
  final _maxPriceCtrl = TextEditingController();
  String _sort = 'newest';
  String? _condition;
  List<Listing> _items = [];
  bool _loading = false;

  late final ApiClient _api = ApiClient(baseUrl: widget.apiUrl, tokenStore: widget.tokenStore);

  Future<void> _search() async {
    setState(() => _loading = true);
    final res = await _api.listListings(
      q: _qCtrl.text.trim(),
      brand: _brandCtrl.text.trim(),
      location: _locationCtrl.text.trim(),
      storage: _storageCtrl.text.trim(),
      minPrice: int.tryParse(_minPriceCtrl.text.trim()),
      maxPrice: int.tryParse(_maxPriceCtrl.text.trim()),
      condition: _condition,
      sort: _sort,
    );
    setState(() {
      _items = (res['items'] as List<dynamic>? ?? const [])
          .map((e) => Listing.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      _loading = false;
    });
  }

  @override
  void initState() {
    super.initState();
    _search();
  }

  @override
  void dispose() {
    _qCtrl.dispose();
    _brandCtrl.dispose();
    _locationCtrl.dispose();
    _storageCtrl.dispose();
    _minPriceCtrl.dispose();
    _maxPriceCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Search')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(controller: _qCtrl, decoration: const InputDecoration(labelText: 'Search', border: OutlineInputBorder())),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(child: TextField(controller: _brandCtrl, decoration: const InputDecoration(labelText: 'Brand', border: OutlineInputBorder()))),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: _locationCtrl, decoration: const InputDecoration(labelText: 'Location', border: OutlineInputBorder()))),
                ]),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(child: TextField(controller: _storageCtrl, decoration: const InputDecoration(labelText: 'Storage', border: OutlineInputBorder()))),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: _minPriceCtrl, decoration: const InputDecoration(labelText: 'Min price', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: _maxPriceCtrl, decoration: const InputDecoration(labelText: 'Max price', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                ]),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(child: DropdownButtonFormField<String>(
                    initialValue: _condition,
                    decoration: const InputDecoration(labelText: 'Condition', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('Any')),
                      DropdownMenuItem(value: 'brand_new', child: Text('Brand new')),
                      DropdownMenuItem(value: 'like_new', child: Text('Like new')),
                      DropdownMenuItem(value: 'excellent', child: Text('Excellent')),
                      DropdownMenuItem(value: 'good', child: Text('Good')),
                      DropdownMenuItem(value: 'fair', child: Text('Fair')),
                    ],
                    onChanged: (v) => _condition = v,
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: DropdownButtonFormField<String>(
                    initialValue: _sort,
                    decoration: const InputDecoration(labelText: 'Sort', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'newest', child: Text('Newest')),
                      DropdownMenuItem(value: 'oldest', child: Text('Oldest')),
                      DropdownMenuItem(value: 'price_asc', child: Text('Lowest price')),
                      DropdownMenuItem(value: 'price_desc', child: Text('Highest price')),
                      DropdownMenuItem(value: 'relevant', child: Text('Most relevant')),
                    ],
                    onChanged: (v) => _sort = v ?? 'newest',
                  )),
                ]),
                const SizedBox(height: 8),
                FilledButton.icon(onPressed: _search, icon: const Icon(Icons.search), label: const Text('Search')),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : GridView.builder(
                    padding: const EdgeInsets.all(8),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 0.7, crossAxisSpacing: 8, mainAxisSpacing: 8),
                    itemCount: _items.length,
                    itemBuilder: (_, i) => ListingCard(listing: _items[i], onTap: () => context.push('/listing/${_items[i].id}')),
                  ),
          ),
        ],
      ),
    );
  }
}

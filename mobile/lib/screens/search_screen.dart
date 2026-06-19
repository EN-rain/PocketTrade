import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../models/listing.dart';
import '../storage/secure_storage.dart';
import '../widgets/listing_card.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen(
      {super.key, required this.apiUrl, required this.tokenStore});
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
  String _condition = 'any';
  List<Listing> _items = [];
  bool _loading = false;
  String? _error;

  late final ApiClient _api =
      ApiClient(baseUrl: widget.apiUrl, tokenStore: widget.tokenStore);

  static const _conditions = [
    _Option('any', 'Any condition'),
    _Option('brand_new', 'Brand new'),
    _Option('like_new', 'Like new'),
    _Option('excellent', 'Excellent'),
    _Option('good', 'Good'),
    _Option('fair', 'Fair'),
  ];

  static const _sorts = [
    _Option('newest', 'Newest first'),
    _Option('relevant', 'Most relevant'),
    _Option('price_asc', 'Lowest price'),
    _Option('price_desc', 'Highest price'),
    _Option('oldest', 'Oldest first'),
  ];

  Future<void> _search() async {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.listListings(
        q: _qCtrl.text.trim(),
        brand: _brandCtrl.text.trim(),
        location: _locationCtrl.text.trim(),
        storage: _storageCtrl.text.trim(),
        minPrice: int.tryParse(_minPriceCtrl.text.trim()),
        maxPrice: int.tryParse(_maxPriceCtrl.text.trim()),
        condition: _condition == 'any' ? null : _condition,
        sort: _sort,
        limit: 12,
      );
      if (!mounted) return;
      setState(() {
        _items = (res['items'] as List<dynamic>? ?? const [])
            .map((e) => Listing.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      });
    } catch (e) {
      if (mounted) {
        setState(() =>
            _error = 'Search failed. Check your connection and try again.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _clearFilters() {
    setState(() {
      _qCtrl.clear();
      _brandCtrl.clear();
      _locationCtrl.clear();
      _storageCtrl.clear();
      _minPriceCtrl.clear();
      _maxPriceCtrl.clear();
      _condition = 'any';
      _sort = 'newest';
    });
    _search();
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
      endDrawer: Drawer(child: SafeArea(child: _filterDrawer(context))),
      appBar: AppBar(
        title: const Text('Search'),
        actions: [
          Builder(
            builder: (context) => IconButton(
              tooltip: 'Filters',
              onPressed: () => Scaffold.of(context).openEndDrawer(),
              icon: const Icon(Icons.tune),
            ),
          ),
          IconButton(
            tooltip: 'Clear filters',
            onPressed: _loading ? null : _clearFilters,
            icon: const Icon(Icons.filter_alt_off_outlined),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _search,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              sliver: SliverToBoxAdapter(child: _searchBar()),
            ),
            if (_loading)
              const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              SliverFillRemaining(
                  child:
                      Center(child: Text(_error!, textAlign: TextAlign.center)))
            else if (_items.isEmpty)
              const SliverFillRemaining(
                child: Center(child: Text('No phones matched those filters.')),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                sliver: SliverLayoutBuilder(
                  builder: (context, constraints) {
                    final width = constraints.crossAxisExtent;
                    final columns = width >= 680 ? 3 : 2;
                    return SliverGrid(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        childAspectRatio: 0.68,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => ListingCard(
                          listing: _items[i],
                          onTap: () => context.push('/listing/${_items[i].id}'),
                        ),
                        childCount: _items.length,
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _searchBar() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: _queryField()),
            const SizedBox(width: 8),
            Builder(
              builder: (context) => IconButton.filledTonal(
                tooltip: 'Filters',
                onPressed: () => Scaffold.of(context).openEndDrawer(),
                icon: const Icon(Icons.tune),
              ),
            ),
          ],
        ),
        if (_activeFilterCount > 0) ...[
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: InputChip(
              avatar: const Icon(Icons.filter_alt, size: 18),
              label: Text(
                  '$_activeFilterCount filter${_activeFilterCount == 1 ? '' : 's'} active'),
              onDeleted: _loading ? null : _clearFilters,
            ),
          ),
        ],
      ],
    );
  }

  Widget _filterDrawer(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Filters',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
            ),
            IconButton(
              tooltip: 'Close',
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _filterFields(),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _loading
              ? null
              : () {
                  Navigator.of(context).maybePop();
                  _search();
                },
          icon: const Icon(Icons.search),
          label: const Text('Apply filters'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _loading
              ? null
              : () {
                  Navigator.of(context).maybePop();
                  _clearFilters();
                },
          icon: const Icon(Icons.filter_alt_off_outlined),
          label: const Text('Clear all'),
        ),
      ],
    );
  }

  Widget _filterFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _field(_brandCtrl, 'Brand', Icons.phone_iphone),
        const SizedBox(height: 12),
        _field(_locationCtrl, 'Location', Icons.place_outlined),
        const SizedBox(height: 10),
        _field(_storageCtrl, 'Storage', Icons.sd_storage_outlined),
        const SizedBox(height: 10),
        _field(_minPriceCtrl, 'Min price', Icons.payments_outlined,
            number: true),
        const SizedBox(height: 10),
        _field(_maxPriceCtrl, 'Max price', Icons.price_change_outlined,
            number: true),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _condition,
          decoration: const InputDecoration(
              labelText: 'Condition',
              prefixIcon: Icon(Icons.verified_outlined)),
          items: _conditions
              .map(
                  (o) => DropdownMenuItem(value: o.value, child: Text(o.label)))
              .toList(),
          onChanged: (v) => setState(() => _condition = v ?? 'any'),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _sort,
          decoration: const InputDecoration(
              labelText: 'Sort', prefixIcon: Icon(Icons.sort)),
          items: _sorts
              .map(
                  (o) => DropdownMenuItem(value: o.value, child: Text(o.label)))
              .toList(),
          onChanged: (v) => setState(() => _sort = v ?? 'newest'),
        ),
      ],
    );
  }

  Widget _queryField() {
    return TextField(
      controller: _qCtrl,
      decoration: InputDecoration(
        labelText: 'Search phones',
        hintText: 'iPhone 14, Pixel, 128GB',
        prefixIcon: const Icon(Icons.search),
        suffixIcon: _qCtrl.text.isEmpty
            ? null
            : IconButton(
                tooltip: 'Clear search',
                onPressed: () {
                  setState(_qCtrl.clear);
                  _search();
                },
                icon: const Icon(Icons.close),
              ),
      ),
      textInputAction: TextInputAction.search,
      onChanged: (_) => setState(() {}),
      onSubmitted: (_) => _search(),
    );
  }

  Widget _field(TextEditingController controller, String label, IconData icon,
      {bool number = false}) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
      keyboardType: number ? TextInputType.number : TextInputType.text,
      textInputAction: TextInputAction.next,
      onChanged: (_) => setState(() {}),
    );
  }

  int get _activeFilterCount {
    var count = 0;
    if (_brandCtrl.text.trim().isNotEmpty) count++;
    if (_locationCtrl.text.trim().isNotEmpty) count++;
    if (_storageCtrl.text.trim().isNotEmpty) count++;
    if (_minPriceCtrl.text.trim().isNotEmpty) count++;
    if (_maxPriceCtrl.text.trim().isNotEmpty) count++;
    if (_condition != 'any') count++;
    if (_sort != 'newest') count++;
    return count;
  }
}

class _Option {
  const _Option(this.value, this.label);
  final String value;
  final String label;
}

class ListingImage {
  ListingImage({required this.url, required this.displayOrder});
  final String url;
  final int displayOrder;

  factory ListingImage.fromJson(Map<String, dynamic> json) => ListingImage(
        url: (json['imageUrl'] ?? json['url']) as String? ?? '',
        displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      );
}

class ListingSeller {
  ListingSeller({required this.id, this.displayName});
  final String id;
  final String? displayName;

  factory ListingSeller.fromJson(Map<String, dynamic> json) => ListingSeller(
        id: json['id']?.toString() ?? '',
        displayName: json['displayName'] as String?,
      );
}

class Listing {
  Listing({
    required this.id,
    required this.brand,
    required this.model,
    required this.price,
    required this.condition,
    required this.storage,
    required this.color,
    required this.location,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.images,
    this.seller,
  });

  final String id;
  final String brand;
  final String model;
  final double price;
  final String condition;
  final String storage;
  final String color;
  final String location;
  final String description;
  final String status;
  final DateTime createdAt;
  final List<ListingImage> images;
  final ListingSeller? seller;

  String? get primaryImageUrl =>
      images.isNotEmpty ? images.first.url : null;

  factory Listing.fromJson(Map<String, dynamic> json) {
    final images = (json['images'] as List<dynamic>? ?? const [])
        .map((e) => ListingImage.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    ListingSeller? seller;
    final s = json['seller'];
    if (s is Map) seller = ListingSeller.fromJson(Map<String, dynamic>.from(s));

    return Listing(
      id: json['id']?.toString() ?? '',
      brand: json['brand'] as String? ?? '',
      model: json['model'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      condition: json['condition'] as String? ?? '',
      storage: (json['storage'] as String?) ?? '',
      color: (json['colour'] ?? json['color']) as String? ?? '',
      location: json['location'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      images: images,
      seller: seller,
    );
  }
}

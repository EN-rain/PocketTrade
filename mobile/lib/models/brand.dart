class Brand {
  Brand({required this.id, required this.name, required this.slug});
  final int id;
  final String name;
  final String slug;

  factory Brand.fromJson(Map<String, dynamic> json) => Brand(
        id: (json['id'] as num?)?.toInt() ?? 0,
        name: json['name'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
      );
}

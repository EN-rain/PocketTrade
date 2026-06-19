class AppUser {
  AppUser({
    required this.id,
    required this.email,
    required this.role,
    this.displayName,
    this.location,
    this.profileImage,
  });

  final String id;
  final String email;
  final String role;
  final String? displayName;
  final String? location;
  final String? profileImage;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id']?.toString() ?? '',
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? 'user',
        displayName: json['displayName'] as String?,
        location: json['location'] as String?,
        profileImage: json['profileImage'] as String?,
      );
}

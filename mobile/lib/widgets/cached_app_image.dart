import 'package:flutter/material.dart';

class PocketTradeImageCache {
  PocketTradeImageCache._();

  static ImageProvider provider(String url) {
    final normalizedUrl = url.trim();
    return NetworkImage(optimizedUrl(normalizedUrl));
  }

  static String optimizedUrl(
    String url, {
    int? width,
    int? height,
    String crop = 'fill',
  }) {
    if (!url.contains('res.cloudinary.com') || !url.contains('/upload/')) {
      return url;
    }
    final transforms = [
      if (width != null) 'w_$width',
      if (height != null) 'h_$height',
      'c_$crop',
      'q_auto',
      'f_auto',
    ].join(',');
    return url.replaceFirst('/upload/', '/upload/$transforms/');
  }
}

class CachedAppImage extends StatelessWidget {
  const CachedAppImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.placeholderIcon = Icons.phone_iphone,
    this.errorIcon = Icons.broken_image,
    this.memCacheWidth,
    this.memCacheHeight,
    this.maxDiskCacheWidth,
    this.maxDiskCacheHeight,
  });

  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final IconData placeholderIcon;
  final IconData errorIcon;
  final int? memCacheWidth;
  final int? memCacheHeight;
  final int? maxDiskCacheWidth;
  final int? maxDiskCacheHeight;

  @override
  Widget build(BuildContext context) {
    final normalizedUrl = imageUrl.trim();
    if (normalizedUrl.isEmpty) {
      return ImageFallback(icon: placeholderIcon, width: width, height: height);
    }

    final optimizedUrl = PocketTradeImageCache.optimizedUrl(
      normalizedUrl,
      width: maxDiskCacheWidth ?? memCacheWidth,
      height: maxDiskCacheHeight ?? memCacheHeight,
    );

    return Image.network(
      optimizedUrl,
      fit: fit,
      width: width,
      height: height,
      cacheWidth: memCacheWidth ?? maxDiskCacheWidth,
      cacheHeight: memCacheHeight ?? maxDiskCacheHeight,
      loadingBuilder: (_, child, loadingProgress) {
        if (loadingProgress == null) return child;
        final total = loadingProgress.expectedTotalBytes;
        return ImageFallback(
          icon: placeholderIcon,
          width: width,
          height: height,
          progress: total == null
              ? null
              : loadingProgress.cumulativeBytesLoaded / total,
        );
      },
      errorBuilder: (_, __, ___) =>
          ImageFallback(icon: errorIcon, width: width, height: height),
    );
  }
}

class ImageFallback extends StatelessWidget {
  const ImageFallback({
    super.key,
    this.icon = Icons.phone_iphone,
    this.width,
    this.height,
    this.progress,
  });

  final IconData icon;
  final double? width;
  final double? height;
  final double? progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: width,
      height: height,
      color: theme.colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: progress == null
          ? Icon(icon, size: 32, color: theme.colorScheme.onSurfaceVariant)
          : SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                value: progress == 0 ? null : progress,
              ),
            ),
    );
  }
}

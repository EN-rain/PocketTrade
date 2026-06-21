const requiredProductionKeys = [
  'DATABASE_URL',
  'CORS_ORIGINS',
  'API_PUBLIC_URL',
  'MAILJET_API_KEY',
  'MAILJET_API_SECRET',
  'MAILJET_FROM_EMAIL',
] as const;

export function validateEnvironment(config: Record<string, unknown>) {
  const environment = String(config.NODE_ENV ?? 'development').trim().toLowerCase();
  if (!['development', 'test', 'production'].includes(environment)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const jwtSecret = String(config.JWT_SECRET ?? '').trim();
  if (environment !== 'test' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters');
  }

  if (environment === 'production') {
    const missing: string[] = requiredProductionKeys.filter((key) => !String(config[key] ?? '').trim());
    const hasCloudinary = Boolean(
      String(config.CLOUDINARY_URL ?? '').trim() ||
        (String(config.CLOUDINARY_CLOUD_NAME ?? '').trim() &&
          String(config.CLOUDINARY_API_KEY ?? '').trim() &&
          String(config.CLOUDINARY_API_SECRET ?? '').trim()),
    );
    if (!hasCloudinary) missing.push('CLOUDINARY_URL or all three CLOUDINARY_* credentials');
    if (missing.length > 0) {
      throw new Error(`Missing required production configuration: ${[...new Set(missing)].join(', ')}`);
    }

    const publicUrl = String(config.API_PUBLIC_URL);
    try {
      if (new URL(publicUrl).protocol !== 'https:') throw new Error();
    } catch {
      throw new Error('API_PUBLIC_URL must be a valid HTTPS URL in production');
    }

    const corsOrigins = String(config.CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (corsOrigins.some((origin) => origin === '*' || !origin.startsWith('https://'))) {
      throw new Error('CORS_ORIGINS must contain explicit HTTPS origins in production');
    }
  }

  return { ...config, NODE_ENV: environment };
}

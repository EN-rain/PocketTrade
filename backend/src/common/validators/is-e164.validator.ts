import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a string is in E.164 format:
 * - Starts with +
 * - Followed by 7-15 digits
 * Examples:
 *   Valid:   +14155552671, +447911123456, +8613800138000
 *   Invalid: 4155552671 (no +), +0123456789 (leading 0 after +), +abc (non-digits)
 */
export function IsE164(validationOptions?: ValidationOptions) {
  return function (target: object, propertyKey: string | symbol): void {
    registerDecorator({
      name: 'isE164',
      target: target.constructor,
      propertyName: propertyKey as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || value.length === 0) {
            return false;
          }
          if (!value.startsWith('+')) {
            return false;
          }
          const digitsOnly = value.slice(1);
          if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            return false;
          }
          return /^\d+$/.test(digitsOnly);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid E.164 phone number (e.g. +14155552671)`;
        },
      },
    });
  };
}

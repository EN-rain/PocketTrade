# Changelog

## 1.0.6+7

- Return and display Mailjet delivery trace ids for OTP requests.
- Update OTP helper text to 10 minutes.

## 1.0.5+6

- Require Mailjet recipient message ids before reporting OTP email success.
- Log Mailjet OTP acceptance receipts for delivery debugging.

## 1.0.4+5

- Allow OTP resend after 1 minute.
- Make verification codes expire after 10 minutes.

## 1.0.3+4

- Treat Mailjet per-message failures as OTP delivery failures.
- Prevent failed Mailjet sends from creating a stuck active OTP.

## 1.0.2+3

- Allow a fresh OTP request immediately when email delivery fails.
- Keep the 30-minute single-code window only after Mailjet accepts delivery.

## 1.0.1+2

- Use Mailjet for all email verification and password-reset codes.
- Keep one active verification code per email for 30 minutes.
- Refresh the authentication screen with the PocketTrade brand mark.

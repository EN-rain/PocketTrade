# Admin Guide

The admin panel is a Vite React app. Set `VITE_API_URL` to the backend URL and log in at `/login`.

## Bootstrap Account

`backend/prisma/seed.ts` creates or updates an admin user using:

- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`

Passwords are stored as bcrypt hashes. If the password is missing, a generated one is printed during seed.

## Admin Capabilities

- Dashboard metrics and recent activity.
- Listing moderation: list, approve, reject, edit, remove, restore.
- User management: list, inspect, suspend with reason, restore.
- Reports: review reported listings/users/conversations and resolve or dismiss.
- Search analytics: top terms and zero-result searches.
- Activity log: paginated moderation actions.

## Security Checklist

- Use a unique `JWT_SECRET` per environment.
- Store admin password in a password manager.
- Keep `.env` files out of git.
- Rotate any secret that was ever committed or pasted into shared logs.

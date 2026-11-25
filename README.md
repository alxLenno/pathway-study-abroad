# Pathway — Study Abroad

A responsive React website with destination browsing, a study-plan form, testimonials with photos, contact/map information, WhatsApp group access, and an admin content editor.

Live site: https://pathway-study-abroad.netlify.app

## Development

```sh
npm ci
npm run dev
```

The Vite preview uses a local content store. It is a development environment, not the hosted admin authentication system.

## Production

The project includes Netlify Functions and Netlify Database migrations. Build with `npm run build:netlify`. See [Netlify setup](NETLIFY_SETUP.md) for deployment and admin configuration, and [email setup](EMAIL_SETUP.md) for Resend requirements.

Server settings:

- `ADMIN_PASSWORD`: a unique password of at least 16 characters for the Netlify admin editor.
- `RESEND_API_KEY`: private Resend sending key.
- `EMAIL_FROM`: verified Resend sender address.
- `STUDY_PLAN_TO`: team notification recipient.

Configure secrets in the hosting dashboard. Do not put them in source files or browser-prefixed variables. Study-plan downloads remain available before email sending is configured.

## Validation

```sh
npm run build:netlify
node --test tests/*.test.mjs
```

The `worker/`, `drizzle/`, and `.openai/` files also preserve support for the original Sites hosting environment.

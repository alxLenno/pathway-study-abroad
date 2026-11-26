# Deploy Pathway to Netlify

The repository is configured for a React frontend, Netlify Functions, and Netlify Database. Use the full project; dropping only dist into Netlify will omit the admin and email services.

## Account and deployment

1. Create your account at https://app.netlify.com/signup.
2. From this project directory, run `npx netlify login` and authorize the CLI in your browser.
3. Run `npx netlify init` to link a new project. If using a Git repository, set the build command to `npm run build:netlify` and publish directory to `dist`. These values are already in netlify.toml.
4. Add the server-side environment variables below in Netlify's project settings. Do not commit keys or passwords.
5. Run `npx netlify deploy --build --prod`. Netlify Database must be provisioned and the migrations applied before testing admin saves; verify Data & Storage > Database after the first deploy. The @netlify/database dependency enables automatic provisioning on supported build workflows.
6. Test /api/session, /api/content, and /admin on the deployed URL. Check that admin edits survive reloads, and send a consented test study plan once Resend is ready.

## Server environment variables

- ADMIN_PASSWORD: a unique password of at least 16 characters. Admin sessions use a signed HttpOnly cookie and expire after 8 hours. Changing this password invalidates existing sessions.
- RESEND_API_KEY: your private sending key; mark it as a secret.
- EMAIL_FROM: an address on your verified Resend domain (e.g. Admissions <admissions@yourdomain.com>).
- STUDY_PLAN_TO: lennoxkahati@gmail.com.

Netlify sets NETLIFY_DB_URL for its managed database. Do not expose any of these with VITE_ prefixes. Environment changes require redeployment. Email remains disabled until sender configuration is complete.

## Content and access

The initial database migration creates the content and rate-limit tables. A separate seed migration preserves locally saved website content when present. Future content changes are saved through /admin. The Netlify admin uses your configured password; ChatGPT sign-in is retained only on the existing Sites hosting.

Netlify production websites are normally publicly accessible. This is separate from the owner-private Sites version. This preparation has not changed the current site's sharing settings or deployed anything to Netlify.

## Checks performed locally

`npm run build:netlify`
`node --test tests/*.test.mjs`

Database provisioning, SQL migration execution against hosted Postgres, and real email delivery require a connected account and remain to be verified after deployment.

## Admissions dashboard

New student submissions are saved in the `study_plans` table and shown on the default Study plans tab at `/admin`. Admins can search by name, email, or destination, filter and update enquiry status, browse pages, and download individual plans as PDFs. Student contact details are never exposed by the anonymous API. The new migration adds the table without changing existing website content.

Email is paused in the public flow. The earlier Resend integration remains available for future work, but the legacy endpoint is disabled unless ENABLE_PLAN_EMAILS is explicitly set to true. The current form submits only to the dashboard and sends no emails.

Local preview now uses `.local-preview.db` (ignored by Git) and applies the SQLite migration files. Existing locally saved website content is imported once. Hosted storage remains Netlify Postgres.

## Testimonials and moderated FAQs

The admin now has dedicated Testimonials and Questions & FAQs sections. Testimonials are managed in a table; their entry form closes after successful publishing. Questions submitted through the public FAQ form are private by default. An admin must write an answer and explicitly publish it before it appears publicly. Contact details are excluded from the public FAQ endpoint. Public question wording can be edited to remove personal information. Unpublishing removes a question from the FAQs, and deleting removes it from both management and public views (soft deletion in storage).

The existing four editorial FAQs are seeded into the questions table so they can also be edited, unpublished, or removed. No email is sent when questions are submitted or answered.

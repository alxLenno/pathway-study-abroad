# Study plan email setup

The site uses Resend to send two separate emails: a student copy and a team notification. The recipient for team notifications is configured server-side as STUDY_PLAN_TO.

1. Create a free account at https://resend.com/signup.
2. Add a domain you own in Resend, add its required DNS records, and wait for verification. Gmail can receive notifications but cannot be used as your verified sender domain.
3. Create a sending API key scoped to your verified domain.
4. Set RESEND_API_KEY as a secret and EMAIL_FROM to a verified sender (e.g. Admissions <admissions@yourdomain.com>) in the Site's server runtime settings. STUDY_PLAN_TO is already configured.
5. Deploy a saved version to apply the runtime settings.
6. Send a consented test plan and check both inboxes and Resend's delivery log. API acceptance is not a guarantee of inbox delivery.

Until both sender settings exist, the form offers downloads and does not claim to send email. Keys are never sent to browsers. No real email is sent in automated tests.

Sending protection: same-origin requests, field allowlists, honeypot, email consent, provider idempotency, and database-backed limits of 45 unique plans per rolling day, 5 per IP per hour, and 3 per email per day. This keeps the two-message flow below the provider's 100/day free limit, leaving a margin for other traffic. Revisit limits if the sending plan changes. Add an appropriate privacy policy before collecting public enquiries.

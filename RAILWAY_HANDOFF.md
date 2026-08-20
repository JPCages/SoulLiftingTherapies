# Soul Lifting Therapies — Railway handover

This repository contains the current customer app and Emma's content-management dashboard.

## Current app

- Mobile-first customer homepage and treatment catalogue
- Customer wellbeing/rewards preview
- Protected Emma admin dashboard
- Editable homepage content, business details, locations, categories and treatments
- Persistent content API
- No live SumUp, Resend or Fresha credentials are included

## Important hosting note

The test deployment currently stores editable content in Cloudflare D1. Railway uses PostgreSQL, so replace the implementation in `app/api/content/route.ts` with the PostgreSQL/Prisma content model before importing live content. The UI sends and receives a single `SiteContent` JSON document, so the screen components do not need rewriting.

## Railway setup checklist

1. Create a GitHub repository and upload this source folder.
2. Create a Railway project from that GitHub repository.
3. Add a Railway PostgreSQL service.
4. Set `DATABASE_URL` from Railway PostgreSQL.
5. Replace the D1 content adapter with Prisma/PostgreSQL.
6. Replace ChatGPT Sites authentication with the chosen email-code provider.
7. Set Emma's admin email through an environment variable rather than changing code.
8. Add SumUp and Resend credentials only through Railway environment variables.
9. Run the production build and check `/`, `/services`, `/login`, `/portal`, `/account` and `/book`.
10. Connect the final domain only after the booking and payment tests pass.

## Environment variables to create

```text
DATABASE_URL=
ADMIN_EMAIL=emmacerklewicz@yahoo.co.uk
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=soulliftingtherapies@gmail.com
SUMUP_API_KEY=
SUMUP_MERCHANT_CODE=
NEXT_PUBLIC_SITE_URL=
```

Never commit real secret values to GitHub.

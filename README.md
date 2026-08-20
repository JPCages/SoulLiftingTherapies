# Soul Lifting Therapies

Mobile-first treatment catalogue, customer portal preview and Emma-only content dashboard.

## Railway deployment

1. Add a PostgreSQL service in Railway.
2. Add the variables from `.env.example` to the app service.
3. Railway automatically runs `npm run build` and `npm run start`.
4. Open `/login`, choose **I'm Emma**, and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

The content table is created automatically on first use. Do not commit real secret values.

## Local development

```bash
npm install
npm run dev
```

Without `DATABASE_URL`, public pages use the confirmed default treatment content. Saving admin changes requires PostgreSQL.

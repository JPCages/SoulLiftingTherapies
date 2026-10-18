// The site's public address, from NEXT_PUBLIC_SITE_URL. Set by hand in Railway,
// so it may arrive without a scheme or empty; a bad value must never break the
// build, so it falls back to undefined.
export function siteUrl(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return undefined;
  }
}

export const DEFAULT_TITLE = 'Soul Lifting Therapies | Massage & Facial Specialist, Horncastle & Woodhall Spa';
export const DEFAULT_DESCRIPTION =
  'Massage, facials, advanced skin treatments and Lycon waxing with Emma at Soul Lifting Therapies, Horncastle and Woodhall Spa, Lincolnshire.';

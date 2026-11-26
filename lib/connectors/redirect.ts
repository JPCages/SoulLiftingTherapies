import {siteUrl} from '../seo';

// The site's public address. Behind Railway's proxy request.url carries the
// internal host, so redirects must use the configured address (or the forwarded one).
export function publicOrigin(request:Request):string{
  const set=siteUrl()?.origin;
  if(set)return set;
  const h=request.headers;
  const host=h.get('x-forwarded-host')??h.get('host');
  if(host)return `${h.get('x-forwarded-proto')??'https'}://${host}`;
  return new URL(request.url).origin;
}

// The address each provider sends the business back to after they approve access.
// It must match the address registered in that provider's developer app exactly.
export function callbackUrl(provider:string,request:Request):string{
  return `${publicOrigin(request)}/api/connections/callback/${provider}`;
}

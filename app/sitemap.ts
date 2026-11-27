import type {MetadataRoute} from 'next';
import {siteUrl} from '@/lib/seo';
import {readSiteContent} from '@/lib/db';

// Read at request time: whether vouchers are on is Emma's setting, not a build-time fact.
export const dynamic='force-dynamic';

// The public pages worth finding in search. Sign-in, account and admin are left out.
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=siteUrl();
  if(!base)return [];
  const vouchers=await readSiteContent().then(c=>c.vouchersEnabled===true).catch(()=>false);
  return [
    {path:'/',priority:1},
    {path:'/services',priority:0.9},
    {path:'/book',priority:0.7},
    ...(vouchers?[{path:'/vouchers',priority:0.6}]:[]),
  ].map(p=>({url:new URL(p.path,base).toString(),changeFrequency:'monthly' as const,priority:p.priority}));
}

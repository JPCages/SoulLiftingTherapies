import type {MetadataRoute} from 'next';
import {siteUrl} from '@/lib/seo';

// The public pages worth finding in search. Sign-in, account and admin are left out.
export default function sitemap():MetadataRoute.Sitemap{
  const base=siteUrl();
  if(!base)return [];
  return [
    {path:'/',priority:1},
    {path:'/services',priority:0.9},
    {path:'/book',priority:0.7},
  ].map(p=>({url:new URL(p.path,base).toString(),changeFrequency:'monthly' as const,priority:p.priority}));
}

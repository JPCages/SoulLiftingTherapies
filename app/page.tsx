import type {Metadata} from 'next';
import {Render} from '@puckeditor/core/rsc';
import {readSiteContent} from '@/lib/db';
import {config,type SiteMeta} from '@/lib/puck/config';
import {homepageData} from '@/lib/puck/migrate';
import {DEFAULT_TITLE,DEFAULT_DESCRIPTION} from '@/lib/seo';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';

// Rendered on the server so the homepage arrives complete — Emma's words are in
// the HTML a search engine sees, not fetched in afterwards. Everything between
// the header and the footer is her layout from the visual editor; the chrome is
// the same on every page and is not hers to drag around.
export const dynamic='force-dynamic';

// Title and description come from the portal (Business details, Search & sharing).
export async function generateMetadata():Promise<Metadata>{
  const c=await readSiteContent();
  const title=(c.seoTitle||'').trim()||DEFAULT_TITLE;
  const description=(c.seoDescription||'').trim()||DEFAULT_DESCRIPTION;
  return {
    title:{absolute:title},
    description,
    alternates:{canonical:'/'},
    openGraph:{title,description,url:'/'},
  };
}

export default async function Home(){
  const content=await readSiteContent();
  const meta:SiteMeta={content};
  return <div className="site">
    <SiteHeader content={content}/>
    <Render config={config} data={homepageData(content)} metadata={meta as unknown as Record<string,unknown>}/>
    <SiteFooter content={content}/>
  </div>;
}

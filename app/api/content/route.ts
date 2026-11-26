import {type SiteContent,publicContent} from '@/lib/site-content';
import {readSiteContent,writeSiteContent} from '@/lib/db';
import {isAdmin} from '@/lib/auth';

// Public pages get the published view (hidden treatments left out). The portal
// asks for ?all=1 and, being signed in as Emma, gets everything.
export async function GET(request:Request){
  const all=new URL(request.url).searchParams.get('all')==='1'&&await isAdmin();
  const content=await readSiteContent();
  return Response.json(all?content:publicContent(content));
}

export async function PUT(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  const content=await request.json() as SiteContent;
  if(!content.businessName||!Array.isArray(content.categories))return Response.json({error:'Invalid content'},{status:400});
  await writeSiteContent(content);
  return Response.json({ok:true});
}

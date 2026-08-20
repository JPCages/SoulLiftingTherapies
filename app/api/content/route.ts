import {type SiteContent} from '@/lib/site-content';
import {readSiteContent,writeSiteContent} from '@/lib/db';
import {isAdmin} from '@/lib/auth';

export async function GET(){
  return Response.json(await readSiteContent());
}

export async function PUT(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  const content=await request.json() as SiteContent;
  if(!content.businessName||!Array.isArray(content.categories))return Response.json({error:'Invalid content'},{status:400});
  await writeSiteContent(content);
  return Response.json({ok:true});
}

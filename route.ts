import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { defaultSiteContent, type SiteContent } from '@/lib/site-content';

const ADMIN_EMAIL='emmacerklewicz@yahoo.co.uk';
async function ensureTable(){await env.DB.prepare('CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY, content TEXT NOT NULL, updated_at TEXT NOT NULL)').run()}

export async function GET(){
  await ensureTable();
  const row=await env.DB.prepare('SELECT content FROM site_content WHERE id = 1').first<{content:string}>();
  return Response.json(row?JSON.parse(row.content):defaultSiteContent);
}

export async function PUT(request:Request){
  const user=await getChatGPTUser();
  if(!user||user.email.toLowerCase()!==ADMIN_EMAIL)return Response.json({error:'Admin sign-in required'},{status:401});
  const content=await request.json() as SiteContent;
  if(!content.businessName||!Array.isArray(content.categories))return Response.json({error:'Invalid content'},{status:400});
  await ensureTable();
  await env.DB.prepare('INSERT INTO site_content (id,content,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at').bind(JSON.stringify(content),new Date().toISOString()).run();
  return Response.json({ok:true});
}

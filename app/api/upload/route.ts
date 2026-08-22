import {randomUUID} from 'node:crypto';
import {isAdmin} from '@/lib/auth';
import {saveImage} from '@/lib/db';

// Admin-only image upload. The client sends a compressed data URL; we store the
// bytes in Postgres and return a stable URL that public pages can reference.
export async function POST(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Image storage needs a database. Add DATABASE_URL in Railway.'},{status:503});
  let body:{dataUrl?:string};
  try{body=await request.json() as {dataUrl?:string}}catch{return Response.json({error:'Invalid request'},{status:400})}
  const dataUrl=body.dataUrl??'';
  const match=/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if(!match)return Response.json({error:'Expected a base64 image data URL'},{status:400});
  const mime=match[1]==='image/jpg'?'image/jpeg':match[1];
  const data=Buffer.from(match[2],'base64');
  if(data.length>5*1024*1024)return Response.json({error:'Image is too large (max 5 MB after compression)'},{status:413});
  const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/gif'?'gif':'jpg';
  const id=`${randomUUID()}.${ext}`;
  await saveImage(id,mime,data);
  return Response.json({url:`/api/image/${id}`});
}

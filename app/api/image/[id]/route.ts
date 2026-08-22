import {readImage} from '@/lib/db';

// Serves an uploaded image by id with long-lived caching.
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[A-Za-z0-9.-]+$/.test(id))return new Response('Not found',{status:404});
  const img=await readImage(id);
  if(!img)return new Response('Not found',{status:404});
  return new Response(new Uint8Array(img.data),{headers:{'Content-Type':img.mime,'Cache-Control':'public, max-age=31536000, immutable'}});
}

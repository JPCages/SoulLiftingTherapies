'use client';
import {useRef} from 'react';

// Compress an image in the browser so uploads stay small and fast.
export function compress(file:File,maxDim=1400,quality=0.72):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Could not read the file'));
  reader.onload=()=>{
   const img=new Image();
   img.onerror=()=>reject(new Error('That file is not a valid image'));
   img.onload=()=>{
    const scale=Math.min(1,maxDim/Math.max(img.width,img.height));
    const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');
    if(!ctx){reject(new Error('Image processing is unavailable'));return}
    ctx.drawImage(img,0,0,w,h);
    resolve(canvas.toDataURL('image/jpeg',quality));
   };
   img.src=reader.result as string;
  };
  reader.readAsDataURL(file);
 });
}

// Compress, upload and return the stored image URL. Throws with a readable message.
export async function uploadImage(file:File):Promise<string>{
 const dataUrl=await compress(file);
 const r=await fetch('/api/upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dataUrl})});
 const out=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(out.error||'Image upload failed');
 return out.url as string;
}

export function ImageControl({image,label,busy,onFile,onClear,wide,pos,onPos}:{image?:string;label:string;busy:boolean;onFile:(f:File|undefined)=>void;onClear:()=>void;wide?:boolean;pos?:number;onPos?:(n:number)=>void}){
 const input=useRef<HTMLInputElement>(null);
 const p=pos??50;
 return <div className="img-control">
  <div className={wide?'img-thumb wide':'img-thumb'} style={image?{backgroundImage:`url('${image}')`,backgroundPosition:`center ${p}%`}:undefined}>{!image&&<span>No image</span>}</div>
  <div className="img-actions">
   <input ref={input} type="file" accept="image/*" hidden onChange={e=>{onFile(e.target.files?.[0]);e.target.value=''}}/>
   <button type="button" className="img-btn" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Uploading…':image?`Change ${label}`:`Upload ${label}`}</button>
   {image&&<button type="button" className="img-btn ghost" disabled={busy} onClick={onClear}>Remove</button>}
   {image&&onPos&&<div className="img-pos"><label>Position</label><input type="range" min={0} max={100} value={p} onChange={e=>onPos(Number(e.target.value))}/></div>}
  </div>
 </div>;
}

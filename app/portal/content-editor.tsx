'use client';
import {useEffect,useRef,useState} from 'react';
import {defaultSiteContent,type SiteContent} from '@/lib/site-content';
import type {Category,Service} from '@/lib/sandbox-data';

const blankService:Service={name:'New treatment',price:'£0',duration:'30 minutes',description:'',note:''};

// Compress an image in the browser so uploads stay small and fast.
function compress(file:File,maxDim=1200,quality=0.72):Promise<string>{
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

function ImageControl({image,label,busy,onFile,onClear}:{image?:string;label:string;busy:boolean;onFile:(f:File|undefined)=>void;onClear:()=>void}){
 const input=useRef<HTMLInputElement>(null);
 return <div className="img-control">
  <div className="img-thumb" style={image?{backgroundImage:`url('${image}')`}:undefined}>{!image&&<span>No image</span>}</div>
  <div className="img-actions">
   <input ref={input} type="file" accept="image/*" hidden onChange={e=>{onFile(e.target.files?.[0]);e.target.value=''}}/>
   <button type="button" className="img-btn" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Uploading…':image?`Change ${label}`:`Upload ${label}`}</button>
   {image&&<button type="button" className="img-btn ghost" disabled={busy} onClick={onClear}>Remove</button>}
  </div>
 </div>;
}

export default function ContentEditor(){
 const [content,setContent]=useState<SiteContent>(defaultSiteContent);
 const [status,setStatus]=useState('');
 const [section,setSection]=useState<'overview'|'content'|'services'|'locations'>('overview');
 const [uploading,setUploading]=useState('');
 useEffect(()=>{fetch('/api/content').then(r=>r.json()).then(setContent)},[]);
 const field=(key:keyof SiteContent,value:string)=>setContent(c=>({...c,[key]:value}));
 const updateCategory=(ci:number,patch:Partial<Category>)=>setContent(c=>({...c,categories:c.categories.map((cat,i)=>i===ci?{...cat,...patch}:cat)}));
 const updateService=(ci:number,si:number,patch:Partial<Service>)=>setContent(c=>({...c,categories:c.categories.map((cat,i)=>i!==ci?cat:{...cat,services:cat.services.map((s,j)=>j===si?{...s,...patch}:s)})}));
 const addCategory=()=>setContent(c=>({...c,categories:[...c.categories,{name:'New category',short:'Add a short introduction.',services:[]}]}));
 const removeCategory=(ci:number)=>confirm('Remove this category and all its treatments?')&&setContent(c=>({...c,categories:c.categories.filter((_,i)=>i!==ci)}));
 const addService=(ci:number)=>updateCategory(ci,{services:[...content.categories[ci].services,{...blankService,name:`New treatment ${content.categories[ci].services.length+1}`}]});
 const removeService=(ci:number,si:number)=>confirm('Remove this treatment?')&&updateCategory(ci,{services:content.categories[ci].services.filter((_,i)=>i!==si)});
 const save=async()=>{setStatus('Saving…');const r=await fetch('/api/content',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(content)});setStatus(r.ok?'Changes published':'Could not save — please sign in again')};

 // Compress the chosen file, upload it, then hand the stored URL back via onDone.
 async function handleUpload(key:string,file:File|undefined,onDone:(url:string)=>void){
  if(!file)return;
  setStatus('');setUploading(key);
  try{
   const dataUrl=await compress(file);
   const r=await fetch('/api/upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dataUrl})});
   const out=await r.json().catch(()=>({}));
   if(!r.ok){setStatus(out.error||'Image upload failed');return}
   onDone(out.url);setStatus('Image added — press Save & publish to make it live');
  }catch(err){setStatus(err instanceof Error?err.message:'Image upload failed')}
  finally{setUploading('')}
 }

 return <main className="admin-shell"><aside className="admin-sidebar"><a className="admin-brand" href="/">SOUL LIFTING<br/><i>THERAPIES</i></a><nav>{(['overview','content','services','locations'] as const).map(x=><button className={section===x?'active':''} onClick={()=>setSection(x)} key={x}>{x==='overview'?'Dashboard':x==='content'?'Homepage':x==='services'?'Treatments':'Business details'}</button>)}</nav><a href="/services">View customer app ↗</a></aside><section className="admin-workspace"><header><div><p className="eyebrow">Emma’s admin</p><h1>{section==='overview'?'Dashboard':section==='content'?'Edit homepage':section==='services'?'Treatment catalogue':'Business details'}</h1></div><div className="admin-save"><span>{status}</span><button onClick={save}>Save & publish</button></div></header>
 {section==='overview'&&<div className="admin-overview"><div className="admin-stat"><span>Published treatments</span><strong>{content.categories.reduce((n,c)=>n+c.services.length,0)}</strong></div><div className="admin-stat"><span>Categories</span><strong>{content.categories.length}</strong></div><div className="admin-stat"><span>Locations</span><strong>2</strong></div><article className="admin-card wide"><h2>What you can update here</h2><p>Change homepage wording, contact details, location information, categories, treatments, prices, durations, descriptions, important notes and treatment photos. Press <b>Save &amp; publish</b> when you are ready for customers to see the changes.</p></article></div>}
 {section==='content'&&<div className="admin-card admin-fields"><label>Business name<input value={content.businessName} onChange={e=>field('businessName',e.target.value)}/></label><label>Business descriptor<input value={content.descriptor} onChange={e=>field('descriptor',e.target.value)}/></label><label>Main headline<input value={content.heroTitle} onChange={e=>field('heroTitle',e.target.value)}/></label><label>Gold headline wording<input value={content.heroAccent} onChange={e=>field('heroAccent',e.target.value)}/></label><label className="wide">Homepage introduction<textarea rows={3} value={content.heroIntro} onChange={e=>field('heroIntro',e.target.value)}/></label><label className="wide">Announcement banner (leave blank to hide)<input value={content.notice} onChange={e=>field('notice',e.target.value)} placeholder="Example: Gift vouchers now available"/></label></div>}
 {section==='locations'&&<div className="admin-card admin-fields"><label>Phone<input value={content.phone} onChange={e=>field('phone',e.target.value)}/></label><label>Email<input value={content.email} onChange={e=>field('email',e.target.value)}/></label><label className="wide">Horncastle address<textarea rows={3} value={content.horncastle} onChange={e=>field('horncastle',e.target.value)}/></label><label className="wide">Woodhall Spa address<textarea rows={3} value={content.woodhall} onChange={e=>field('woodhall',e.target.value)}/></label></div>}
 {section==='services'&&<div className="service-manager"><button className="add-category" onClick={addCategory}>＋ Add category</button>{content.categories.map((cat,ci)=><article className="admin-card category-editor" key={ci}><div className="category-editor-head"><div><input className="category-name" value={cat.name} onChange={e=>updateCategory(ci,{name:e.target.value})}/><input className="category-intro-input" value={cat.short} onChange={e=>updateCategory(ci,{short:e.target.value})}/></div><button className="danger" onClick={()=>removeCategory(ci)}>Remove category</button></div>
 <div className="img-field"><span className="img-field-label">Category photo <em>(shown on treatment cards unless a treatment has its own)</em></span><ImageControl image={cat.image} label="photo" busy={uploading===`cat-${ci}`} onFile={f=>handleUpload(`cat-${ci}`,f,url=>updateCategory(ci,{image:url}))} onClear={()=>updateCategory(ci,{image:undefined})}/></div>
 <div className="treatment-editor-list">{cat.services.map((s,si)=><div className="treatment-editor" key={si}><div className="treatment-editor-title"><input value={s.name} onChange={e=>updateService(ci,si,{name:e.target.value})}/><button className="danger" onClick={()=>removeService(ci,si)}>Remove</button></div><div className="treatment-editor-meta"><label>Price<input value={s.price} onChange={e=>updateService(ci,si,{price:e.target.value})}/></label><label>Duration<input value={s.duration} onChange={e=>updateService(ci,si,{duration:e.target.value})}/></label></div><label>Description<textarea rows={2} value={s.description??''} onChange={e=>updateService(ci,si,{description:e.target.value})}/></label><label>Important note<textarea rows={2} value={s.note??''} onChange={e=>updateService(ci,si,{note:e.target.value})}/></label><div className="img-field"><span className="img-field-label">Treatment photo <em>(optional)</em></span><ImageControl image={s.image} label="photo" busy={uploading===`svc-${ci}-${si}`} onFile={f=>handleUpload(`svc-${ci}-${si}`,f,url=>updateService(ci,si,{image:url}))} onClear={()=>updateService(ci,si,{image:undefined})}/></div></div>)}</div><button className="add-treatment" onClick={()=>addService(ci)}>＋ Add treatment to {cat.name}</button></article>)}</div>}
 </section></main>;
}

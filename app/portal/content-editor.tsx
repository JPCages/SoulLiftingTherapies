'use client';
import {useEffect,useRef,useState} from 'react';
import {defaultSiteContent,withDefaults,type SiteContent,type Feeling} from '@/lib/site-content';
import type {Category,Service} from '@/lib/sandbox-data';

const blankService:Service={name:'New treatment',price:'£0',duration:'30 minutes',description:'',note:''};
type Section='overview'|'homepage'|'services'|'account'|'booking'|'login'|'locations'|'loyalty';
const NAV:[Section,string][]=[['overview','Dashboard'],['homepage','Homepage'],['services','Treatments'],['account','Customer app'],['booking','Booking'],['login','Sign-in page'],['locations','Business details'],['loyalty','Loyalty & customers']];
const TITLE:Record<Section,string>={overview:'Dashboard',homepage:'Edit homepage',services:'Treatment catalogue',account:'Customer app',booking:'Booking page',login:'Sign-in page',locations:'Business details',loyalty:'Loyalty & customers'};
type CustomerRow={id:number;name:string;email:string;balance:number;total_spent_pennies:number};

// Compress an image in the browser so uploads stay small and fast.
function compress(file:File,maxDim=1400,quality=0.72):Promise<string>{
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

function ImageControl({image,label,busy,onFile,onClear,wide}:{image?:string;label:string;busy:boolean;onFile:(f:File|undefined)=>void;onClear:()=>void;wide?:boolean}){
 const input=useRef<HTMLInputElement>(null);
 return <div className="img-control">
  <div className={wide?'img-thumb wide':'img-thumb'} style={image?{backgroundImage:`url('${image}')`}:undefined}>{!image&&<span>No image</span>}</div>
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
 const [section,setSection]=useState<Section>('overview');
 const [uploading,setUploading]=useState('');
 const [customers,setCustomers]=useState<CustomerRow[]>([]);
 const [custMsg,setCustMsg]=useState('');
 const [amounts,setAmounts]=useState<Record<number,string>>({});
 useEffect(()=>{fetch('/api/content').then(r=>r.json()).then(x=>setContent(withDefaults(x))).catch(()=>{})},[]);
 const loadCustomers=()=>fetch('/api/admin/customers').then(r=>r.json()).then(d=>setCustomers(d.customers||[])).catch(()=>{});
 useEffect(()=>{if(section==='loyalty')loadCustomers()},[section]);
 const setNum=(k:keyof SiteContent,v:string)=>setContent(c=>({...c,[k]:v===''?undefined:Number(v)}));
 const addVisit=async(id:number)=>{const amount=parseFloat(amounts[id]??'50');if(!(amount>0)){setCustMsg('Enter a valid amount');return}setCustMsg('Adding…');const r=await fetch('/api/admin/customers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customerId:id,amount})});const o=await r.json().catch(()=>({}));if(r.ok){setCustMsg(`Added ${o.pointsAdded} point${o.pointsAdded===1?'':'s'} to that customer.`);loadCustomers()}else setCustMsg(o.error||'Could not add visit')};
 const redeem=async(id:number)=>{if(!confirm('Redeem one reward for this customer? This subtracts the reward points from their balance.'))return;setCustMsg('Redeeming…');const r=await fetch('/api/admin/customers/redeem',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customerId:id})});const o=await r.json().catch(()=>({}));if(r.ok){setCustMsg('Reward redeemed.');loadCustomers()}else setCustMsg(o.error||'Could not redeem')};
 const field=(key:keyof SiteContent,value:string)=>setContent(c=>({...c,[key]:value}));
 const setFeelings=(feelings:Feeling[])=>setContent(c=>({...c,feelings}));
 const updateCategory=(ci:number,patch:Partial<Category>)=>setContent(c=>({...c,categories:c.categories.map((cat,i)=>i===ci?{...cat,...patch}:cat)}));
 const updateService=(ci:number,si:number,patch:Partial<Service>)=>setContent(c=>({...c,categories:c.categories.map((cat,i)=>i!==ci?cat:{...cat,services:cat.services.map((s,j)=>j===si?{...s,...patch}:s)})}));
 const addCategory=()=>setContent(c=>({...c,categories:[...c.categories,{name:'New category',short:'Add a short introduction.',services:[]}]}));
 const removeCategory=(ci:number)=>confirm('Remove this category and all its treatments?')&&setContent(c=>({...c,categories:c.categories.filter((_,i)=>i!==ci)}));
 const addService=(ci:number)=>updateCategory(ci,{services:[...content.categories[ci].services,{...blankService,name:`New treatment ${content.categories[ci].services.length+1}`}]});
 const removeService=(ci:number,si:number)=>confirm('Remove this treatment?')&&updateCategory(ci,{services:content.categories[ci].services.filter((_,i)=>i!==si)});
 const save=async()=>{setStatus('Saving…');const r=await fetch('/api/content',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(content)});setStatus(r.ok?'Changes published':'Could not save — please sign in again')};

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

 // Plain render helpers (called as functions, not JSX components, to preserve input focus).
 const val=(k:keyof SiteContent)=>(content[k] as string|undefined)??'';
 const text=(k:keyof SiteContent,label:string,wide=false)=><label className={wide?'wide':''} key={k}>{label}<input value={val(k)} onChange={e=>field(k,e.target.value)}/></label>;
 const area=(k:keyof SiteContent,label:string)=><label className="wide" key={k}>{label}<textarea rows={2} value={val(k)} onChange={e=>field(k,e.target.value)}/></label>;
 const heroField=(k:'heroImage'|'accountHeroImage',label:string)=><div className="img-field"><span className="img-field-label">{label}</span><ImageControl wide image={val(k)} label="image" busy={uploading===k} onFile={f=>handleUpload(k,f,url=>field(k,url))} onClear={()=>field(k,'')}/></div>;
 const numField=(k:keyof SiteContent,label:string)=><label key={k}>{label}<input type="number" min={1} value={(content[k] as number|undefined)??''} onChange={e=>setNum(k,e.target.value)}/></label>;

 return <main className="admin-shell"><aside className="admin-sidebar"><a className="admin-brand" href="/">SOUL LIFTING<br/><i>THERAPIES</i></a><nav>{NAV.map(([x,label])=><button className={section===x?'active':''} onClick={()=>setSection(x)} key={x}>{label}</button>)}</nav><a href="/services">View customer app ↗</a></aside><section className="admin-workspace"><header><div><p className="eyebrow">Emma’s admin</p><h1>{TITLE[section]}</h1></div><div className="admin-save"><span>{status}</span><button onClick={save}>Save &amp; publish</button></div></header>

 {section==='overview'&&<div className="admin-overview"><div className="admin-stat"><span>Published treatments</span><strong>{content.categories.reduce((n,c)=>n+c.services.length,0)}</strong></div><div className="admin-stat"><span>Categories</span><strong>{content.categories.length}</strong></div><div className="admin-stat"><span>Locations</span><strong>2</strong></div><article className="admin-card wide"><h2>Everything here is editable</h2><p>Use the menu on the left to edit the <b>homepage</b>, <b>treatments and photos</b>, the <b>customer app</b>, the <b>booking page</b>, the <b>sign-in page</b> and your <b>business details</b>. You can also add a banner image behind each treatment heading. Press <b>Save &amp; publish</b> when you are ready for customers to see the changes.</p></article></div>}

 {section==='homepage'&&<><div className="admin-card admin-fields">{text('businessName','Business name')}{text('descriptor','Business descriptor')}{text('heroTitle','Main headline')}{text('heroAccent','Gold headline wording')}{area('heroIntro','Homepage introduction')}{area('notice','Announcement banner (leave blank to hide)')}</div>
 <div className="admin-card">{heroField('heroImage','Homepage banner image (behind the headline)')}</div>
 <div className="admin-card admin-fields">{text('homeMenuEyebrow','Treatment-menu label')}{text('homeMenuHeading','Treatment-menu heading')}{text('homePrivateEyebrow','Private-space label')}{text('homePrivateHeading','Private-space heading')}{area('homePrivateIntro','Private-space text')}{text('homeLoginCta','Log-in button text')}</div></>}

 {section==='services'&&<div className="service-manager"><div className="admin-card admin-fields">{text('servicesTitle','Treatments page title')}{text('servicesHelpHeading','Help box heading')}{text('servicesHelpCta','Help box button (WhatsApp)')}</div><button className="add-category" onClick={addCategory}>＋ Add category</button>{content.categories.map((cat,ci)=><article className="admin-card category-editor" key={ci}><div className="category-editor-head"><div><input className="category-name" value={cat.name} onChange={e=>updateCategory(ci,{name:e.target.value})}/><input className="category-intro-input" value={cat.short} onChange={e=>updateCategory(ci,{short:e.target.value})}/></div><button className="danger" onClick={()=>removeCategory(ci)}>Remove category</button></div>
 <div className="img-field"><span className="img-field-label">Banner image <em>(behind the “{cat.name}” heading)</em></span><ImageControl wide image={cat.banner} label="banner" busy={uploading===`ban-${ci}`} onFile={f=>handleUpload(`ban-${ci}`,f,url=>updateCategory(ci,{banner:url}))} onClear={()=>updateCategory(ci,{banner:undefined})}/></div>
 <div className="img-field"><span className="img-field-label">Category photo <em>(shown on treatment cards unless a treatment has its own)</em></span><ImageControl image={cat.image} label="photo" busy={uploading===`cat-${ci}`} onFile={f=>handleUpload(`cat-${ci}`,f,url=>updateCategory(ci,{image:url}))} onClear={()=>updateCategory(ci,{image:undefined})}/></div>
 <div className="treatment-editor-list">{cat.services.map((s,si)=><div className="treatment-editor" key={si}><div className="treatment-editor-title"><input value={s.name} onChange={e=>updateService(ci,si,{name:e.target.value})}/><button className="danger" onClick={()=>removeService(ci,si)}>Remove</button></div><div className="treatment-editor-meta"><label>Price<input value={s.price} onChange={e=>updateService(ci,si,{price:e.target.value})}/></label><label>Duration<input value={s.duration} onChange={e=>updateService(ci,si,{duration:e.target.value})}/></label></div><label>Description<textarea rows={2} value={s.description??''} onChange={e=>updateService(ci,si,{description:e.target.value})}/></label><label>Important note<textarea rows={2} value={s.note??''} onChange={e=>updateService(ci,si,{note:e.target.value})}/></label><div className="img-field"><span className="img-field-label">Treatment photo <em>(optional)</em></span><ImageControl image={s.image} label="photo" busy={uploading===`svc-${ci}-${si}`} onFile={f=>handleUpload(`svc-${ci}-${si}`,f,url=>updateService(ci,si,{image:url}))} onClear={()=>updateService(ci,si,{image:undefined})}/></div></div>)}</div><button className="add-treatment" onClick={()=>addService(ci)}>＋ Add treatment to {cat.name}</button></article>)}</div>}

 {section==='account'&&<><div className="admin-card">{heroField('accountHeroImage','Customer app banner image (behind the greeting)')}</div>
 <div className="admin-card admin-fields">{text('accountGreeting','Greeting line')}{text('accountName','Name shown (until customers log in)')}{area('accountSubtitle','Subtitle')}{text('feelingHeading','“How are you feeling” heading',true)}</div>
 <div className="admin-card"><h2>Feeling buttons</h2><div className="feelings-editor">{(content.feelings??[]).map((f,i)=><div className="feeling-row" key={i}><input className="feeling-icon" value={f.icon} onChange={e=>setFeelings((content.feelings??[]).map((x,j)=>j===i?{...x,icon:e.target.value}:x))} aria-label="Icon"/><input value={f.label} onChange={e=>setFeelings((content.feelings??[]).map((x,j)=>j===i?{...x,label:e.target.value}:x))} aria-label="Label"/><button className="danger" onClick={()=>setFeelings((content.feelings??[]).filter((_,j)=>j!==i))}>Remove</button></div>)}<button className="add-treatment" onClick={()=>setFeelings([...(content.feelings??[]),{icon:'✦',label:'New'}])}>＋ Add feeling</button></div></div>
 <div className="admin-card admin-fields">{text('appointmentLabel','Appointment label')}{text('appointmentHeading','Appointment heading')}{text('appointmentEmpty','Appointment empty state')}{text('appointmentCta','Appointment button')}{area('appointmentHint','Appointment hint')}{text('wellbeingLabel','Wellbeing label')}{text('wellbeingHint','Wellbeing hint')}{text('pointsLabel','Soul Points label')}{area('pointsIntro','Soul Points text')}{text('journeyHeading','Journey heading')}{area('journeyIntro','Journey text')}</div></>}

 {section==='booking'&&<div className="admin-card admin-fields">{text('bookingEyebrow','Booking label')}{text('bookingHeading','Booking heading')}{area('bookingIntro','Booking introduction')}{area('bookingNote','Deposit / Fresha note')}{text('bookingSuccessHeading','Confirmation heading')}{area('bookingSuccessBody','Confirmation text')}</div>}

 {section==='login'&&<div className="admin-card admin-fields">{text('loginEyebrow','Label')}{text('loginHeading','Heading')}{area('loginIntro','Intro text')}{text('loginCustomerTitle','Customer button title')}{area('loginCustomerBlurb','Customer button text')}{text('loginAdminTitle','Emma button title')}{area('loginAdminBlurb','Emma button text')}</div>}

 {section==='locations'&&<div className="admin-card admin-fields">{text('phone','Phone')}{text('email','Email')}{area('horncastle','Horncastle address')}{area('woodhall','Woodhall Spa address')}</div>}

 {section==='loyalty'&&<><div className="admin-card admin-fields"><label className="wide toggle"><input type="checkbox" checked={content.loyaltyEnabled!==false} onChange={e=>setContent(c=>({...c,loyaltyEnabled:e.target.checked}))}/> Show the Soul Points programme to customers</label>{numField('loyaltyPoundsPerPoint','£ spent for 1 point (10 = every £10 earns a point)')}{numField('loyaltyRewardPoints','Points needed for a reward (40 = £400 spent)')}{text('loyaltyRewardText','The reward',true)}<p className="hint wide">These rules save with <b>Save &amp; publish</b>. Adding visits and redeeming rewards below happen instantly.</p></div>
 <div className="admin-card"><h2>Customers</h2><p className="cust-msg">{custMsg}</p>{customers.length===0?<p className="muted">No customer accounts yet. When customers sign up on the app, they will appear here so you can log their visits.</p>:<div className="cust-list">{customers.map(c=>{const ready=c.balance>=(content.loyaltyRewardPoints??40);return <div className="cust-row" key={c.id}><div className="cust-id"><b>{c.name}</b><span>{c.email}</span></div><div className="cust-points"><strong>{c.balance}</strong> pts<small>£{(c.total_spent_pennies/100).toFixed(0)} lifetime</small></div><div className="cust-actions"><div className="visit-add"><span>£</span><input type="number" min={0} value={amounts[c.id]??'50'} onChange={e=>setAmounts(a=>({...a,[c.id]:e.target.value}))}/><button className="img-btn" onClick={()=>addVisit(c.id)}>Add visit</button></div><button className={ready?'img-btn':'img-btn ghost'} disabled={!ready} onClick={()=>redeem(c.id)}>{ready?'Redeem reward':'Reward not ready'}</button></div></div>})}</div>}</div></>}
 </section></main>;
}

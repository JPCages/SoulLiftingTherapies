'use client';
import {useEffect,useRef,useState} from 'react';
import {defaultSiteContent,withDefaults,type SiteContent,type Feeling} from '@/lib/site-content';
import type {Category,Service} from '@/lib/sandbox-data';
import NextImage from 'next/image';
import {ImageControl,compress} from './image-control';
import PageEditor from './page-editor';
import type {SitePuckData} from '@/lib/puck/config';

const blankService:Service={name:'New treatment',price:'£0',duration:'30 minutes',description:'',note:''};
type Section='overview'|'homepage'|'services'|'account'|'booking'|'login'|'locations'|'loyalty'|'clients'|'requests';
const NAV:[Section,string][]=[['overview','Dashboard'],['homepage','Homepage'],['services','Treatments'],['account','Customer app'],['booking','Booking'],['login','Sign-in page'],['locations','Business details'],['loyalty','Loyalty & customers'],['clients','Client list'],['requests','Booking requests']];
const TITLE:Record<Section,string>={overview:'Dashboard',homepage:'Edit homepage',services:'Treatment catalogue',account:'Customer app',booking:'Booking page',login:'Sign-in page',locations:'Business details',loyalty:'Loyalty & customers',clients:'Client list',requests:'Booking requests'};
type CustomerRow={id:number;name:string;email:string;balance:number;total_spent_pennies:number};
type ClientRow={id:number;full_name:string;phone:string|null;email:string|null;accepts_marketing:boolean;fresha_added:string|null;customer_id:number|null;customer_name:string|null};
type ClientStats={total:number;linked:number;withEmail:number;marketing:number};
type BookingStatus='new'|'offered'|'confirmed'|'declined';
type BookingRow={id:number;name:string;email:string|null;phone:string;treatment:string;location:string;preferences:string;notes:string|null;status:BookingStatus;client_name:string|null;created_at:string};

export default function ContentEditor(){
 const [content,setContent]=useState<SiteContent>(defaultSiteContent);
 const [status,setStatus]=useState('');
 const [section,setSection]=useState<Section>('overview');
 const [uploading,setUploading]=useState('');
 const [customers,setCustomers]=useState<CustomerRow[]>([]);
 const [custMsg,setCustMsg]=useState('');
 const [amounts,setAmounts]=useState<Record<number,string>>({});
 const [clients,setClients]=useState<ClientRow[]>([]);
 const [clientStats,setClientStats]=useState<ClientStats|null>(null);
 const [clientMsg,setClientMsg]=useState('');
 const [clientSearch,setClientSearch]=useState('');
 const [importReport,setImportReport]=useState<string[]>([]);
 const csvInput=useRef<HTMLInputElement>(null);
 const [requests,setRequests]=useState<BookingRow[]>([]);
 const [newCount,setNewCount]=useState(0);
 const [reqFilter,setReqFilter]=useState<'new'|'all'>('new');
 const [reqMsg,setReqMsg]=useState('');
 // Booking alerts: where Emma is emailed about new requests.
 const [alert,setAlert]=useState<{email:string;effective:string|null;configured:boolean}|null>(null);
 const [alertDraft,setAlertDraft]=useState('');
 const [alertMsg,setAlertMsg]=useState('');
 const [alertBusy,setAlertBusy]=useState(false);
 useEffect(()=>{fetch('/api/content').then(r=>r.json()).then(x=>setContent(withDefaults(x))).catch(()=>{})},[]);
 const loadCustomers=()=>fetch('/api/admin/customers').then(r=>r.json()).then(d=>setCustomers(d.customers||[])).catch(()=>{});
 useEffect(()=>{if(section==='loyalty')loadCustomers()},[section]);
 const loadClients=(q='')=>fetch('/api/admin/clients?q='+encodeURIComponent(q)).then(r=>r.json()).then(d=>{setClients(d.clients||[]);if(d.stats)setClientStats(d.stats)}).catch(()=>{});
 useEffect(()=>{if(section==='clients'){loadClients();loadCustomers()}},[section]);
 const loadRequests=(status=reqFilter)=>fetch('/api/admin/bookings?status='+status).then(r=>r.json()).then(d=>{setRequests(d.requests||[]);setNewCount(d.newCount??0)}).catch(()=>{});
 // The badge is worth knowing about from any screen, so it loads once on mount too.
 useEffect(()=>{if(section!=='requests'||alert)return;fetch('/api/admin/alerts').then(r=>r.json()).then(d=>{if(d.error)return;setAlert(d);setAlertDraft(d.email||'')}).catch(()=>{})},[section,alert]);
 const saveAlert=async()=>{
  setAlertBusy(true);setAlertMsg('');
  const r=await fetch('/api/admin/alerts',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({email:alertDraft})});
  const d=await r.json().catch(()=>({}));
  setAlertBusy(false);
  if(!r.ok){setAlertMsg(d.error||'Could not save');return}
  setAlert(a=>a?{...a,email:alertDraft.trim().toLowerCase(),effective:d.effective}:a);
  setAlertMsg('Saved.');
 };
 const testAlert=async()=>{
  setAlertBusy(true);setAlertMsg('Sending…');
  const r=await fetch('/api/admin/alerts',{method:'POST'});
  const d=await r.json().catch(()=>({}));
  setAlertBusy(false);
  setAlertMsg(r.ok?`Test sent to ${d.to}. Check your inbox (and spam, the first time).`:(d.error||'The test could not be sent.'));
 };
 useEffect(()=>{fetch('/api/admin/bookings?status=new').then(r=>r.json()).then(d=>setNewCount(d.newCount??0)).catch(()=>{})},[]);
 useEffect(()=>{if(section!=='requests')return;let live=true;fetch('/api/admin/bookings?status='+reqFilter).then(r=>r.json()).then(d=>{if(!live)return;setRequests(d.requests||[]);setNewCount(d.newCount??0)}).catch(()=>{});return()=>{live=false}},[section,reqFilter]);
 const setRequestStatus=async(id:number,status:BookingStatus)=>{
  setReqMsg('Updating…');
  const r=await fetch('/api/admin/bookings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});
  const o=await r.json().catch(()=>({}));
  if(r.ok){setReqMsg('');setNewCount(o.newCount??0);loadRequests()}else setReqMsg(o.error||'Could not update that request');
 };
 const whenText=(iso:string)=>{const d=new Date(iso);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})};
 const importCsv=async(file:File|undefined)=>{
  if(!file)return;
  setClientMsg('Reading '+file.name+'…');setImportReport([]);
  const csv=await file.text();
  setClientMsg('Importing…');
  const r=await fetch('/api/admin/clients',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({csv})});
  const o=await r.json().catch(()=>({}));
  if(!r.ok){setClientMsg(o.error||'Import failed');return}
  setClientMsg(`${o.inserted} added, ${o.updated} updated, ${o.skipped} skipped.`);
  setImportReport(o.problems||[]);
  loadClients(clientSearch);
 };
 const linkClient=async(clientId:number,customerId:number|null)=>{
  const r=await fetch('/api/admin/clients',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({clientId,customerId})});
  if(r.ok){setClientMsg(customerId?'Linked to that app account.':'Unlinked.');loadClients(clientSearch)}
  else setClientMsg('Could not update that client');
 };
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
 const put=async(doc:SiteContent)=>{
  setStatus('Saving…');
  const r=await fetch('/api/content',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(doc)});
  setStatus(r.ok?'Changes published':'Could not save — please sign in again');
  return r.ok;
 };
 const save=async()=>{await put(content)};
 // Publishing from the visual editor saves the layout alongside everything else
 // in the same document, so one Save button covers the whole site.
 const publishPage=async(data:SitePuckData)=>{
  const doc={...content,puck:data as unknown as SiteContent['puck']};
  setContent(doc);
  await put(doc);
 };

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

 return <main className="admin-shell"><aside className="admin-sidebar"><a className="admin-brand" href="/" aria-label="Soul Lifting Therapies"><span className="brand-mark emblem"><NextImage src="/brand/logo-emblem.webp" alt="Soul Lifting Therapies" width={800} height={800}/></span></a><nav>{NAV.map(([x,label])=><button className={section===x?'active':''} onClick={()=>setSection(x)} key={x}>{label}{x==='requests'&&newCount>0&&<span className="nav-badge">{newCount}</span>}</button>)}</nav><a href="/services">View customer app ↗</a></aside><section className="admin-workspace"><header><div><p className="eyebrow">Emma’s admin</p><h1>{TITLE[section]}</h1></div><div className="admin-save"><span>{status}</span>{section!=='homepage'&&section!=='requests'&&<button onClick={save}>Save &amp; publish</button>}</div></header>

 {section==='overview'&&<div className="admin-overview"><div className="admin-stat"><span>Published treatments</span><strong>{content.categories.reduce((n,c)=>n+c.services.length,0)}</strong></div><div className="admin-stat"><span>Categories</span><strong>{content.categories.length}</strong></div><div className="admin-stat"><span>Locations</span><strong>2</strong></div><div className="admin-stat"><span>Requests needing a reply</span><strong>{newCount}</strong></div><article className="admin-card wide"><h2>Everything here is editable</h2><p>Use the menu on the left to edit the <b>homepage</b> on the page itself, <b>treatments and photos</b>, the <b>customer app</b>, the <b>booking page</b>, the <b>sign-in page</b> and your <b>business details</b>. You can also add a banner image behind each treatment heading. Press <b>Save &amp; publish</b> when you are ready for customers to see the changes.</p></article></div>}

 {section==='homepage'&&<PageEditor content={content} saving={status==='Saving…'} onPublish={publishPage}/>}

 {section==='services'&&<div className="service-manager"><div className="admin-card admin-fields">{text('servicesTitle','Treatments page title')}{text('servicesHelpHeading','Help box heading')}{text('servicesHelpCta','Help box button (WhatsApp)')}</div><button className="add-category" onClick={addCategory}>＋ Add category</button>{content.categories.map((cat,ci)=><article className="admin-card category-editor" key={ci}><div className="category-editor-head"><div><input className="category-name" value={cat.name} onChange={e=>updateCategory(ci,{name:e.target.value})}/><input className="category-intro-input" value={cat.short} onChange={e=>updateCategory(ci,{short:e.target.value})}/></div><button className="danger" onClick={()=>removeCategory(ci)}>Remove category</button></div>
 <div className="img-field"><span className="img-field-label">Banner image <em>(behind the “{cat.name}” heading)</em></span><ImageControl wide image={cat.banner} label="banner" busy={uploading===`ban-${ci}`} pos={cat.bannerPos} onPos={n=>updateCategory(ci,{bannerPos:n})} onFile={f=>handleUpload(`ban-${ci}`,f,url=>updateCategory(ci,{banner:url}))} onClear={()=>updateCategory(ci,{banner:undefined})}/></div>
 <div className="img-field"><span className="img-field-label">Category photo <em>(shown on treatment cards unless a treatment has its own)</em></span><ImageControl image={cat.image} label="photo" busy={uploading===`cat-${ci}`} pos={cat.imagePos} onPos={n=>updateCategory(ci,{imagePos:n})} onFile={f=>handleUpload(`cat-${ci}`,f,url=>updateCategory(ci,{image:url}))} onClear={()=>updateCategory(ci,{image:undefined})}/></div>
 <div className="treatment-editor-list">{cat.services.map((s,si)=><div className="treatment-editor" key={si}><div className="treatment-editor-title"><input value={s.name} onChange={e=>updateService(ci,si,{name:e.target.value})}/><button className="danger" onClick={()=>removeService(ci,si)}>Remove</button></div><div className="treatment-editor-meta"><label>Price<input value={s.price} onChange={e=>updateService(ci,si,{price:e.target.value})}/></label><label>Duration<input value={s.duration} onChange={e=>updateService(ci,si,{duration:e.target.value})}/></label></div><label>Description<textarea rows={2} value={s.description??''} onChange={e=>updateService(ci,si,{description:e.target.value})}/></label><label>Important note<textarea rows={2} value={s.note??''} onChange={e=>updateService(ci,si,{note:e.target.value})}/></label><div className="img-field"><span className="img-field-label">Treatment photo <em>(optional)</em></span><ImageControl image={s.image} label="photo" busy={uploading===`svc-${ci}-${si}`} pos={s.imagePos} onPos={n=>updateService(ci,si,{imagePos:n})} onFile={f=>handleUpload(`svc-${ci}-${si}`,f,url=>updateService(ci,si,{image:url}))} onClear={()=>updateService(ci,si,{image:undefined})}/></div></div>)}</div><button className="add-treatment" onClick={()=>addService(ci)}>＋ Add treatment to {cat.name}</button></article>)}</div>}

 {section==='account'&&<><div className="admin-card admin-fields"><label className="wide toggle"><input type="checkbox" checked={content.wellbeingEnabled===true} onChange={e=>setContent(c=>({...c,wellbeingEnabled:e.target.checked}))}/> Show the wellbeing score tile</label><label className="wide toggle"><input type="checkbox" checked={content.journeyEnabled===true} onChange={e=>setContent(c=>({...c,journeyEnabled:e.target.checked}))}/> Show the treatment-journey photo section</label><p className="hint wide">Both are switched off until they are built properly. The photo section does not store anything yet, so leaving it off keeps the app honest about what it does.</p></div><div className="admin-card">{heroField('accountHeroImage','Customer app banner image (behind the greeting)')}</div>
 <div className="admin-card admin-fields">{text('accountGreeting','Greeting line')}{text('accountName','Name shown (until customers log in)')}{area('accountSubtitle','Subtitle')}{text('feelingHeading','“How are you feeling” heading',true)}</div>
 <div className="admin-card"><h2>Feeling buttons</h2><div className="feelings-editor">{(content.feelings??[]).map((f,i)=><div className="feeling-row" key={i}><input className="feeling-icon" value={f.icon} onChange={e=>setFeelings((content.feelings??[]).map((x,j)=>j===i?{...x,icon:e.target.value}:x))} aria-label="Icon"/><input value={f.label} onChange={e=>setFeelings((content.feelings??[]).map((x,j)=>j===i?{...x,label:e.target.value}:x))} aria-label="Label"/><button className="danger" onClick={()=>setFeelings((content.feelings??[]).filter((_,j)=>j!==i))}>Remove</button></div>)}<button className="add-treatment" onClick={()=>setFeelings([...(content.feelings??[]),{icon:'✦',label:'New'}])}>＋ Add feeling</button></div></div>
 <div className="admin-card admin-fields">{text('appointmentLabel','Appointment label')}{text('appointmentHeading','Appointment heading')}{text('appointmentEmpty','Appointment empty state')}{text('appointmentCta','Appointment button')}{area('appointmentHint','Appointment hint')}{text('wellbeingLabel','Wellbeing label')}{text('wellbeingHint','Wellbeing hint')}{text('pointsLabel','Soul Points label')}{area('pointsIntro','Soul Points text')}{text('journeyHeading','Journey heading')}{area('journeyIntro','Journey text')}</div></>}

 {section==='booking'&&<div className="admin-card admin-fields">{text('bookingEyebrow','Booking label')}{text('bookingHeading','Booking heading')}{area('bookingIntro','Booking introduction')}{area('bookingNote','Deposit / Fresha note')}{text('bookingSuccessHeading','Confirmation heading')}{area('bookingSuccessBody','Confirmation text')}</div>}

 {section==='login'&&<div className="admin-card admin-fields">{text('loginEyebrow','Label')}{text('loginHeading','Heading')}{area('loginIntro','Intro text')}{text('loginCustomerTitle','Customer button title')}{area('loginCustomerBlurb','Customer button text')}{text('loginAdminTitle','Emma button title')}{area('loginAdminBlurb','Emma button text')}</div>}

 {section==='locations'&&<div className="admin-card admin-fields">{text('businessName','Business name')}{text('descriptor','Business descriptor')}{text('phone','Phone')}{text('email','Email')}{area('horncastle','Horncastle address')}{text('horncastleHours','Horncastle opening hours')}{area('woodhall','Woodhall Spa address')}{text('woodhallHours','Woodhall Spa opening hours')}<p className="hint wide">These appear on the homepage, in the footer and on the booking page. Leave the hours blank and none are shown.</p></div>}
 {section==='locations'&&<div className="admin-card admin-fields"><h2 className="wide">Search &amp; sharing</h2>{text('seoTitle','Homepage title in Google (about 60 characters)',true)}{area('seoDescription','Line under it in Google (about 155 characters)')}<p className="hint wide">This is what people see in search results before they click. Leave both blank to use the standard wording.</p></div>}

 {section==='loyalty'&&<><div className="admin-card admin-fields"><label className="wide toggle"><input type="checkbox" checked={content.loyaltyEnabled!==false} onChange={e=>setContent(c=>({...c,loyaltyEnabled:e.target.checked}))}/> Show the Soul Points programme to customers</label>{numField('loyaltyPoundsPerPoint','£ spent for 1 point (10 = every £10 earns a point)')}{numField('loyaltyRewardPoints','Points needed for a reward (40 = £400 spent)')}{text('loyaltyRewardText','The reward',true)}<p className="hint wide">These rules save with <b>Save &amp; publish</b>. Adding visits and redeeming rewards below happen instantly.</p></div>
 <div className="admin-card"><h2>Customers</h2><p className="cust-msg">{custMsg}</p>{customers.length===0?<p className="muted">No customer accounts yet. When customers sign up on the app, they will appear here so you can log their visits.</p>:<div className="cust-list">{customers.map(c=>{const ready=c.balance>=(content.loyaltyRewardPoints??40);return <div className="cust-row" key={c.id}><div className="cust-id"><b>{c.name}</b><span>{c.email}</span></div><div className="cust-points"><strong>{c.balance}</strong> pts<small>£{(c.total_spent_pennies/100).toFixed(0)} lifetime</small></div><div className="cust-actions"><div className="visit-add"><span>£</span><input type="number" min={0} value={amounts[c.id]??'50'} onChange={e=>setAmounts(a=>({...a,[c.id]:e.target.value}))}/><button className="img-btn" onClick={()=>addVisit(c.id)}>Add visit</button></div><button className={ready?'img-btn':'img-btn ghost'} disabled={!ready} onClick={()=>redeem(c.id)}>{ready?'Redeem reward':'Reward not ready'}</button></div></div>})}</div>}</div></>}

 {section==='clients'&&<><div className="admin-card"><h2>Import from Fresha</h2><p className="hint">Export your client list from Fresha as CSV, then choose the file here. Importing the same file again updates the existing records rather than duplicating them. These are <b>your contacts</b> &mdash; nobody is emailed and no one gets an app login. When a client signs up on the app with the same email address, their record links automatically.</p>
 <input ref={csvInput} type="file" accept=".csv,text/csv" hidden onChange={e=>{importCsv(e.target.files?.[0]);e.target.value=''}}/>
 <button className="img-btn" onClick={()=>csvInput.current?.click()}>Choose Fresha CSV</button>
 <p className="cust-msg">{clientMsg}</p>
 {importReport.length>0&&<ul className="import-report">{importReport.map((p,i)=><li key={i}>{p}</li>)}</ul>}</div>

 {clientStats&&<div className="admin-overview"><div className="admin-stat"><span>Clients</span><strong>{clientStats.total}</strong></div><div className="admin-stat"><span>With an email address</span><strong>{clientStats.withEmail}</strong></div><div className="admin-stat"><span>Linked to an app account</span><strong>{clientStats.linked}</strong></div><div className="admin-stat"><span>Marketing opt-in</span><strong>{clientStats.marketing}</strong></div></div>}

 <div className="admin-card"><h2>Your clients</h2>
 <div className="client-search"><input placeholder="Search name, email or number" value={clientSearch} onChange={e=>{setClientSearch(e.target.value);loadClients(e.target.value)}}/></div>
 {clients.length===0?<p className="muted">No clients yet. Import your Fresha export above.</p>:<div className="cust-list">{clients.map(c=><div className="cust-row" key={c.id}><div className="cust-id"><b>{c.full_name}</b><span>{c.phone||c.email||'No contact details'}</span></div><div className="cust-points"><small>{c.fresha_added?`Client since ${c.fresha_added.slice(0,10)}`:'\u2014'}</small></div><div className="cust-actions">{c.customer_id
   ?<><span className="linked-tag">App account: {c.customer_name}</span><button className="img-btn ghost" onClick={()=>linkClient(c.id,null)}>Unlink</button></>
   :<select defaultValue="" onChange={e=>e.target.value&&linkClient(c.id,Number(e.target.value))}><option value="">Link to an app account…</option>{customers.map(cu=><option key={cu.id} value={cu.id}>{cu.name} ({cu.email})</option>)}</select>}</div></div>)}</div>}
 </div></>}

 {section==='requests'&&<><div className="admin-card admin-fields alert-card"><h2 className="wide">Booking alerts</h2>
 {alert&&!alert.configured&&<p className="hint wide alert-off">Email is not switched on yet. Requests still arrive here; JP is setting up the email side.</p>}
 <label className="wide">Email me new requests at<input type="email" value={alertDraft} placeholder={content.email||'you@example.com'} onChange={e=>setAlertDraft(e.target.value)}/></label>
 <p className="hint wide">Leave blank to use your business email{content.email?` (${content.email})`:''}. Hit reply on an alert and it goes straight to the customer, when they gave an email.</p>
 <div className="alert-actions wide"><button type="button" disabled={alertBusy} onClick={saveAlert}>Save</button><button type="button" className="ghost" disabled={alertBusy||!alert?.configured} onClick={testAlert}>Send me a test</button><span className="cust-msg">{alertMsg}</span></div>
 </div>
 <div className="admin-card"><h2>Requests from customers</h2><p className="hint">These are requests, not bookings. Check the time in Fresha, then confirm or decline here so you know what you have dealt with. The customer is told nothing is held until you confirm.</p>
 <div className="req-filter"><button className={reqFilter==='new'?'active':''} onClick={()=>setReqFilter('new')}>Needs a reply{newCount>0?` (${newCount})`:''}</button><button className={reqFilter==='all'?'active':''} onClick={()=>setReqFilter('all')}>All requests</button></div>
 <p className="cust-msg">{reqMsg}</p>
 {requests.length===0?<p className="muted">{reqFilter==='new'?'Nothing waiting. Anything new will appear here.':'No requests yet.'}</p>:<div className="req-list">{requests.map(r=><article className={r.status==='new'?'req is-new':'req'} key={r.id}>
   <div className="req-head"><b>{r.name}</b><span className={'status-tag status-'+r.status}>{r.status==='new'?'Needs a reply':r.status}</span><span className="req-when">{whenText(r.created_at)}</span></div>
   <div className="req-body">
     <span><b>Treatment:</b> {r.treatment}</span>
     <span><b>Where:</b> {r.location}</span>
     <span><b>When suits:</b> {r.preferences}</span>
     {r.notes&&<span><b>Notes:</b> {r.notes}</span>}
     <span><b>Contact:</b> <a href={'tel:'+r.phone.replace(/\s/g,'')}>{r.phone}</a>{r.email?<> · <a href={'mailto:'+r.email}>{r.email}</a></>:null}</span>
     {r.client_name&&<span><b>On your client list as:</b> {r.client_name}</span>}
   </div>
   <div className="req-actions">
     <button className="img-btn" onClick={()=>setRequestStatus(r.id,'confirmed')}>Confirmed in Fresha</button>
     <button className="img-btn ghost" onClick={()=>setRequestStatus(r.id,'offered')}>Replied, waiting</button>
     <button className="img-btn ghost" onClick={()=>setRequestStatus(r.id,'declined')}>Could not fit in</button>
     {r.status!=='new'&&<button className="img-btn ghost" onClick={()=>setRequestStatus(r.id,'new')}>Move back</button>}
   </div>
 </article>)}</div>}</div></>}
 </section></main>;
}

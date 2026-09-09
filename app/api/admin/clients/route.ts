import {isAdmin} from '@/lib/auth';
import {listClients,countClients,upsertClient,setClientCustomer,type ClientInput} from '@/lib/db';

// Minimal RFC4180 CSV parser: handles quoted fields, escaped quotes and CRLF.
function parseCsv(text:string):string[][]{
  const rows:string[][]=[]; let row:string[]=[]; let cell=''; let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"'){ if(text[i+1]==='"'){cell+='"';i++} else quoted=false }
      else cell+=ch;
    } else if(ch==='"') quoted=true;
    else if(ch===','){ row.push(cell); cell='' }
    else if(ch==='\n'){ row.push(cell); cell=''; rows.push(row); row=[] }
    else if(ch!=='\r') cell+=ch;
  }
  if(cell!==''||row.length){ row.push(cell); rows.push(row) }
  return rows.filter(r=>r.some(c=>c.trim()!==''));
}
// Fresha exports UK mobiles as "44 7xxx xxxxxx"; store them as 07xxxxxxxxx.
function normalisePhone(raw:string):string|null{
  const digits=(raw||'').replace(/\D/g,'');
  if(!digits)return null;
  if(digits.startsWith('44'))return '0'+digits.slice(2);
  return digits;
}

export async function GET(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const search=new URL(request.url).searchParams.get('q')??'';
  const [clients,stats]=await Promise.all([listClients(search),countClients()]);
  return Response.json({clients,stats});
}

// Import a Fresha client-list CSV. Idempotent: re-importing updates by Fresha client id.
export async function POST(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const {csv}=await request.json() as {csv?:string};
  if(!csv||!csv.trim())return Response.json({error:'Paste or upload the CSV first'},{status:400});
  const rows=parseCsv(csv);
  if(rows.length<2)return Response.json({error:'That file has no client rows'},{status:400});
  const header=rows[0].map(h=>h.trim().toLowerCase());
  const col=(...names:string[])=>{for(const n of names){const i=header.indexOf(n);if(i>=0)return i}return -1};
  const iId=col('client id'),iFirst=col('first name'),iLast=col('last name'),iFull=col('full name'),
        iMobile=col('mobile number'),iTel=col('telephone'),iEmail=col('email'),
        iMkt=col('accepts marketing'),iSms=col('accepts sms marketing'),iAdded=col('added'),iSrc=col('referral source');
  if(iFull<0&&iFirst<0)return Response.json({error:'That does not look like a Fresha client export (no name column)'},{status:400});

  let inserted=0,updated=0,skipped=0; const seen=new Set<string>(); const problems:string[]=[];
  for(const r of rows.slice(1)){
    const at=(i:number)=>i>=0?(r[i]??'').trim():'';
    const first=at(iFirst),last=at(iLast);
    const full=at(iFull)||`${first} ${last}`.trim();
    const email=at(iEmail).toLowerCase();
    const phone=normalisePhone(at(iMobile))??normalisePhone(at(iTel));
    if(!full){skipped++;continue}
    if(email.endsWith('@example.com')){skipped++;problems.push(`${full}: test record skipped`);continue}
    const freshaId=at(iId)||null;
    // De-duplicate within one file by contact route, keeping the first occurrence.
    const key=(phone||email||full.toLowerCase());
    if(seen.has(key)){skipped++;problems.push(`${full}: duplicate of an earlier row in this file`);continue}
    seen.add(key);
    const input:ClientInput={
      fresha_id:freshaId,first_name:first,last_name:last,full_name:full,
      phone,email:email||null,
      accepts_marketing:at(iMkt).toLowerCase()==='yes',accepts_sms:at(iSms).toLowerCase()==='yes',
      fresha_added:/^\d{4}-\d{2}-\d{2}$/.test(at(iAdded))?at(iAdded):null,
      source:at(iSrc)||null,
    };
    if(!phone&&!email)problems.push(`${full}: imported with no phone or email`);
    const result=await upsertClient(input);
    if(result==='inserted')inserted++;else updated++;
  }
  const stats=await countClients();
  return Response.json({ok:true,inserted,updated,skipped,problems:problems.slice(0,40),stats});
}

// Link or unlink a client record to an app account.
export async function PUT(request:Request){
  if(!(await isAdmin()))return Response.json({error:'Admin sign-in required'},{status:401});
  if(!process.env.DATABASE_URL)return Response.json({error:'Database not configured'},{status:503});
  const {clientId,customerId}=await request.json() as {clientId?:number;customerId?:number|null};
  if(!clientId)return Response.json({error:'Which client?'},{status:400});
  await setClientCustomer(clientId,customerId??null);
  return Response.json({ok:true});
}

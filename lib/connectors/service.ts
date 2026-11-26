import {pool,once,addMoneyEntry} from '../db';
import {seal,open,connectorsEnabled} from './crypto';
import {PROVIDERS,providerById} from './registry';
import {ConnectionError,type Credentials,type Meta} from './types';

// Stored connections. Secrets are sealed (encrypted) before they reach the database;
// only the non-secret label (account name, ids) is kept in the clear.
function ready(){return once('connections',async()=>{await pool().query(`CREATE TABLE IF NOT EXISTS connections (
  provider TEXT PRIMARY KEY,
  sealed TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  last_result TEXT,
  last_error TEXT)`)})}

type Row={provider:string;sealed:string;meta:Meta;connected_at:string;last_sync_at:string|null;last_result:string|null;last_error:string|null};
async function row(id:string):Promise<Row|null>{await ready();const {rows}=await pool().query('SELECT * FROM connections WHERE provider=$1',[id]);return rows[0]??null}

// SumUp set up the earlier way (a Railway variable) still counts as connected.
const envSumUp=()=>process.env.SUMUP_API_KEY?.trim()||'';

export type ConnectionStatus={id:string;name:string;category:string;auth:string;blurb:string;keyLabel?:string;keySteps?:string[];
  available:boolean;verified:boolean;connected:boolean;account?:string;connectedAt?:string;lastSync?:string|null;lastResult?:string|null;lastError?:string|null;viaRailway?:boolean};

export async function listConnections():Promise<{enabled:boolean;items:ConnectionStatus[]}>{
  await ready();
  const {rows}=await pool().query('SELECT provider,meta,connected_at,last_sync_at,last_result,last_error FROM connections');
  const by=new Map(rows.map((r:Omit<Row,'sealed'>)=>[r.provider,r]));
  return {enabled:connectorsEnabled(),items:PROVIDERS.map(p=>{
    const r=by.get(p.id);
    const viaRailway=p.id==='sumup'&&!r&&Boolean(envSumUp());
    return {id:p.id,name:p.name,category:p.category,auth:p.auth,blurb:p.blurb,keyLabel:p.keyLabel,keySteps:p.keySteps,
      available:p.available()&&(p.auth==='apikey'?connectorsEnabled()||viaRailway:connectorsEnabled()),
      verified:p.verified===true,connected:Boolean(r)||viaRailway,account:r?.meta?.account??(viaRailway?'Set up in Railway':undefined),
      connectedAt:r?.connected_at,lastSync:r?.last_sync_at??null,lastResult:r?.last_result??null,lastError:r?.last_error??null,viaRailway};
  })};
}

export async function saveConnection(id:string,cred:Credentials,meta:Meta){
  await ready();
  await pool().query(`INSERT INTO connections(provider,sealed,meta) VALUES($1,$2,$3)
    ON CONFLICT(provider) DO UPDATE SET sealed=EXCLUDED.sealed,meta=EXCLUDED.meta,connected_at=NOW(),last_error=NULL`,[id,seal(cred),JSON.stringify(meta)]);
}
export async function removeConnection(id:string){await ready();await pool().query('DELETE FROM connections WHERE provider=$1',[id])}

export async function connectWithKey(id:string,key:string){
  const p=providerById(id);
  if(!p||p.auth!=='apikey'||!p.connectKey)throw new ConnectionError('That system is connected by signing in, not with a key.');
  if(!key.trim())throw new ConnectionError('Paste the key first.');
  const {cred,meta}=await p.connectKey(key.trim());
  await saveConnection(id,cred,meta);
  return meta;
}

export type SyncOutcome={id:string;name:string;added:number;error?:string};
export async function syncOne(id:string,now=new Date()):Promise<SyncOutcome>{
  const p=providerById(id);
  if(!p)return {id,name:id,added:0,error:'Unknown system'};
  let r=await row(id);
  let cred:Credentials,meta:Meta;
  if(r){cred=open<Credentials>(r.sealed);meta=r.meta}
  else if(id==='sumup'&&envSumUp()){
    const m=process.env.SUMUP_MERCHANT_CODE?.trim();
    const fresh=m?{cred:{key:envSumUp()},meta:{merchant_code:m,account:m}}:await p.connectKey!(envSumUp());
    cred=fresh.cred;meta=fresh.meta;
    if(connectorsEnabled()){await saveConnection(id,cred,meta);r=await row(id)}
  }
  else return {id,name:p.name,added:0,error:'Not connected'};
  // Look back a few days past the last update: a payment can change after it is made.
  const last=r?.last_sync_at?new Date(r.last_sync_at):null;
  const since=last?new Date(last.getTime()-3*24*60*60*1000):new Date(now.getTime()-400*24*60*60*1000);
  try{
    const entries=await p.sync({cred,meta,since,now,updateCred:async c=>{if(r)await pool().query('UPDATE connections SET sealed=$2 WHERE provider=$1',[id,seal(c)])}});
    let added=0;
    for(const e of entries){if(await addMoneyEntry({...e,source:id}))added++}
    if(r)await pool().query('UPDATE connections SET last_sync_at=$2,last_result=$3,last_error=NULL WHERE provider=$1',[id,now.toISOString(),`${added} new`]);
    return {id,name:p.name,added};
  }catch(e){
    const msg=e instanceof Error?e.message:'Could not update';
    if(r)await pool().query('UPDATE connections SET last_error=$2 WHERE provider=$1',[id,msg]);
    return {id,name:p.name,added:0,error:msg};
  }
}

export async function syncAll():Promise<SyncOutcome[]>{
  const {items}=await listConnections();
  const out:SyncOutcome[]=[];
  for(const c of items.filter(i=>i.connected))out.push(await syncOne(c.id));
  return out;
}

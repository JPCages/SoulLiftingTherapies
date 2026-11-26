import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

// Connection keys and tokens are stored encrypted (AES-256-GCM). The key that
// unlocks them lives only in Railway (CONNECTOR_SECRET), never in the database.
function key():Buffer{
  const s=process.env.CONNECTOR_SECRET?.trim();
  if(!s||s.length<32)throw new Error('Connections are not switched on for this site yet (CONNECTOR_SECRET is missing).');
  return createHash('sha256').update(s).digest();
}
export function connectorsEnabled(){const s=process.env.CONNECTOR_SECRET?.trim();return Boolean(s&&s.length>=32)}

export function seal(value:unknown):string{
  const iv=randomBytes(12);
  const c=createCipheriv('aes-256-gcm',key(),iv);
  const body=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);
  return ['v1',iv.toString('base64'),c.getAuthTag().toString('base64'),body.toString('base64')].join('.');
}
export function open<T>(sealed:string):T{
  const [v,iv,tag,body]=sealed.split('.');
  if(v!=='v1'||!iv||!tag||!body)throw new Error('Unreadable connection details');
  const d=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));
  d.setAuthTag(Buffer.from(tag,'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(body,'base64')),d.final()]).toString('utf8')) as T;
}

// The "state" sent to a provider when connecting, so the reply can be trusted:
// which provider, when, and a random value also kept in a short-lived cookie.
export function signState(provider:string,nonce:string,at=Date.now()):string{
  const payload=`${provider}.${nonce}.${at}`;
  return `${payload}.${createHmac('sha256',key()).update('connect:'+payload).digest('hex')}`;
}
export function checkState(state:string,nonce:string|undefined,maxAgeMs=15*60*1000,now=Date.now()):string|null{
  const parts=state.split('.');
  if(parts.length!==4||!nonce)return null;
  const [provider,n,at,sig]=parts;
  const want=createHmac('sha256',key()).update(`connect:${provider}.${n}.${at}`).digest('hex');
  if(sig.length!==want.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(want)))return null;
  if(n!==nonce)return null;
  const age=now-Number(at);
  if(!Number.isFinite(age)||age<0||age>maxAgeMs)return null;
  return provider;
}

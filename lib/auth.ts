import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
const COOKIE='soul_admin';
export const ADMIN_TOKEN_MAX_AGE_MS=12*60*60*1000;

// A placeholder is only ever handed out while `next build` is running, so pages can be
// analysed without a secret. It is random per process, so nothing signed with it verifies later.
let buildSecret:string|undefined;
export function getAuthSecret():string{
  const secret=process.env.AUTH_SECRET;
  if(secret)return secret;
  if(process.env.NEXT_PHASE==='phase-production-build')return buildSecret??=randomBytes(32).toString('hex');
  throw new Error('AUTH_SECRET is not set');
}

/** Constant-time string comparison. Length is compared first; unequal lengths are simply false. */
export function safeEqual(a:string,b:string):boolean{
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length===right.length&&timingSafeEqual(left,right);
}

// --- signed tokens: `${subject}.${issuedAt}.${hmac(kind, subject.issuedAt)}` ---
function signature(kind:string,payload:string){return createHmac('sha256',getAuthSecret()).update(`${kind}:${payload}`).digest('hex')}
export function signToken(kind:string,subject:string,issuedAt=Date.now()):string{
  const payload=`${subject}.${issuedAt}`;
  return `${payload}.${signature(kind,payload)}`;
}
/** Returns the subject when the signature is valid and the token is younger than `maxAgeMs`, else null. */
export function verifyToken(kind:string,token:string|undefined,maxAgeMs:number,now=Date.now()):string|null{
  if(!token)return null;
  const sigAt=token.lastIndexOf('.');
  if(sigAt<1)return null;
  const payload=token.slice(0,sigAt),sig=token.slice(sigAt+1);
  const issuedAtDot=payload.lastIndexOf('.');
  if(issuedAtDot<1)return null;
  const subject=payload.slice(0,issuedAtDot),issuedAt=Number(payload.slice(issuedAtDot+1));
  if(!Number.isInteger(issuedAt))return null;
  if(!safeEqual(sig,signature(kind,payload)))return null;
  const age=now-issuedAt;
  if(age<0||age>maxAgeMs)return null;
  return subject;
}

export function createAdminToken(email:string){return signToken('admin',email)}
export function verifyAdminToken(token?:string){
  const email=verifyToken('admin',token,ADMIN_TOKEN_MAX_AGE_MS);
  if(email===null)return false;
  const adminEmail=process.env.ADMIN_EMAIL??'';
  return adminEmail!==''&&email.toLowerCase()===adminEmail.toLowerCase();
}
export async function isAdmin(){return verifyAdminToken((await cookies()).get(COOKIE)?.value)}
export async function requireAdmin(){if(!(await isAdmin()))redirect('/login?admin=1')}
export const adminCookie=COOKIE;

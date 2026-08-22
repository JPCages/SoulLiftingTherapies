import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';

export const CUSTOMER_COOKIE='soul_customer';
function secret(){return process.env.AUTH_SECRET??'development-only-change-me'}

// --- password hashing (scrypt) ---
export function hashPassword(password:string):string{
  const salt=randomBytes(16).toString('hex');
  const hash=scryptSync(password,salt,64).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password:string,stored:string):boolean{
  const [salt,hash]=stored.split(':');
  if(!salt||!hash)return false;
  const test=scryptSync(password,salt,64);
  const expected=Buffer.from(hash,'hex');
  return test.length===expected.length&&timingSafeEqual(test,expected);
}

// --- signed session token carrying the customer id ---
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('hex')}
export function createCustomerToken(id:number){return `${id}.${sign('customer:'+id)}`}
export function verifyCustomerToken(token?:string):number|null{
  if(!token)return null;
  const dot=token.indexOf('.');
  if(dot<1)return null;
  const id=token.slice(0,dot), sig=token.slice(dot+1), expected=sign('customer:'+id);
  if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
  const n=Number(id);
  return Number.isInteger(n)?n:null;
}
export async function currentCustomerId():Promise<number|null>{
  return verifyCustomerToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
}

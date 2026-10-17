import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {signToken,verifyToken} from './auth';

export const CUSTOMER_COOKIE='soul_customer';
export const CUSTOMER_TOKEN_MAX_AGE_MS=30*24*60*60*1000;

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

// --- signed session token carrying the customer id and issue time (see lib/auth.ts) ---
export function createCustomerToken(id:number){return signToken('customer',String(id))}
export function verifyCustomerToken(token?:string):number|null{
  const id=verifyToken('customer',token,CUSTOMER_TOKEN_MAX_AGE_MS);
  if(id===null)return null;
  const n=Number(id);
  return Number.isInteger(n)?n:null;
}
export async function currentCustomerId():Promise<number|null>{
  return verifyCustomerToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
}

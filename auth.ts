import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
const COOKIE='soul_admin';
function secret(){return process.env.AUTH_SECRET??'development-only-change-me'}
function signature(value:string){return createHmac('sha256',secret()).update(value).digest('hex')}
export function createAdminToken(email:string){return `${email}.${signature(email)}`}
export function verifyAdminToken(token?:string){if(!token)return false;const split=token.lastIndexOf('.');if(split<1)return false;const email=token.slice(0,split),sig=token.slice(split+1),expected=signature(email);return sig.length===expected.length&&timingSafeEqual(Buffer.from(sig),Buffer.from(expected))&&email.toLowerCase()===(process.env.ADMIN_EMAIL??'').toLowerCase()}
export async function isAdmin(){return verifyAdminToken((await cookies()).get(COOKIE)?.value)}
export async function requireAdmin(){if(!(await isAdmin()))redirect('/login?admin=1')}
export const adminCookie=COOKIE;

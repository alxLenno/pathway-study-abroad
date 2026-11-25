import{createHmac,timingSafeEqual,scryptSync}from'node:crypto';
export function ready(env){return typeof env.ADMIN_PASSWORD==='string'&&env.ADMIN_PASSWORD.length>=16}
const signature=(value,env)=>createHmac('sha256',env.ADMIN_PASSWORD).update(value).digest('base64url');
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function validPassword(password,env){if(!ready(env)||typeof password!=='string'||password.length>256)return false;return timingSafeEqual(scryptSync(password,'pathway-admin',32),scryptSync(env.ADMIN_PASSWORD,'pathway-admin',32))}
export function sessionCookie(env){const expires=String(Date.now()+8*60*60*1000);const value=expires+'.'+signature(expires,env);return`pathway_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`}
export function validSession(request,env){if(!ready(env))return false;const value=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('pathway_admin='))?.slice(14);if(!value)return false;const[expires,sig]=value.split('.');if(!expires||!sig||!/^\d+$/.test(expires)||Number(expires)<Date.now()||Number(expires)>Date.now()+28800000)return false;return equal(sig,signature(expires,env))}
export const logoutCookie='pathway_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';

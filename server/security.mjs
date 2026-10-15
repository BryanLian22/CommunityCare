import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) {
 const salt=randomBytes(16).toString('hex');
 const key=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 return `${salt}:${key.toString('hex')}`;
}
export async function checkPassword(password,stored) {
 const [salt,hash]=stored.split(':');
 const actual=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 const expected=Buffer.from(hash,'hex');
 return expected.length===actual.length && timingSafeEqual(expected,actual);
}
export const passwordValid = value => typeof value==='string' && value.length>=12 && value.length<=128;

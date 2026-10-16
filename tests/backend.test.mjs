import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const folder=mkdtempSync(join(tmpdir(),'communitycare-test-'));
process.env.DATABASE_PATH=join(folder,'test.sqlite');
const {server}=await import('../server/app.mjs');
const {db}=await import('../server/db.mjs');
const {hashPassword}=await import('../server/security.mjs');
const {DatabaseSync}=await import('node:sqlite');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/api`;
const password='Resident example pass 123';
function client(){let cookie='';return {get cookie(){return cookie},async request(path,method='GET',body,headers={}){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-CommunityCare-Request':'1','Origin':'http://localhost:5173',Cookie:cookie,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,data:await r.json(),headers:r.headers}}}}
const a=client(),b=client(),admin=client();let aid,bid,booking,report,service,notice;
try {
await test('reject anonymous and cross-origin writes',async()=>{
 assert.equal((await a.request('/data')).status,401);
 assert.equal((await a.request('/auth/register','POST',{name:'A',email:'a@test.local',password},{Origin:'https://attacker.invalid'})).status,403);
 assert.equal((await a.request('/auth/register','POST',{}, {'X-CommunityCare-Request':''})).status,403);
});
await test('register residents with hashed passwords; role injection cannot grant admin',async()=>{
 const r=await a.request('/auth/register','POST',{name:'Alice',email:'ALICE@example.test',password,role:'admin'});assert.equal(r.status,201);aid=r.data.user.id;assert.equal(r.data.user.role,'resident');assert(!JSON.stringify(r.data).includes('password'));assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);
 const stored=db.prepare('SELECT password_hash FROM users WHERE id=?').get(aid);assert.notEqual(stored.password_hash,password);assert.equal(stored.password_hash.split(':')[1].length,128);
 const other=await b.request('/auth/register','POST',{name:'Bob',email:'bob@example.test',password});assert.equal(other.status,201);bid=other.data.user.id;
 assert.equal((await b.request('/auth/register','POST',{name:'Duplicate',email:'alice@example.test',password})).status,409);
 assert.equal((await a.request('/admin/data')).status,403);
});
await test('login errors and server session restoration',async()=>{
 const c=client();assert.equal((await c.request('/auth/login','POST',{email:'alice@example.test',password:'wrong password 123'})).status,401);
 assert.equal((await c.request('/auth/login','POST',{email:'alice@example.test',password})).status,200);
 assert.equal((await c.request('/auth/me')).data.user.id,aid);
 await c.request('/auth/logout','POST',{});assert.equal((await c.request('/auth/me')).status,401);
});
await test('unique facility slots, account isolation, invalid dates, and ownership checks',async()=>{
 assert.equal((await a.request('/records/bookings','POST',{facility:'Gym',date:'2099-02-30',time:'9:00 AM'})).status,400);
 const r=await a.request('/records/bookings','POST',{facility:'Gym',date:'2099-12-01',time:'9:00 AM',userId:bid,status:'approved'});assert.equal(r.status,201);booking=r.data.record.id;assert.equal(r.data.record.userId,aid);assert.equal(r.data.record.status,'pending');
 assert.equal((await b.request('/records/bookings','POST',{facility:'Gym',date:'2099-12-01',time:'9:00 AM'})).status,409);
 assert.equal((await b.request('/data')).data.bookings.length,0);
 assert.equal((await b.request(`/records/bookings/${booking}`,'DELETE',{})).status,404);
 assert.equal((await a.request('/records/services','POST',{service:'Locksmith',date:'2099-12-01',time:'9:00 AM',address:''})).status,400);
 service=(await a.request('/records/services','POST',{service:'Locksmith',date:'2099-12-01',time:'9:00 AM',address:'Tower B'})).data.record.id;
 report=(await a.request('/records/reports','POST',{category:'Accessibility barrier',details:'Lift entrance blocked.'})).data.record.id;
 const contact=await a.request('/records/contacts','POST',{name:'Family',phone:'+60123456789'});assert.equal(contact.status,201);assert.equal((await b.request('/data')).data.contacts.length,0);
});
await test('admin account, moderation, notice publication, and private contacts',async()=>{
 const id=randomUUID();db.prepare("INSERT INTO users(id,name,email,password_hash,role,created) VALUES(?,?,?,?,'admin',?)").run(id,'Manager','manager@example.test',await hashPassword(password),new Date().toISOString());
 assert.equal((await admin.request('/auth/login','POST',{email:'manager@example.test',password})).data.user.role,'admin');
 const d=(await admin.request('/admin/data')).data;assert.equal(d.bookings.length,1);assert.equal(d.reports.length,1);assert.equal(d.services.length,1);assert.equal(d.contacts,undefined);
 assert.equal((await a.request(`/admin/records/${booking}`,'PATCH',{status:'approved'})).status,403);
 assert.equal((await admin.request(`/admin/records/${booking}`,'PATCH',{status:'approved'})).status,200);
 assert.equal((await a.request('/data')).data.bookings[0].status,'approved');
 await admin.request(`/admin/records/${report}`,'PATCH',{status:'in_progress'});assert.equal((await a.request('/data')).data.reports[0].status,'in_progress');
 await admin.request(`/admin/records/${service}`,'PATCH',{status:'completed'});assert.equal((await a.request(`/records/services/${service}`,'DELETE',{})).status,409);
 const n=await admin.request('/admin/notices','POST',{title:'Lift maintenance',body:'Lift A is closed tomorrow.'});assert.equal(n.status,201);notice=n.data.id;
 assert.equal((await a.request('/data')).data.notices[0].title,'Lift maintenance');
 await a.request('/notices/read','POST',{});assert((await a.request('/data')).data.noticesReadAt);
 await admin.request(`/admin/notices/${notice}`,'PATCH',{title:'Lift reopened',body:'Lift A is available.'});assert.equal((await b.request('/data')).data.notices[0].title,'Lift reopened');
 assert.equal((await admin.request(`/admin/users/${id}`,'PATCH',{active:false})).status,403);
});
await test('cancelled booking frees its slot and records persist on disk',async()=>{
 assert.equal((await a.request(`/records/bookings/${booking}`,'DELETE',{})).status,200);
 assert.equal((await b.request('/records/bookings','POST',{facility:'Gym',date:'2099-12-01',time:'9:00 AM'})).status,201);
 const reader=new DatabaseSync(process.env.DATABASE_PATH);assert.equal(reader.prepare('SELECT status FROM records WHERE id=?').get(booking).status,'cancelled');reader.close();
 assert.equal((await admin.request(`/admin/records/${booking}`,'PATCH',{status:'approved'})).status,409);
});
await test('profile persistence, password change revokes old sessions, and disabled accounts lose access',async()=>{
 await a.request('/profile','PATCH',{name:'Alice Updated',largeText:true,contrast:true});assert.equal((await a.request('/auth/me')).data.user.name,'Alice Updated');
 const second=client();await second.request('/auth/login','POST',{email:'alice@example.test',password});
 assert.equal((await a.request('/auth/password','POST',{currentPassword:password,password:'New resident pass 456'})).status,200);assert.equal((await second.request('/data')).status,401);assert.equal((await a.request('/data')).status,200);
 await admin.request(`/admin/users/${bid}`,'PATCH',{active:false});assert.equal((await b.request('/data')).status,401);assert.equal((await b.request('/auth/login','POST',{email:'bob@example.test',password})).status,401);
 await admin.request(`/admin/users/${bid}`,'PATCH',{active:true});assert.equal((await b.request('/auth/login','POST',{email:'bob@example.test',password})).status,200);
 const previous=a.cookie;await a.request('/auth/logout','POST',{});assert.equal((await a.request('/data','GET',undefined,{Cookie:previous})).status,401);
 assert(db.prepare('SELECT COUNT(*) n FROM audit_log').get().n>=5);
});
await test('shared directory is admin-editable, persists, and does not overwrite existing data on restart',async()=>{
 const initial=(await b.request('/data')).data.communityContacts;assert.equal(initial.length,2);assert(initial.every(c=>c.phone===''));
 const details={name:'Management Office',phone:'+60 3 1234 5678',hours:'Mon–Fri, 9 AM–5 PM',description:'Resident enquiries'};
 assert.equal((await b.request('/admin/community-contacts/management','PATCH',details)).status,403);
 assert.equal((await admin.request('/admin/community-contacts/management','PATCH',{...details,phone:'invalid'})).status,400);
 assert.equal((await admin.request('/admin/community-contacts/management','PATCH',details)).status,200);
 assert.equal((await admin.request('/admin/community-contacts/guard','PATCH',{name:'Guard House',phone:'+60387654321',hours:'24 hours',description:'Security assistance'})).status,200);
 const rows=(await b.request('/data')).data.communityContacts;assert.equal(rows.find(c=>c.id==='management').phone,'+60312345678');assert.equal(rows.find(c=>c.id==='guard').phone,'+60387654321');
 db.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 const reader=new DatabaseSync(process.env.DATABASE_PATH);assert.equal(reader.prepare("SELECT phone FROM community_contacts WHERE id='management'").get().phone,'+60312345678');reader.close();
 assert.equal((await admin.request('/admin/community-contacts/guard','PATCH',{name:'Guard House',phone:'',hours:'',description:''})).status,200);
 assert.equal((await b.request('/data')).data.communityContacts.find(c=>c.id==='guard').phone,'');
});
await test('personal contact edits are owner-only and persist',async()=>{
 const r=await b.request('/records/contacts','POST',{name:'Original',phone:'0123456789'});const id=r.data.record.id;
 assert.equal((await admin.request(`/records/contacts/${id}`,'PATCH',{name:'Wrong owner',phone:'0123456789'})).status,404);
 assert.equal((await b.request(`/records/contacts/${id}`,'PATCH',{name:'Caregiver',phone:'+60123456789'})).status,200);
 assert.equal((await b.request('/data')).data.contacts.find(c=>c.id===id).name,'Caregiver');
});
await test('login throttling',async()=>{const c=client();for(let i=0;i<12;i++)await c.request('/auth/login','POST',{email:'limited@example.test',password});assert.equal((await c.request('/auth/login','POST',{email:'limited@example.test',password})).status,429)});
}finally{await new Promise(resolve=>server.close(resolve));db.close();rmSync(folder,{recursive:true,force:true})}

import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, publicUser } from './db.mjs';
import { hashPassword, checkPassword, digest, passwordValid } from './security.mjs';
const now=()=>new Date().toISOString();
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const secure=process.env.COOKIE_SECURE==='true';
const allowedOrigins=new Set((process.env.APP_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001').split(',').map(s=>s.trim()));
if(process.env.NODE_ENV==='production' && (!secure || !process.env.APP_ORIGIN?.startsWith('https://'))) throw new Error('Production requires COOKIE_SECURE=true and an HTTPS APP_ORIGIN.');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
function text(value,label,max=2000){if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(400,`${label} is required (maximum ${max} characters).`);return value.trim()}
function email(value){const e=text(value,'Email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))fail(400,'Enter a valid email address.');return e}
function choice(v,values){if(!values.includes(v))fail(400,'Invalid selection.');return v}
function appointment(b){const date=text(b.date,'Date',10), time=choice(b.time,['9:00 AM','10:30 AM','2:00 PM','4:30 PM']);const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<today)fail(400,'Choose a valid date today or later.');return {date,time}}
const kinds=['bookings','reports','contacts','services'];
function facilityByName(name){const f=db.prepare('SELECT * FROM facilities WHERE name=?').get(name);if(!f)fail(404,'Facility not found.');return f}
function facilityList(){return db.prepare('SELECT * FROM facilities ORDER BY created,name').all().map(f=>({...f,isOpen:!!f.is_open,closureReason:f.closure_reason}))}
function facilityDetails(b){return {category:text(b.category,'Category',50),description:text(b.description,'Description',240),icon:choice(b.icon,['fitness','wellness','sports']),isOpen:typeof b.isOpen==='boolean'?b.isOpen:fail(400,'Choose open or closed.'),closureReason:b.isOpen?'':text(b.closureReason,'Closure reason',300)}}
const bookingTimes=['9:00 AM','10:30 AM','2:00 PM','4:30 PM'];
const bookingClock={'9:00 AM':'09:00','10:30 AM':'10:30','2:00 PM':'14:00','4:30 PM':'16:30'};
function bookingStart(date,time){return Date.parse(`${date}T${bookingClock[time]}:00+08:00`)}
function validateBookingDate(value){const date=text(value,'Date',10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)fail(400,'Choose a valid date.');return date}
function bookingAvailability(facility,date){const config=facilityByName(facility);const booked=db.prepare("SELECT booking_time FROM records WHERE kind='bookings' AND facility=? AND booking_date=? AND status IN ('pending','approved')").all(facility,date);return bookingTimes.map(time=>({time,available:!!config.is_open&&bookingStart(date,time)>Date.now()&&!booked.some(r=>r.booking_time===time),reason:!config.is_open?'Closed for maintenance':bookingStart(date,time)<=Date.now()?'Past time':booked.some(r=>r.booking_time===time)?'Reserved':''}))}
function payload(kind,b){
 if(kind==='bookings'){const f=facilityByName(text(b.facility,'Facility',80));if(!f.is_open)fail(409,'This facility is closed: '+f.closure_reason);const p={facility:f.name,...appointment(b)};if(bookingStart(p.date,p.time)<=Date.now())fail(400,'This booking time has already started. Choose a future slot.');return {...p,history:[{status:'pending',at:now(),note:'Booking submitted for approval.'}]}}
 if(kind==='reports')return {category:choice(b.category,['Maintenance issue','Suspicious activity','Mailbox password attempts','Door or gate tampering','Accessibility barrier','Noise or disturbance']),details:text(b.details,'Details')};
 if(kind==='contacts'){const phone=text(b.phone,'Phone',30).replace(/[ ()-]/g,'');if(!/^\+?[0-9]{6,15}$/.test(phone))fail(400,'Enter a valid phone number.');return {name:text(b.name,'Name',80),phone}}
 return {service:choice(b.service,['Air conditioner','Door repair','Locksmith','General repair']),address:text(b.address,'Address',200),...appointment(b)};
}
function record(r){return {...JSON.parse(r.payload),id:r.id,created:r.created,status:r.status,userId:r.user_id,...(r.resident_name?{residentName:r.resident_name,residentEmail:r.resident_email}:{})}}
function audit(u,action,id){db.prepare('INSERT INTO audit_log(actor_id,action,target_id,created) VALUES(?,?,?,?)').run(u.id,action,id,now())}
function assistance(r){return {...r,history:JSON.parse(r.history)}}
function assistanceList(userId){return db.prepare('SELECT a.*,u.name residentName,u.email residentEmail FROM assistance_requests a JOIN users u ON u.id=a.user_id '+(userId?'WHERE a.user_id=? ':'')+'ORDER BY a.created DESC').all(...(userId?[userId]:[])).map(assistance)}
function notifications(userId){return db.prepare('SELECT id,title,body,request_id requestId,audience,created,read_at readAt FROM notifications WHERE user_id=? ORDER BY created DESC,id DESC').all(userId)}
function notifyUser(userId,title,body,requestId,audience){db.prepare('INSERT INTO notifications(id,user_id,title,body,request_id,audience,created) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),userId,title,body,requestId,audience,now())}
function notifyAdmins(title,body,requestId){for(const admin of db.prepare("SELECT id FROM users WHERE role='admin' AND active=1").all())notifyUser(admin.id,title,body,requestId,'admin')}
function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
const assistanceTypes=['Wheelchair / mobility support','Shopping / carrying groceries','Transport assistance','Home maintenance','Other assistance'];
const assistanceNext={pending:['accepted','rejected','cancelled'],accepted:['in_progress','cancelled'],in_progress:['completed','cancelled'],completed:[],rejected:[],cancelled:[]};
const limits=new Map();
function throttle(key,max){const t=Date.now();if(limits.size>10000)for(const [k,v]of limits)if(v.until<t)limits.delete(k);const v=limits.get(key);if(!v||v.until<t){limits.set(key,{count:1,until:t+15*60*1000});return}if(v.count>=max)fail(429,'Too many attempts. Try again in 15 minutes.');v.count++}
function cookie(token,age=8*60*60){return `cc_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`}
function session(req){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('cc_session='))?.slice(11);if(!token)return null;return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1').get(digest(token),Date.now())}
function createSession(res,u){db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),u.id,Date.now()+8*3600000);res.setHeader('Set-Cookie',cookie(token));return publicUser(u)}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Use application/json.');let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>16384)fail(413,'Request too large.')}try{const b=JSON.parse(data||'{}');if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'Invalid JSON.');return b}catch{fail(400,'Invalid JSON.')}}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 try{
 const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
 if(!path.startsWith('/api/')){
  if(!['GET','HEAD'].includes(method))fail(405,'Method not allowed.');
  const target=resolve(dist,'.'+decodeURIComponent(path));if(target!==resolve(dist)&&!target.startsWith(resolve(dist)+sep))fail(403,'Forbidden.');
  let file=target;try{if(!(await stat(file)).isFile())file=resolve(dist,'index.html')}catch{if(extname(path))fail(404,'File not found.');file=resolve(dist,'index.html')}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
  const content=await readFile(file).catch(()=>fail(404,'Build the app first: npm.cmd run build'));
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});return res.end(method==='HEAD'?undefined:content);
 }
 if(!['GET','HEAD'].includes(method)){
  if(req.headers['x-communitycare-request']!=='1')fail(403,'Invalid request header.');
  if(req.headers.origin && !allowedOrigins.has(req.headers.origin))fail(403,'Origin is not allowed.');
  if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Cross-site request rejected.');
 }
 if(path==='/api/health'&&method==='GET')return send(res,200,{ok:true});
 if(['/api/auth/register','/api/auth/login'].includes(path)&&method==='POST'){
  throttle('ip:'+req.socket.remoteAddress,40);const b=await body(req);const e=email(b.email);throttle('email:'+e,12);
  if(!passwordValid(b.password))fail(400,'Use a password between 12 and 128 characters.');
  if(path.endsWith('/register')){
   const name=text(b.name,'Name',80);if(db.prepare('SELECT id FROM users WHERE email=?').get(e))fail(409,'An account with this email already exists.');
   const hash=await hashPassword(b.password),id=randomUUID();
   try{db.prepare('INSERT INTO users(id,name,email,password_hash,created) VALUES(?,?,?,?,?)').run(id,name,e,hash,now())}catch(err){if(String(err.message).includes('UNIQUE'))fail(409,'An account with this email already exists.');throw err}
   return send(res,201,{user:createSession(res,db.prepare('SELECT * FROM users WHERE id=?').get(id))});
  }
  const u=db.prepare('SELECT * FROM users WHERE email=?').get(e);
  // Always perform the expensive hash, including for an unknown account.
  const valid=await checkPassword(b.password,u?.password_hash||'00000000000000000000000000000000:'+ '00'.repeat(64));
  if(!valid||!u?.active)fail(401,'Email or password is incorrect, or the account is inactive.');
  return send(res,200,{user:createSession(res,u)});
 }
 if(path==='/api/auth/logout'&&method==='POST'){
  const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('cc_session='))?.slice(11);
  if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));res.setHeader('Set-Cookie',cookie('',0));return send(res,200,{ok:true});
 }
 const u=session(req);if(!u)fail(401,'Please sign in.');
 if(path==='/api/auth/me'&&method==='GET')return send(res,200,{user:publicUser(u)});
 if(path==='/api/profile'&&method==='PATCH'){
  const b=await body(req);const name=text(b.name,'Name',80);if(typeof b.largeText!=='boolean'||typeof b.contrast!=='boolean')fail(400,'Invalid settings.');
  db.prepare('UPDATE users SET name=?,large_text=?,contrast=? WHERE id=?').run(name,+b.largeText,+b.contrast,u.id);return send(res,200,{user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(u.id))});
 }
 if(path==='/api/auth/password'&&method==='POST'){
  throttle('password:'+u.id,10);const b=await body(req);if(typeof b.currentPassword!=='string'||b.currentPassword.length>128||!passwordValid(b.password))fail(400,'New password must contain 12–128 characters.');
  if(!await checkPassword(b.currentPassword,u.password_hash))fail(400,'Current password is incorrect.');
  const hash=await hashPassword(b.password);db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);createSession(res,u);return send(res,200,{ok:true});
 }
 if(path==='/api/facilities'&&method==='GET')return send(res,200,{facilities:facilityList()});
 if(path==='/api/bookings/availability'&&method==='GET'){
  const f=facilityByName(text(url.searchParams.get('facility'),'Facility',80)),facility=f.name,date=validateBookingDate(url.searchParams.get('date'));
  return send(res,200,{facility,date,isOpen:!!f.is_open,closureReason:f.closure_reason,timeZone:'Asia/Kuala_Lumpur',slots:bookingAvailability(facility,date)});
 }
 if(path==='/api/data'&&method==='GET'){
  const rows=db.prepare('SELECT * FROM records WHERE user_id=? ORDER BY created DESC').all(u.id);
  const data=Object.fromEntries(kinds.map(k=>[k,rows.filter(r=>r.kind===k).map(record)]));
  return send(res,200,{...data,facilities:facilityList(),notifications:notifications(u.id).filter(n=>n.audience==='resident'),assistance:assistanceList(u.id),notices:db.prepare('SELECT id,title,body,created,updated FROM notices ORDER BY updated DESC').all(),communityContacts:db.prepare("SELECT id,name,phone,hours,description,updated FROM community_contacts ORDER BY CASE id WHEN 'management' THEN 0 ELSE 1 END").all(),noticesReadAt:u.notices_read_at});
 }
 if(path==='/api/notifications'&&method==='GET')return send(res,200,{notifications:notifications(u.id)});
 const notificationMatch=path.match(/^\/api\/notifications\/(all|[a-zA-Z0-9-]+)\/read$/);
 if(notificationMatch&&method==='POST'){
  if(notificationMatch[1]==='all'){
   const b=await body(req);if(!Array.isArray(b.ids)||b.ids.length>500||b.ids.some(id=>typeof id!=='string'||id.length>100))fail(400,'Invalid notification selection.');
   transaction(()=>{for(const id of b.ids)db.prepare("UPDATE notifications SET read_at=? WHERE id=? AND user_id=? AND read_at=''").run(now(),id,u.id)});
  }else{
   const result=db.prepare("UPDATE notifications SET read_at=CASE WHEN read_at='' THEN ? ELSE read_at END WHERE id=? AND user_id=?").run(now(),notificationMatch[1],u.id);
   if(!result.changes)fail(404,'Notification not found.');
  }
  return send(res,200,{ok:true});
 }
 if(path==='/api/assistance'&&method==='POST'){
  const b=await body(req),id=randomUUID(),t=now();
  const category=choice(b.category,assistanceTypes),location=text(b.location,'Location',200),details=text(b.details,'Details',2000);
  const history=JSON.stringify([{status:'pending',at:t,note:'Request submitted.',assignee:''}]);
  transaction(()=>{db.prepare('INSERT INTO assistance_requests(id,user_id,category,location,details,history,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,u.id,category,location,details,history,t,t);notifyAdmins('New assistance request',`${u.name} requested ${category.toLowerCase()} at ${location}.`,id)});
  return send(res,201,{id});
 }
 const assistanceMatch=path.match(/^\/api\/(admin\/)?assistance\/([a-zA-Z0-9-]+)$/);
 if(assistanceMatch&&method==='PATCH'){
  const admin=!!assistanceMatch[1];if(admin&&u.role!=='admin')fail(403,'Administrator access required.');
  const b=await body(req);
  // Read after awaiting the body so another update cannot invalidate authorization/state checks.
  const r=db.prepare('SELECT * FROM assistance_requests WHERE id=?').get(assistanceMatch[2]);
  if(!r||(!admin&&r.user_id!==u.id))fail(404,'Request not found.');
  if(b.revision!==r.revision)fail(409,'This request changed. Refresh and try again.');
  if(!assistanceNext[r.status].length)fail(409,'This request is closed.');
  const status=admin?choice(b.status,[r.status,...assistanceNext[r.status]]):choice(b.status,['cancelled']);
  if(!admin&&!['pending','accepted'].includes(r.status))fail(409,'Work has started. Contact management to arrange cancellation.');
  let assignee=r.assignee,note='Cancelled by resident.';
  if(admin){
   if(typeof b.assignee!=='string'||b.assignee.trim().length>100||typeof b.note!=='string'||b.note.trim().length>1000)fail(400,'Invalid staff name or update note.');
   assignee=b.assignee.trim();note=b.note.trim();
   if(['accepted','in_progress','completed'].includes(status)&&!assignee)fail(400,'Assign a staff member before accepting or progressing this request.');
   if(['rejected','cancelled'].includes(status)&&!note)fail(400,'Enter a reason for the resident.');
   if(status===r.status&&assignee===r.assignee&&note===r.note) return send(res,200,{ok:true});
  }
  const t=now(),history=JSON.parse(r.history);history.push({status,at:t,assignee,note});
  transaction(()=>{db.prepare('UPDATE assistance_requests SET status=?,assignee=?,note=?,history=?,revision=revision+1,updated=? WHERE id=?').run(status,assignee,note,JSON.stringify(history),t,r.id);
  audit(u,admin?'update assistance':'cancel assistance',r.id);if(admin)notifyUser(r.user_id,'Assistance request updated',`${r.category}: ${status.replaceAll('_',' ')}.${assignee?' Assigned to '+assignee+'.':''}${note?' '+note:''}`,r.id,'resident');else notifyAdmins('Assistance request cancelled',`${u.name} cancelled ${r.category.toLowerCase()}.`,r.id)});return send(res,200,{ok:true});
 }
 if(path==='/api/notices/read'&&method==='POST'){db.prepare('UPDATE users SET notices_read_at=? WHERE id=?').run(now(),u.id);return send(res,200,{ok:true})}
 const match=path.match(/^\/api\/records\/(bookings|reports|contacts|services)(?:\/([a-zA-Z0-9-]+))?$/);
 if(match){const [,kind,id]=match;
  if(method==='POST'&&!id){const p=payload(kind,await body(req));const id=randomUUID(),created=now();
   try{db.prepare('INSERT INTO records(id,user_id,kind,payload,status,created,facility,booking_date,booking_time) VALUES(?,?,?,?,?,?,?,?,?)').run(id,u.id,kind,JSON.stringify(p),kind==='contacts'?'active':'pending',created,p.facility||null,kind==='bookings'?p.date:null,kind==='bookings'?p.time:null)}catch(err){if(String(err.message).includes('UNIQUE'))fail(409,'This facility slot is already reserved. Choose another time.');throw err}
   return send(res,201,{record:record(db.prepare('SELECT * FROM records WHERE id=?').get(id))});
  }
  if(method==='PATCH'&&kind==='contacts'&&id){
   const existing=db.prepare("SELECT id FROM records WHERE id=? AND user_id=? AND kind='contacts'").get(id,u.id);
   if(!existing)fail(404,'Contact not found.');
   const p=payload('contacts',await body(req));db.prepare('UPDATE records SET payload=? WHERE id=?').run(JSON.stringify(p),id);
   return send(res,200,{ok:true});
  }
  if(method==='DELETE'&&id){const r=db.prepare('SELECT * FROM records WHERE id=? AND user_id=? AND kind=?').get(id,u.id,kind);if(!r)fail(404,'Record not found.');
   if(kind==='contacts')db.prepare('DELETE FROM records WHERE id=?').run(id);
   else {if(['completed','resolved','cancelled','rejected'].includes(r.status))fail(409,'This record is already closed.');
    if(kind==='bookings'){const p=JSON.parse(r.payload);if(bookingStart(p.date,p.time)<=Date.now())fail(409,'This booking has started. Contact management to arrange cancellation.');p.history=[...(p.history||[]),{status:'cancelled',at:now(),note:'Cancelled by resident.'}];db.prepare("UPDATE records SET status='cancelled',payload=? WHERE id=?").run(JSON.stringify(p),id);audit(u,'cancel booking',id)}
    else db.prepare("UPDATE records SET status='cancelled' WHERE id=?").run(id)}
   return send(res,200,{ok:true});
  }
 }
 if(path.startsWith('/api/admin/')){
  if(u.role!=='admin')fail(403,'Administrator access required.');
  if(path==='/api/admin/data'&&method==='GET'){
   const users=db.prepare('SELECT * FROM users ORDER BY created DESC').all().map(publicUser);
   const rows=db.prepare("SELECT r.*,u.name resident_name,u.email resident_email FROM records r JOIN users u ON u.id=r.user_id WHERE r.kind!='contacts' ORDER BY r.created DESC").all();
   return send(res,200,{facilities:facilityList(),notifications:notifications(u.id),assistance:assistanceList(),communityContacts:db.prepare('SELECT id,name,phone,hours,description,updated FROM community_contacts ORDER BY id DESC').all(),users,bookings:rows.filter(r=>r.kind==='bookings').map(record),reports:rows.filter(r=>r.kind==='reports').map(record),services:rows.filter(r=>r.kind==='services').map(record),notices:db.prepare('SELECT id,title,body,created,updated FROM notices ORDER BY updated DESC').all()});
  }
  if(path==='/api/admin/facilities'&&method==='POST'){
   const b=await body(req),f=facilityDetails(b),name=text(b.name,'Facility name',80),id=randomUUID(),t=now();
   try{transaction(()=>{db.prepare('INSERT INTO facilities(id,name,category,description,icon,is_open,closure_reason,created,updated) VALUES(?,?,?,?,?,?,?,?,?)').run(id,name,f.category,f.description,f.icon,+f.isOpen,f.closureReason,t,t);audit(u,'create facility',id)})}catch(e){if(String(e.message).includes('UNIQUE'))fail(409,'A facility with this name already exists.');throw e}
   return send(res,201,{id});
  }
  const facilityMatch=path.match(/^\/api\/admin\/facilities\/([a-zA-Z0-9-]+)$/);
  if(facilityMatch&&method==='PATCH'){
   const b=await body(req),f=facilityDetails(b),existing=db.prepare('SELECT * FROM facilities WHERE id=?').get(facilityMatch[1]);
   if(!existing)fail(404,'Facility not found.');if(b.revision!==existing.revision)fail(409,'Facility changed. Refresh before saving.');
   transaction(()=>{db.prepare('UPDATE facilities SET category=?,description=?,icon=?,is_open=?,closure_reason=?,revision=revision+1,updated=? WHERE id=?').run(f.category,f.description,f.icon,+f.isOpen,f.closureReason,now(),existing.id);audit(u,f.isOpen?'update/open facility':'close facility',existing.id)});
   return send(res,200,{ok:true});
  }
  const directoryMatch=path.match(/^\/api\/admin\/community-contacts\/(management|guard)$/);
  if(directoryMatch&&method==='PATCH'){
   const b=await body(req),name=text(b.name,'Contact name',80);
   if(typeof b.phone!=='string'||b.phone.length>30||typeof b.hours!=='string'||b.hours.length>120||typeof b.description!=='string'||b.description.length>240)fail(400,'Invalid contact details.');
   const phone=b.phone.trim().replace(/[ ()-]/g,'');if(phone&&!/^\+?[0-9]{6,15}$/.test(phone))fail(400,'Enter a valid phone number, or leave it blank.');
   db.prepare('UPDATE community_contacts SET name=?,phone=?,hours=?,description=?,updated=?,updated_by=? WHERE id=?').run(name,phone,b.hours.trim(),b.description.trim(),now(),u.id,directoryMatch[1]);
   audit(u,'update community contact',directoryMatch[1]);return send(res,200,{ok:true});
  }
  const userMatch=path.match(/^\/api\/admin\/users\/([a-zA-Z0-9-]+)$/);
  if(userMatch&&method==='PATCH'){const b=await body(req);if(typeof b.active!=='boolean')fail(400,'Invalid account status.');const target=db.prepare('SELECT * FROM users WHERE id=?').get(userMatch[1]);if(!target)fail(404,'Resident not found.');if(target.role==='admin')fail(403,'Admin accounts cannot be disabled here.');db.prepare('UPDATE users SET active=? WHERE id=?').run(+b.active,target.id);if(!b.active)db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id);audit(u,b.active?'activate resident':'disable resident',target.id);return send(res,200,{ok:true})}
  const recMatch=path.match(/^\/api\/admin\/records\/([a-zA-Z0-9-]+)$/);
  if(recMatch&&method==='PATCH'){
   const b=await body(req);const r=db.prepare("SELECT * FROM records WHERE id=? AND kind!='contacts'").get(recMatch[1]);if(!r)fail(404,'Record not found.');
   if(['cancelled','completed','resolved','rejected'].includes(r.status))fail(409,'This record is closed.');
   const status=choice(b.status,r.kind==='reports'?['pending','in_progress','resolved','rejected']:['pending','approved','completed','rejected','cancelled']);
   if(r.kind==='bookings'){
    if(b.expectedStatus!==r.status)fail(409,'Booking changed. Refresh before updating.');
    const transitions={pending:['approved','rejected','cancelled'],approved:['completed','cancelled']};
    if(!transitions[r.status]?.includes(status))fail(400,'Invalid booking status transition.');
    const p=JSON.parse(r.payload),start=bookingStart(p.date,p.time);
    if(status==='approved'&&!facilityByName(p.facility).is_open)fail(409,'This facility is closed. Reopen it before approving a booking.');
    if(status==='approved'&&start<=Date.now())fail(409,'This slot has passed and cannot be approved. Reject or cancel it.');
    if(status==='completed'&&start>Date.now())fail(409,'A future booking cannot be marked completed.');
    const note=b.note===undefined?'':typeof b.note==='string'&&b.note.trim().length<=1000?b.note.trim():fail(400,'Update note must be at most 1000 characters.');
    if(['rejected','cancelled'].includes(status)&&!note)fail(400,'Enter a reason for the resident.');
    p.note=note;p.history=[...(p.history||[]),{status,at:now(),note}];
    try{db.prepare('UPDATE records SET status=?,payload=? WHERE id=?').run(status,JSON.stringify(p),r.id)}catch(err){if(String(err.message).includes('UNIQUE'))fail(409,'Facility slot conflict.');throw err}
   }else{try{db.prepare('UPDATE records SET status=? WHERE id=?').run(status,r.id)}catch(err){if(String(err.message).includes('UNIQUE'))fail(409,'Facility slot conflict.');throw err}}
   audit(u,'set status '+status,r.id);return send(res,200,{ok:true});
  }
  const noticeMatch=path.match(/^\/api\/admin\/notices(?:\/([a-zA-Z0-9-]+))?$/);
  if(noticeMatch){const id=noticeMatch[1];
   if(method==='POST'&&!id){const b=await body(req),nid=randomUUID(),t=now();db.prepare('INSERT INTO notices VALUES(?,?,?,?,?,?)').run(nid,text(b.title,'Title',120),text(b.body,'Notice',4000),u.id,t,t);audit(u,'publish notice',nid);return send(res,201,{id:nid})}
   if(['PATCH','DELETE'].includes(method)&&id){if(!db.prepare('SELECT id FROM notices WHERE id=?').get(id))fail(404,'Notice not found.');if(method==='DELETE')db.prepare('DELETE FROM notices WHERE id=?').run(id);else{const b=await body(req);db.prepare('UPDATE notices SET title=?,body=?,updated=? WHERE id=?').run(text(b.title,'Title',120),text(b.body,'Notice',4000),now(),id)}audit(u,method==='DELETE'?'delete notice':'edit notice',id);return send(res,200,{ok:true})}
  }
 }
 fail(404,'Endpoint not found.');
 }catch(err){if(!res.headersSent)send(res,err.status||500,{error:err.status?err.message:'Server error. Please try again.'});if(!err.status)console.error(err.message)}
});
server.requestTimeout=15000;server.headersTimeout=10000;

import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
process.env.DATABASE_PATH = ':memory:';
const { server } = await import('../server/app.mjs');
const { db } = await import('../server/db.mjs');
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
function client() {
  let cookie = '';
  return async (path, method = 'GET', body) => {
    const r = await fetch(base + path, { method, headers: { cookie, 'Content-Type': 'application/json', 'X-CommunityCare-Request': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    return { status: r.status, data: await r.json() };
  };
}
const resident = client(), other = client(), admin = client();
try {
  const r = await resident('/auth/register','POST',{ name:'Resident',email:'resident@map.test',password:'Password-long-12345' });
  await other('/auth/register','POST',{name:'Other',email:'other@map.test',password:'Password-long-12345'});
  const a = await admin('/auth/register','POST',{name:'Admin',email:'admin@map.test',password:'Password-long-12345'});
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(a.data.user.id);
  const today = (await resident('/household')).data.today;
  await test('Bills are private; admin records exact partial payments and prevents overpayment',async()=>{
    const payload = {user_id:r.data.user.id,kind:'electricity',period:today.slice(0,7),due_date:today,amount_cents:12345,note:'Unit A-12',client_key:'bill-create-1'};
    assert.equal((await resident('/admin/bills','POST',payload)).status,403);
    const created = await admin('/admin/bills','POST',payload);
    assert.equal(created.status,200);
    assert.equal((await admin('/admin/bills','POST',payload)).data.bill.id,created.data.bill.id);
    assert.equal((await other('/household')).data.bills.length,0);
    let own = (await resident('/household')).data.bills[0];
    assert.equal(own.outstanding_cents,12345);
    const url='/admin/bills/'+own.id;
    assert.equal((await admin(url,'PATCH',{revision:own.revision,action:'payment',amount_cents:2345,note:'Receipt 1'})).status,200);
    assert.equal((await admin(url,'PATCH',{revision:own.revision,action:'payment',amount_cents:2345,note:'Duplicate stale payment'})).status,409);
    own=(await resident('/household')).data.bills[0];
    assert.equal(own.outstanding_cents,10000);
    assert.equal(own.payment_status,'part_paid');
    assert.equal((await admin(url,'PATCH',{revision:own.revision,action:'payment',amount_cents:10001,note:'Too much'})).status,400);
    assert.equal((await admin(url,'PATCH',{revision:own.revision,action:'void',note:'Cannot void paid bill'})).status,409);
    assert.equal((await admin(url,'PATCH',{revision:own.revision,action:'payment',amount_cents:10000,note:'Receipt 2'})).status,200);
    assert.equal((await resident('/household')).data.bills[0].outstanding_cents,0);
    assert.equal((await admin('/admin/bills','POST',{...payload,amount_cents:1.5,client_key:'invalid-cents'})).status,400);
  });
  await test('QR pass issuance is idempotent, private and one-entry only',async()=>{
    const payload={visitor_name:'Guest',phone:'+60123456789',plate:'WXY 1234',visit_date:today,client_key:'visit-1'};
    const result=await resident('/visitor-passes','POST',payload);
    assert.equal(result.status,200);
    let p=result.data.pass;
    assert.equal(p.plate,'WXY1234'); assert.equal(p.token.length,48);
    assert.equal((await resident('/visitor-passes','POST',payload)).data.pass.id,p.id);
    assert.equal((await resident('/visitor-passes','POST',{...payload,client_key:'visit-duplicate'})).status,409);
    assert.equal((await other('/household')).data.passes.length,0);
    assert.equal((await other(`/visitor-passes/${p.id}/cancel`,'POST',{revision:1})).status,404);
    assert.equal((await resident('/admin/visitor-passes/verify','POST',{token:p.token})).status,403);
    assert.equal((await admin('/admin/visitor-passes/verify','POST',{token:p.token})).data.pass.can_enter,true);
    const png=await QRCode.toDataURL('https://example.test/?visitor_pass='+p.token,{width:300,margin:4});
    assert.match(png,/^data:image\/png;base64,/);
    const url='/admin/visitor-passes/'+p.id;
    const entered=await admin(url,'PATCH',{action:'check_in',revision:p.revision});
    assert.equal(entered.status,200);p=entered.data.pass;
    assert.equal((await admin(url,'PATCH',{action:'check_in',revision:p.revision})).status,409);
    const exited=await admin(url,'PATCH',{action:'check_out',revision:p.revision});
    assert.equal(exited.status,200);
    assert.equal((await admin('/admin/visitor-passes/verify','POST',{token:p.token})).data.pass.can_enter,false);
  });
  await test('Cancelled, future and expired visitor passes cannot check in',async()=>{
    const future=new Date(Date.parse(today)+86400000).toISOString().slice(0,10);
    let p=(await resident('/visitor-passes','POST',{visitor_name:'Future guest',phone:'0123456789',plate:'ABC9999',visit_date:future,client_key:'future-1'})).data.pass;
    assert.equal((await admin('/admin/visitor-passes/'+p.id,'PATCH',{action:'check_in',revision:p.revision})).status,409);
    assert.equal((await resident('/visitor-passes/'+p.id+'/cancel','POST',{revision:p.revision})).status,200);
    assert.equal((await admin('/admin/visitor-passes/verify','POST',{token:p.token})).data.pass.effective_status,'cancelled');
    assert.equal((await resident('/visitor-passes','POST',{visitor_name:'Bad date',phone:'0123456789',plate:'BAD123',visit_date:'2026-02-30',client_key:'bad'})).status,400);
    p=(await resident('/visitor-passes','POST',{visitor_name:'Expired test',phone:'0123456789',plate:'EXP123',visit_date:today,client_key:'expiry'})).data.pass;
    db.prepare('UPDATE visitor_passes SET visit_date=? WHERE id=?').run('2020-01-01',p.id);
    const expired=await admin('/admin/visitor-passes/verify','POST',{token:p.token});
    assert.equal(expired.data.pass.effective_status,'expired');assert.equal(expired.data.pass.can_enter,false);
    assert.equal((await admin('/admin/visitor-passes/'+p.id,'PATCH',{action:'check_in',revision:p.revision})).status,409);
  });
} finally { await new Promise(resolve=>server.close(resolve)); db.close(); }

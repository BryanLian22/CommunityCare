import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import CloseButton from './CloseButton';
import './DemoPayment.css';
export type DemoTransaction = { id: string; bill_id: string; method: string; outcome: string; amount_cents: number; created: string; resident_name?: string };
const money = (c: number) => new Intl.NumberFormat('en-MY',{ style:'currency',currency:'MYR' }).format(c/100);
const methods: Record<string,string> = { card:'Demo card · 4242', bank:'Demo online banking', wallet:'Demo e-wallet' };
export function downloadDemoReceipt(p: DemoTransaction) {
  const text = `COMMUNITYCARE — DEMO PAYMENT RECORD\nNOT PROOF OF REAL PAYMENT\n\nReference: DEMO-${p.id}\nBill: ${p.bill_id}\nResult: ${p.outcome}\nAmount: ${money(p.amount_cents)}\nMethod: ${methods[p.method]}\nDate: ${new Date(p.created).toLocaleString('en-MY', { timeZone:'Asia/Kuala_Lumpur' })} (Malaysia)\n\nSimulated transaction only. No money moved. The resident and admin bill balances reflect this simulated payment.\n`;
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href=url; a.download=`DEMO-${p.id}.txt`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function DemoPayment({ bill, close, onSaved }: { bill: { id: string; revision: number; outstanding_cents: number; title: string; period: string }; close:()=>void; onSaved:()=>void }) {
  const dialog=useRef<HTMLDialogElement>(null), lock=useRef(false), request=useRef(crypto.randomUUID());
  const [method,setMethod]=useState('card'),[outcome,setOutcome]=useState('success'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<DemoTransaction|null>(null);
  const [attempt,setAttempt]=useState<{method:string;outcome:string}|null>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>previous?.focus();},[]);
  async function pay() {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    const values=attempt||{method,outcome};setAttempt(values);
    try {
      const r=await api<{payment:DemoTransaction}>('/demo-payments','POST',{bill_id:bill.id,revision:bill.revision,amount_cents:bill.outstanding_cents,client_key:request.current,...values});
      setResult(r.payment);onSaved();
    }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  }
  return createPortal(<dialog ref={dialog} className="demo-checkout" aria-labelledby="demo-title" onCancel={e=>{e.preventDefault();if(!busy)close();}} onKeyDown={e=>e.stopPropagation()}>
    <header><span className="demo-badge">SIMULATED PAYMENT</span><CloseButton disabled={busy} onClick={close}/></header>
    {!result ? <><h2 id="demo-title">Pay your bill</h2><p className="demo-muted">Demo checkout. No real money will be charged.</p>
      <div className="demo-order"><small>{bill.title} · {bill.period}</small><strong>{money(bill.outstanding_cents)}</strong><span>Total demo payment · MYR</span></div>
      <fieldset disabled={busy||!!attempt}><legend>Payment method</legend>{Object.entries(methods).map(([key,label])=><label className="demo-method" key={key}><input type="radio" name="demo-method" value={key} checked={method===key} onChange={()=>setMethod(key)}/><span><b>{label}</b><small>{key==='card'?'Sample card — no card details needed':key==='bank'?'Simulated bank authorisation':'Simulated wallet authorisation'}</small></span></label>)}</fieldset>
      <label className="demo-outcome">Demo result<select disabled={busy||!!attempt} value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="success">Successful payment</option><option value="failed">Payment declined</option><option value="cancelled">Payment cancelled</option></select></label>
      {error&&<p className="demo-error" role="alert">{error} Retry checks the same payment attempt.</p>}
      <button className="demo-pay" disabled={busy} onClick={()=>void pay()}>{busy?'Processing demo…':attempt?'Retry this attempt':`Pay ${money(bill.outstanding_cents)} · Demo`}</button>
      <p className="demo-muted">Uses sample payment methods only. Successful demo payments update the resident and admin bill balances. No bank is connected.</p></> : <div className="demo-result" role="status"><div className={`demo-result-icon ${result.outcome}`}>{result.outcome==='success'?'✓':result.outcome==='failed'?'!':'−'}</div><h2 id="demo-title">{result.outcome==='success'?'Demo payment successful':result.outcome==='failed'?'Demo payment declined':'Demo payment cancelled'}</h2><strong>{money(result.amount_cents)}</strong><p>{result.outcome==='success'?'Your bill balance and the admin balance have been updated.':'Your demo balance has not changed.'} No money was charged.</p><dl><dt>Method</dt><dd>{methods[result.method]}</dd><dt>Reference</dt><dd>DEMO-{result.id}</dd><dt>Date</dt><dd>{new Date(result.created).toLocaleString('en-MY')}</dd></dl><button className="demo-pay" onClick={()=>downloadDemoReceipt(result)}>Download demo {result.outcome==='success'?'receipt':'record'}</button><button className="demo-back" onClick={close}>Back to bills</button></div>}
  </dialog>,document.body);
}
export function DemoPaymentHistory() {
  const [items,setItems]=useState<DemoTransaction[]>([]),[error,setError]=useState('');
  async function refresh(){try{const r=await api<{payments:DemoTransaction[]}>('/admin/demo-payments');setItems(r.payments);setError('');}catch(e){setError((e as Error).message);}}
  useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),15000);return()=>clearInterval(id);},[]);
  return <section className="hh-admin-card demo-admin"><div className="hh-heading"><h3>Demo transactions</h3><button onClick={()=>void refresh()}>Refresh</button></div><p>Simulated records only. Successful attempts update bill balances and are labelled as demo payments in bill history. No money was received.</p>{error&&<p role="alert">{error}</p>}{!items.length&&!error&&<p>No demo transactions yet.</p>}{items.map(p=><article key={p.id}><b>{p.resident_name} · {money(p.amount_cents)}</b><span>{p.outcome} · {methods[p.method]}</span><small>{new Date(p.created).toLocaleString()} · Bill {p.bill_id}</small><button onClick={()=>downloadDemoReceipt(p)}>Demo record</button></article>)}</section>;
}

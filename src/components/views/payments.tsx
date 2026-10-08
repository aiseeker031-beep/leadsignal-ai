'use client';
import {useState} from 'react';import Link from 'next/link';
import {CreditCard,Plus,Package,FileText,ShoppingCart,Check,X} from 'lucide-react';
import {useCrm,contactById,contactName,money,uid,invoiceTotal,type Row} from '@/lib/crm';
import {Field,Modal,Stat} from '@/components/ui/crm-ui';

const gateways=['Stripe','PayPal','Square'];
export default function PaymentsView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [tab,setTab]=useState('invoices'),[newInvoice,setNewInvoice]=useState(false),[newProduct,setNewProduct]=useState(false),[newForm,setNewForm]=useState(false);
 const paid=db.invoices.filter(i=>i.status==='paid'),mrr=db.products.filter(p=>p.type==='subscription').reduce((a,p)=>a+p.price,0);
 function markPaid(id:string){set(d=>{const i=d.invoices.find(x=>x.id===id);if(i)i.status='paid'});pushNotice('Payment recorded.')}
 function createInvoice(fd:Row){const n='INV-'+(1044+db.invoices.length);set(d=>d.invoices.unshift({id:uid(),contactId:fd.contactId,number:n,items:[{desc:fd.desc||'Services rendered',qty:+fd.qty||1,price:+fd.price||0}],status:'sent',due:new Date(Date.now()+14*864e5).toISOString(),gateway:fd.gateway||'Stripe'}));setNewInvoice(false);pushNotice(n+' sent — collect via '+fd.gateway+'.')}
 return <>
  <div className="stats">
   <Stat label="Collected" value={money(paid.reduce((a,i)=>a+invoiceTotal(i),0))} caption="All-time payments"/>
   <Stat label="Outstanding" value={money(db.invoices.filter(i=>i.status!=='paid').reduce((a,i)=>a+invoiceTotal(i),0))} caption={db.invoices.filter(i=>i.status==='overdue').length+' overdue'} color="orange"/>
   <Stat label="Recurring (MRR)" value={money(mrr)} caption="Subscription products" color="violet"/>
   <Stat label="Gateways" value={gateways.length} caption="Stripe · PayPal · Square" color="green"/>
  </div>
  <div className="crm-tabs">{[['invoices','Invoices'],['products','Products'],['forms','Order forms']].map(([v,label])=><button key={v} className={tab===v?'selected':''} onClick={()=>setTab(v)}>{label}</button>)}
   <span className="crm-tabs-right">{tab==='invoices'&&<button className="button primary" onClick={()=>setNewInvoice(true)}><Plus size={14}/>New invoice</button>}{tab==='products'&&<button className="button primary" onClick={()=>setNewProduct(true)}><Plus size={14}/>New product</button>}{tab==='forms'&&<button className="button primary" onClick={()=>setNewForm(true)}><Plus size={14}/>New order form</button>}</span>
  </div>
  {tab==='invoices'&&<section className="card"><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Contact</th><th>Items</th><th>Total</th><th>Gateway</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>{db.invoices.map(i=><tr key={i.id}><td><strong>{i.number}</strong></td><td><Link href={'/contacts?open='+i.contactId}>{contactName(contactById(db,i.contactId))}</Link></td><td>{i.items.map(it=><small key={it.desc} style={{display:'block'}}>{it.desc} × {it.qty}</small>)}</td><td><strong>{money(invoiceTotal(i))}</strong></td><td>{i.gateway}</td><td>{new Date(i.due).toLocaleDateString()}</td><td><span className={'badge '+(i.status==='paid'?'green':i.status==='overdue'?'red':'')}>{i.status}</span></td><td>{i.status!=='paid'&&<button className="text-link" onClick={()=>markPaid(i.id)}><Check size={13}/>Mark paid</button>}</td></tr>)}</tbody></table></div></section>}
  {tab==='products'&&<div className="funnel-grid">{db.products.map(p=><section className="card" key={p.id}>
   <div className="card-title"><h3><Package size={16}/>{p.name}</h3><span className={'badge '+(p.type==='subscription'?'green':'')}>{p.type==='subscription'?'recurring':'one-time'}</span></div>
   <p className="muted">{p.description}</p>
   <div className="product-price"><strong>{money(p.price)}</strong><span>{p.type==='subscription'?'/mo':'once'}</span><span className="badge">{p.gateway}</span></div>
  </section>)}</div>}
  {tab==='forms'&&<div className="funnel-grid">{db.orderForms.map(f=>{const p=db.products.find(x=>x.id===f.productId);return <section className="card" key={f.id}>
   <div className="card-title"><h3><ShoppingCart size={16}/>{f.name}</h3><span className="badge">{p?.gateway||'Stripe'}</span></div>
   <p className="muted">Sells: {p?.name||'—'} · {money(p?.price||0)}</p>
   <div className="chips">{f.fields.map(x=><span key={x}>{x}</span>)}</div>
   <div className="product-price"><strong>{f.orders}</strong><span>orders</span><small>{f.views} form views · {f.views?Math.round(f.orders/f.views*100):0}% conversion</small></div>
  </section>})}</div>}
  {newInvoice&&<Modal title="New invoice" subtitle="Email it with a payment link — card, PayPal or Square." onClose={()=>setNewInvoice(false)}>
   <form onSubmit={e=>{e.preventDefault();createInvoice(Object.fromEntries(new FormData(e.currentTarget) as any))}}>
    <Field label="Contact"><select name="contactId">{db.contacts.map(c=><option key={c.id} value={c.id}>{contactName(c)}</option>)}</select></Field>
    <Field label="Line item description"><input name="desc" required placeholder="Growth retainer — April"/></Field>
    <div className="two-col"><Field label="Quantity"><input name="qty" type="number" min={1} defaultValue={1}/></Field><Field label="Unit price (USD)"><input name="price" type="number" min={0} step="0.01" required/></Field></div>
    <Field label="Gateway"><select name="gateway">{gateways.map(g=><option key={g}>{g}</option>)}</select></Field>
    <button className="button primary" type="submit"><FileText size={14}/>Create & send</button></form></Modal>}
  {newProduct&&<Modal title="New product" subtitle="One-time or subscription — sells on any funnel or order form." onClose={()=>setNewProduct(false)}>
   <form onSubmit={e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.currentTarget) as any);set(d=>d.products.unshift({id:uid(),name:fd.name,price:+fd.price,type:fd.type,gateway:fd.gateway,description:fd.description||''}));setNewProduct(false);pushNotice('Product created.')}}>
    <Field label="Product name"><input name="name" required/></Field>
    <Field label="Description"><input name="description" placeholder="Short sales description"/></Field>
    <div className="two-col"><Field label="Price (USD)"><input name="price" type="number" min={0} step="0.01" required/></Field><Field label="Type"><select name="type"><option value="one_time">One-time</option><option value="subscription">Subscription</option></select></Field></div>
    <Field label="Gateway"><select name="gateway">{gateways.map(g=><option key={g}>{g}</option>)}</select></Field>
    <button className="button primary" type="submit">Create product</button></form></Modal>}
  {newForm&&<Modal title="New order form" subtitle="A hosted checkout page for any product." onClose={()=>setNewForm(false)}>
   <form onSubmit={e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.currentTarget) as any);set(d=>d.orderForms.unshift({id:uid(),name:fd.name,productId:fd.productId,fields:['Name','Email','Card'],views:0,orders:0}));setNewForm(false);pushNotice('Order form created — share the link anywhere.')}}>
    <Field label="Form name"><input name="name" required/></Field>
    <Field label="Product"><select name="productId">{db.products.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}</select></Field>
    <button className="button primary" type="submit">Create form</button></form></Modal>}
 </>;
}

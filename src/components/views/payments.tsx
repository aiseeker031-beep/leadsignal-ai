'use client';
import {useState} from 'react';
import Link from 'next/link';
import {CreditCard,Plus,Package,FileText,ShoppingCart,Check,Trash2} from 'lucide-react';
import {useCrm,contactById,contactName,money,uid,invoiceTotal,type Row} from '@/lib/crm';
import {Field,Modal,Stat} from '@/components/ui/crm-ui';

const gateways=['Stripe','PayPal','Square'];

export default function PaymentsView({pushNotice}:{pushNotice:(m:string)=>void}){
  const {db,set}=useCrm();
  const [tab,setTab]=useState('invoices');
  const [newInvoice,setNewInvoice]=useState(false);
  const [newProduct,setNewProduct]=useState(false);
  const [newForm,setNewForm]=useState(false);

  const paid=db.invoices.filter(i=>i.status==='paid');
  const mrr=db.products.filter(p=>p.type==='subscription').reduce((a,p)=>a+p.price,0);

  function markPaid(id:string){
    set(d=>{
      const i=d.invoices.find(x=>x.id===id);
      if(i)i.status='paid';
    });
    pushNotice('Payment recorded.');
  }

  function deleteInvoice(id:string){
    set(d=>d.invoices=d.invoices.filter(i=>i.id!==id));
    pushNotice('Invoice deleted.');
  }

  function deleteProduct(id:string){
    set(d=>d.products=d.products.filter(p=>p.id!==id));
    pushNotice('Product removed.');
  }

  function deleteOrderForm(id:string){
    set(d=>d.orderForms=d.orderForms.filter(f=>f.id!==id));
    pushNotice('Order form removed.');
  }

  function createInvoice(fd:Row){
    const n='INV-'+(1044+db.invoices.length);
    set(d=>d.invoices.unshift({
      id:uid(),
      contactId:fd.contactId||'',
      number:n,
      items:[{desc:fd.desc||'Services rendered',qty:+fd.qty||1,price:+fd.price||0}],
      status:'sent',
      due:new Date(Date.now()+14*864e5).toISOString(),
      gateway:fd.gateway||'Stripe'
    }));
    setNewInvoice(false);
    pushNotice(n+' created — collect via '+(fd.gateway||'Stripe')+'.');
  }

  return (
    <>
      <div className="stats">
        <Stat label="Collected" value={money(paid.reduce((a,i)=>a+invoiceTotal(i),0))} caption="All-time payments"/>
        <Stat label="Outstanding" value={money(db.invoices.filter(i=>i.status!=='paid').reduce((a,i)=>a+invoiceTotal(i),0))} caption={db.invoices.filter(i=>i.status==='overdue').length+' overdue'} color="orange"/>
        <Stat label="Recurring (MRR)" value={money(mrr)} caption="Subscription products" color="violet"/>
        <Stat label="Gateways" value={gateways.length} caption="Stripe · PayPal · Square" color="green"/>
      </div>

      <div className="crm-tabs">
        {[['invoices','Invoices'],['products','Products'],['forms','Order forms']].map(([v,label])=>(
          <button key={v} className={tab===v?'selected':''} onClick={()=>setTab(v)}>{label}</button>
        ))}
        <span className="crm-tabs-right">
          {tab==='invoices'&&<button className="button primary" onClick={()=>setNewInvoice(true)}><Plus size={14}/>New invoice</button>}
          {tab==='products'&&<button className="button primary" onClick={()=>setNewProduct(true)}><Plus size={14}/>New product</button>}
          {tab==='forms'&&<button className="button primary" onClick={()=>setNewForm(true)}><Plus size={14}/>New order form</button>}
        </span>
      </div>

      {tab==='invoices'&&(
        <section className="card">
          {db.invoices.length>0?(
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th><th>Contact</th><th>Items</th><th>Total</th><th>Gateway</th><th>Due</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.invoices.map(i=>{
                    const c=i.contactId?contactById(db,i.contactId):undefined;
                    return (
                      <tr key={i.id}>
                        <td><strong>{i.number}</strong></td>
                        <td>
                          {i.contactId?(
                            <Link href={'/contacts?open='+i.contactId}>{contactName(c)}</Link>
                          ):(
                            <span>{contactName(c)}</span>
                          )}
                        </td>
                        <td>{i.items.map(it=><small key={it.desc} style={{display:'block'}}>{it.desc} × {it.qty}</small>)}</td>
                        <td><strong>{money(invoiceTotal(i))}</strong></td>
                        <td>{i.gateway}</td>
                        <td>{new Date(i.due).toLocaleDateString()}</td>
                        <td><span className={'badge '+(i.status==='paid'?'green':i.status==='overdue'?'red':'')}>{i.status}</span></td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            {i.status!=='paid'&&(
                              <button className="text-link" onClick={()=>markPaid(i.id)}>
                                <Check size={13}/>Mark paid
                              </button>
                            )}
                            <button
                              onClick={()=>deleteInvoice(i.id)}
                              style={{color:'#777f76',padding:4}}
                              title="Delete invoice"
                            >
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ):(
            <div className="empty" style={{padding:'36px 12px'}}>
              <span className="empty-icon"><FileText size={22}/></span>
              <h3>No invoices created yet</h3>
              <p>Create your first invoice with payment links for Stripe, PayPal, or Square.</p>
            </div>
          )}
        </section>
      )}

      {tab==='products'&&(
        db.products.length>0?(
          <div className="funnel-grid">
            {db.products.map(p=>(
              <section className="card" key={p.id}>
                <div className="card-title">
                  <h3><Package size={16}/>{p.name}</h3>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span className={'badge '+(p.type==='subscription'?'green':'')}>
                      {p.type==='subscription'?'recurring':'one-time'}
                    </span>
                    <button onClick={()=>deleteProduct(p.id)} style={{color:'#777f76',padding:3}} title="Delete product">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
                <p className="muted">{p.description||'No description provided.'}</p>
                <div className="product-price">
                  <strong>{money(p.price)}</strong>
                  <span>{p.type==='subscription'?'/mo':'once'}</span>
                  <span className="badge">{p.gateway}</span>
                </div>
              </section>
            ))}
          </div>
        ):(
          <section className="card">
            <div className="empty">
              <span className="empty-icon"><Package size={22}/></span>
              <h3>No products yet</h3>
              <p>Add subscription or one-time payment products to sell on checkout forms.</p>
            </div>
          </section>
        )
      )}

      {tab==='forms'&&(
        db.orderForms.length>0?(
          <div className="funnel-grid">
            {db.orderForms.map(f=>{
              const p=db.products.find(x=>x.id===f.productId);
              return (
                <section className="card" key={f.id}>
                  <div className="card-title">
                    <h3><ShoppingCart size={16}/>{f.name}</h3>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span className="badge">{p?.gateway||'Stripe'}</span>
                      <button onClick={()=>deleteOrderForm(f.id)} style={{color:'#777f76',padding:3}} title="Delete form">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                  <p className="muted">Sells: {p?.name||'General item'} · {money(p?.price||0)}</p>
                  <div className="chips">{f.fields.map(x=><span key={x}>{x}</span>)}</div>
                  <div className="product-price">
                    <strong>{f.orders}</strong>
                    <span>orders</span>
                    <small>{f.views} form views · {f.views?Math.round(f.orders/f.views*100):0}% conversion</small>
                  </div>
                </section>
              );
            })}
          </div>
        ):(
          <section className="card">
            <div className="empty">
              <span className="empty-icon"><ShoppingCart size={22}/></span>
              <h3>No order forms yet</h3>
              <p>Create a hosted checkout page to collect payments automatically.</p>
            </div>
          </section>
        )
      )}

      {newInvoice&&(
        <Modal title="New invoice" subtitle="Email it with a payment link — card, PayPal or Square." onClose={()=>setNewInvoice(false)}>
          <form onSubmit={e=>{e.preventDefault();createInvoice(Object.fromEntries(new FormData(e.currentTarget) as any));}}>
            <Field label="Contact">
              <select name="contactId">
                {db.contacts.length?(
                  db.contacts.map(c=><option key={c.id} value={c.id}>{contactName(c)} ({c.email||'No email'})</option>)
                ):(
                  <option value="">No contacts in CRM (Direct invoice)</option>
                )}
              </select>
            </Field>
            <Field label="Line item description">
              <input name="desc" required placeholder="Growth retainer — Monthly"/>
            </Field>
            <div className="two-col">
              <Field label="Quantity">
                <input name="qty" type="number" min={1} defaultValue={1}/>
              </Field>
              <Field label="Unit price (USD)">
                <input name="price" type="number" min={0} step="0.01" required placeholder="1500"/>
              </Field>
            </div>
            <Field label="Gateway">
              <select name="gateway">{gateways.map(g=><option key={g}>{g}</option>)}</select>
            </Field>
            <button className="button primary" type="submit">
              <FileText size={14}/>Create & send
            </button>
          </form>
        </Modal>
      )}

      {newProduct&&(
        <Modal title="New product" subtitle="One-time or subscription — sells on any funnel or order form." onClose={()=>setNewProduct(false)}>
          <form onSubmit={e=>{
            e.preventDefault();
            const fd=Object.fromEntries(new FormData(e.currentTarget) as any);
            set(d=>d.products.unshift({
              id:uid(),
              name:fd.name,
              price:+fd.price,
              type:fd.type,
              gateway:fd.gateway,
              description:fd.description||''
            }));
            setNewProduct(false);
            pushNotice('Product created.');
          }}>
            <Field label="Product name"><input name="name" required placeholder="AI Consulting Retainer"/></Field>
            <Field label="Description"><input name="description" placeholder="Short sales description"/></Field>
            <div className="two-col">
              <Field label="Price (USD)">
                <input name="price" type="number" min={0} step="0.01" required placeholder="997"/>
              </Field>
              <Field label="Type">
                <select name="type">
                  <option value="one_time">One-time</option>
                  <option value="subscription">Subscription</option>
                </select>
              </Field>
            </div>
            <Field label="Gateway">
              <select name="gateway">{gateways.map(g=><option key={g}>{g}</option>)}</select>
            </Field>
            <button className="button primary" type="submit">Create product</button>
          </form>
        </Modal>
      )}

      {newForm&&(
        <Modal title="New order form" subtitle="A hosted checkout page for any product." onClose={()=>setNewForm(false)}>
          {db.products.length>0?(
            <form onSubmit={e=>{
              e.preventDefault();
              const fd=Object.fromEntries(new FormData(e.currentTarget) as any);
              set(d=>d.orderForms.unshift({
                id:uid(),
                name:fd.name,
                productId:fd.productId||db.products[0]?.id||'',
                fields:['Name','Email','Card'],
                views:0,
                orders:0
              }));
              setNewForm(false);
              pushNotice('Order form created — share the link anywhere.');
            }}>
              <Field label="Form name"><input name="name" required placeholder="Checkout - Retainer Package"/></Field>
              <Field label="Product">
                <select name="productId">
                  {db.products.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}
                </select>
              </Field>
              <button className="button primary" type="submit">Create form</button>
            </form>
          ):(
            <div>
              <p className="muted" style={{marginBottom:18}}>You need at least one product before creating an order form.</p>
              <button className="button primary" onClick={()=>{setNewForm(false);setNewProduct(true);}}>
                Create a product first
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

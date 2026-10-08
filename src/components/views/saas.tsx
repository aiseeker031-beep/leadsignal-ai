'use client';
import {useState} from 'react';
import {Palette,Globe,Upload,Check,ChevronsUpDown,Plus,Building2} from 'lucide-react';
import {useCrm,money,initials,uid,type Row} from '@/lib/crm';
import {Field,Modal,Stat,Toggle} from '@/components/ui/crm-ui';

export default function SaaSView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [branding,setBranding]=useState(db.branding),[rebilling,setRebilling]=useState(true),[trial,setTrial]=useState(true),[adding,setAdding]=useState(false),[newPlan,setNewPlan]=useState(false);
 const mrr=db.subAccounts.reduce((a,s)=>a+s.mrr,0);
 function saveBranding(){set(d=>d.branding=branding);pushNotice('Branding saved — applied across the platform, portals and emails.')}
 function addPlan(fd:Row){set(d=>d.plans.push({id:uid(),name:fd.name,price:+fd.price||0,features:fd.features||'',subAccounts:+fd.accounts||3}));setNewPlan(false);pushNotice('Pricing tier created.')}
 function addSubAccount(fd:Row){set(d=>d.subAccounts.unshift({id:uid(),name:fd.name,plan:fd.plan,domain:fd.domain,status:'trial',mrr:0}));setAdding(false);pushNotice('Sub-account provisioned with its own dashboard.')}
 return <>
  <div className="stats">
   <Stat label="Agency MRR" value={money(mrr)} caption="Recurring from sub-accounts"/>
   <Stat label="Sub-accounts" value={db.subAccounts.length} caption="Client workspaces" color="violet"/>
   <Stat label="Plans" value={db.plans.length} caption="Your SaaS pricing tiers" color="orange"/>
   <Stat label="Mode" value="SaaS" caption="White-label enabled" color="green"/>
  </div>
  <div className="saas-grid">
   <section className="card"><div className="card-title"><h3><Palette size={16}/>White-label branding</h3></div>
    <p className="muted">Rebrand the entire platform — your logo, colors, domain and support email everywhere.</p>
    <Field label="Platform name"><input value={branding.name} onChange={e=>setBranding({...branding,name:e.target.value})}/></Field>
    <Field label="Tagline"><input value={branding.tagline} onChange={e=>setBranding({...branding,tagline:e.target.value})}/></Field>
    <div className="two-col"><Field label="Support email"><input type="email" value={branding.supportEmail} onChange={e=>setBranding({...branding,supportEmail:e.target.value})}/></Field><Field label="Custom domain"><input value={branding.domain} onChange={e=>setBranding({...branding,domain:e.target.value})}/></Field></div>
    <Field label="Brand color"><span className="color-row"><input type="color" aria-label="Brand color" value={branding.color} onChange={e=>setBranding({...branding,color:e.target.value})}/><span className="badge">{branding.color}</span></span></Field>
    <div className="domain-status"><Globe size={14}/>DNS: CNAME <code>cname.leadsignal.ai</code> → {branding.domain} <span className="badge green"><Check size={11}/>verified</span></div>
    <button className="button primary" onClick={saveBranding}><Upload size={14}/>Save branding</button>
   </section>
   <section className="card"><div className="card-title"><h3>Branded preview</h3></div>
    <div className="brand-preview" style={{['--pv' as string]:branding.color}}>
     <div className="brand-side"><span className="brand-mark" style={{background:branding.color}}>{initials(branding.name)}</span><strong>{branding.name}</strong><small>{branding.tagline}</small><nav>{['Dashboard','Contacts','Pipelines','Automations'].map(x=><span key={x} className={x==='Dashboard'?'on':''}>{x}</span>)}</nav></div>
     <div className="brand-main"><span className="brand-chip">100% yours</span><p>Your clients never see us.<br/>They see <strong>{branding.name}</strong> at <strong>{branding.domain}</strong>.</p></div>
    </div>
    <div className="saas-toggles"><label className="check-label"><input type="checkbox" checked={rebilling} onChange={e=>setRebilling(e.target.checked)}/>Rebill TWILIO / email usage at your own markup</label><label className="check-label"><input type="checkbox" checked={trial} onChange={e=>setTrial(e.target.checked)}/>Offer 14-day free trials on signup</label></div>
   </section>
  </div>
  <div className="section-heading"><h2>SaaS pricing tiers</h2><button className="button outline" onClick={()=>setNewPlan(true)}><Plus size={14}/>New pricing tier</button></div>
  <div className="plan-grid">{db.plans.length?db.plans.map(p=><section className="card plan-card" key={p.id}>
   <div className="card-title"><h3>{p.name}</h3><span className="badge">{p.subAccounts} accounts</span></div>
   <div className="product-price"><strong>{money(p.price)}</strong><span>/mo</span></div>
   <p className="muted">{p.features}</p>
  </section>):<p className="muted">No pricing tiers yet — create the plans your clients will subscribe to.</p>}</div>
  <div className="section-heading"><h2>Sub-accounts</h2><button className="button outline" onClick={()=>setAdding(true)}><Plus size={14}/>New sub-account</button></div>
  <section className="card"><div className="table-wrap"><table><thead><tr><th>Client</th><th>Plan</th><th>Domain</th><th>MRR</th><th>Status</th></tr></thead><tbody>{db.subAccounts.map(s=><tr key={s.id}>
   <td><span className="contact-cell"><i className="contact-avatar">{initials(s.name)}</i><strong>{s.name}</strong></span></td>
   <td><span className="badge">{s.plan}</span></td><td>{s.domain}</td><td>{s.mrr?money(s.mrr):'—'}</td>
   <td><span className={'badge '+(s.status==='active'?'green':s.status==='trial'?'':'red')}>{s.status}</span></td>
  </tr>)}</tbody></table></div></section>
  {adding&&<Modal title="New sub-account" subtitle="A fully isolated workspace for one of your clients." onClose={()=>setAdding(false)}>
   <form onSubmit={e=>{e.preventDefault();addSubAccount(Object.fromEntries(new FormData(e.currentTarget) as any))}}>
    <Field label="Client name"><input name="name" required/></Field>
    <div className="two-col"><Field label="Plan"><select name="plan">{db.plans.length?db.plans.map(p=><option key={p.id}>{p.name}</option>):<option>Starter</option>}</select></Field><Field label="Domain"><input name="domain" placeholder="app.yourclient.com"/></Field></div>
    <button className="button primary" type="submit"><Building2 size={14}/>Provision account</button></form></Modal>}
  {newPlan&&<Modal title="New pricing tier" subtitle="A plan your clients pay you, monthly." onClose={()=>setNewPlan(false)}>
   <form onSubmit={e=>{e.preventDefault();addPlan(Object.fromEntries(new FormData(e.currentTarget) as any))}}>
    <Field label="Plan name"><input name="name" required placeholder="Starter"/></Field>
    <div className="two-col"><Field label="Price (USD/mo)"><input name="price" type="number" min={0} required/></Field><Field label="Included sub-accounts"><input name="accounts" type="number" min={1} defaultValue={3}/></Field></div>
    <Field label="What's included"><input name="features" placeholder="Core CRM · 1 funnel · Email support"/></Field>
    <button className="button primary" type="submit">Create tier</button></form></Modal>}
 </>;
}

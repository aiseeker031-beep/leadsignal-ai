'use client';
import {useState} from 'react';
import {Globe,Plus,FlaskConical,MousePointerClick,Eye,ArrowUp,ArrowDown,Trash2} from 'lucide-react';
import {useCrm,uid,now,money,type Funnel,type Row} from '@/lib/crm';
import {Field,Modal} from '@/components/ui/crm-ui';

const templates=['Bold Lead Capture','Minimal Consultation','Conversion Sales Letter','Webinar Registration','Simple Confirmation','Product Launch','Local Service Landing','Course Opt-in','High-Ticket Application','Ebook Download','Booking Funnel','Agency Homepage','Upsell One-Click','Flash Sale','Podcast Landing','Newsletter Signup','Virtual Summit','Free Trial'];
const stepTypes:[FunnelStepType,string][]=[['optin','Opt-in'],['sales','Sales'],['upsell','Upsell'],['thankyou','Thank You']];
type FunnelStepType=Funnel['steps'][0]['type'];
export default function FunnelsView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [openId,setOpenId]=useState<string|null>(null),[creating,setCreating]=useState(false),[tpl,setTpl]=useState(false),[stepId,setStepId]=useState<string|null>(null);
 const funnel=db.funnels.find(f=>f.id===openId);
 const step=funnel?.steps.find(s=>s.id===stepId)||funnel?.steps[0];
 function patch(id:string,fn:(f:Funnel)=>void){set(d=>{const f=d.funnels.find(x=>x.id===id);if(f)fn(f)})}
 function create(name:string,tplName:string){const f:Funnel={id:uid(),name,status:'draft',steps:[{id:uid(),name:'Opt-in',type:'optin',template:tplName,headline:'Your irresistible headline',sub:'A short promise of the transformation you deliver.',cta:'Get started'}],ab:[{id:'a',name:'Variant A',split:100,visits:0,conversions:0}],createdAt:now()};set(d=>d.funnels.unshift(f));setCreating(false);setOpenId(f.id);setStepId(f.steps[0].id)}
 const funnelStats=(f:Funnel)=>{const visits=f.ab.reduce((a,v)=>a+v.visits,0),conv=f.ab.reduce((a,v)=>a+v.conversions,0);return {visits,conv,rate:visits?Math.round(conv/visits*100):0}};
 if(funnel&&step)return <div className="funnel-builder">
  <div className="crm-toolbar"><button className="button outline" onClick={()=>setOpenId(null)}>← All funnels</button><div className="chips">{funnel.steps.map(s=><button key={s.id} className={'smart-chip'+(s.id===step.id?' selected':'')} onClick={()=>setStepId(s.id)}>{s.name}</button>)}<button className="smart-chip add" onClick={()=>patch(funnel.id,f=>f.steps.push({id:uid(),name:'New step',type:'sales',template:templates[3],headline:'Headline',sub:'Sub-headline',cta:'CTA'}))}><Plus size={13}/>Step</button></div>
   <div className="crm-toolbar-right"><span className={'badge '+(funnel.status==='live'?'green':'')}>{funnel.status}</span><button className="button primary" onClick={()=>{patch(funnel.id,f=>{f.status=f.status==='live'?'draft':'live'});pushNotice(funnel.status==='live'?'Funnel set to draft.':'Funnel is live!')}}>{funnel.status==='live'?'Unpublish':'Publish'}</button></div></div>
  <div className="builder-grid">
   <section className="card"><div className="card-title"><h3>{step.name}</h3><button className="text-link" onClick={()=>{patch(funnel.id,f=>{f.steps=f.steps.filter(s=>s.id!==step.id)});setStepId(null)}}><Trash2 size={14}/>Remove</button></div>
    <Field label="Step name"><input value={step.name} onChange={e=>patch(funnel.id,f=>{const s=f.steps.find(x=>x.id===step.id);if(s)s.name=e.target.value})}/></Field>
    <Field label="Step type"><select value={step.type} onChange={e=>patch(funnel.id,f=>{const s=f.steps.find(x=>x.id===step.id);if(s)s.type=e.target.value as FunnelStepType})}>{stepTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
    <Field label="Template"><button className="button outline" onClick={()=>setTpl(true)}><Globe size={14}/>{step.template}</button></Field>
    <Field label="Headline"><input value={step.headline} onChange={e=>patch(funnel.id,f=>{const s=f.steps.find(x=>x.id===step.id);if(s)s.headline=e.target.value})}/></Field>
    <Field label="Sub-headline"><textarea value={step.sub} onChange={e=>patch(funnel.id,f=>{const s=f.steps.find(x=>x.id===step.id);if(s)s.sub=e.target.value})}/></Field>
    <Field label="Button text"><input value={step.cta} onChange={e=>patch(funnel.id,f=>{const s=f.steps.find(x=>x.id===step.id);if(s)s.cta=e.target.value})}/></Field>
   </section>
   <div className="builder-preview">
    <div className="preview-label"><Eye size={14}/>Live preview · served via global CDN</div>
    <section className="page-preview"><span className="page-tag">{step.type}</span><h1>{step.headline}</h1><p>{step.sub}</p><span className="page-cta">{step.cta}</span><span className="page-form"/><span className="page-form short"/></section>
    <section className="card"><div className="card-title"><h3><FlaskConical size={16}/>A/B split testing</h3><button className="text-link" onClick={()=>patch(funnel.id,f=>{const n=f.ab.length+1;f.ab.push({id:uid(),name:'Variant '+String.fromCharCode(64+n),split:0,visits:0,conversions:0})})}><Plus size={14}/>Variant</button></div>
     {funnel.ab.map(v=>{const rate=v.visits?Math.round(v.conversions/v.visits*100):0;return <div className="variant-row" key={v.id}><div><strong>{v.name}</strong><small>{v.visits.toLocaleString()} visits · {v.conversions} conversions · {rate}% conv · {v.split}% traffic</small></div><span className={'score '+(rate>=15?'green':'')}>{rate}%</span></div>})}
    </section>
   </div>
  </div>
  {tpl&&<Modal wide title="Template gallery" subtitle="100+ conversion-tested templates. Pick one to apply to this step." onClose={()=>setTpl(false)}>
   <div className="tpl-grid">{templates.map(t=><button key={t} className="tpl-card" onClick={()=>{patch(funnel.id,f=>{const s=f.steps.find(x=>x.id===step.id);if(s)s.template=t});setTpl(false);pushNotice('Template applied: '+t)}}><span className="tpl-thumb"><Globe size={20}/></span><strong>{t}</strong></button>)}</div></Modal>}
 </div>;
 return <>
  <div className="crm-toolbar"><span className="muted">Funnels, websites and landing pages — fast, mobile-ready, globally cached.</span><button className="button primary" onClick={()=>setCreating(true)}><Plus size={15}/>New funnel</button></div>
  <div className="funnel-grid">{db.funnels.map(f=>{const st=funnelStats(f);return <section className="card" key={f.id}>
   <div className="card-title"><h3>{f.name}</h3><span className={'badge '+(f.status==='live'?'green':'')}>{f.status}</span></div>
   <p className="muted">{f.steps.length} steps · {f.steps.map(s=>s.type).join(' → ')}</p>
   <div className="funnel-stats"><span><MousePointerClick size={14}/>{st.visits.toLocaleString()} visits</span><span><Eye size={14}/>{st.rate}% conversion</span><span>{f.ab.length} variants</span></div>
   <button className="button outline" onClick={()=>{setOpenId(f.id);setStepId(f.steps[0]?.id||null)}}>Open builder</button>
  </section>})}</div>
  {creating&&<Modal title="New funnel" subtitle="Start from a blank canvas or a proven template." onClose={()=>setCreating(false)}>
   <form onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);create(String(fd.get('name')),String(fd.get('template')))}}>
    <Field label="Funnel name"><input name="name" required placeholder="Spring Promo Funnel"/></Field>
    <Field label="Starting template"><select name="template">{templates.map(t=><option key={t}>{t}</option>)}</select></Field>
    <button className="button primary" type="submit">Create funnel</button></form></Modal>}
 </>;
}

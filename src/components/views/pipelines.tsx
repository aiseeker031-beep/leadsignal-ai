'use client';
import {useState} from 'react';import Link from 'next/link';
import {Columns3,Plus,TrendingUp} from 'lucide-react';
import {useCrm,contactById,contactName,money,uid,now,type Row} from '@/lib/crm';
import {Field,Modal} from '@/components/ui/crm-ui';

export default function PipelinesView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [pid,setPid]=useState(db.pipelines[0]?.id||''),[adding,setAdding]=useState(false);
 const pipeline=db.pipelines.find(p=>p.id===pid)||db.pipelines[0];
 const opps=db.opportunities.filter(o=>o.pipelineId===pipeline?.id);
 function drop(stage:string,id:string){set(d=>{const o=d.opportunities.find(x=>x.id===id);if(o){o.stage=stage;o.status=stage==='Won'?'won':stage==='Lost'?'lost':'open'}});pushNotice('Opportunity moved to '+stage+'.')}
 function addOpp(form:Row){set(d=>d.opportunities.unshift({id:uid(),contactId:form.contactId,pipelineId:pipeline.id,stage:pipeline.stages[0],name:form.name,value:+form.value||0,status:'open',createdAt:now()}));setAdding(false);pushNotice('Opportunity created.')}
 const open=opps.filter(o=>o.status==='open'),won=opps.filter(o=>o.status==='won');
 return <>
  <div className="crm-toolbar">
   <div className="chips">{db.pipelines.map(p=><button key={p.id} className={'smart-chip'+(p.id===pipeline?.id?' selected':'')} onClick={()=>setPid(p.id)}>{p.name}</button>)}</div>
   <div className="crm-toolbar-right"><span className="pipeline-value"><TrendingUp size={15}/>Open: {money(open.reduce((a,o)=>a+o.value,0))} · Won: {money(won.reduce((a,o)=>a+o.value,0))}</span><button className="button primary" onClick={()=>setAdding(true)}><Plus size={15}/>New opportunity</button></div>
  </div>
  <div className="kanban">{pipeline?.stages.map(stage=>{
   const cards=opps.filter(o=>o.stage===stage);
   return <section key={stage} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(id)drop(stage,id)}}>
    <h3>{stage}<span>{cards.length}</span></h3>
    {cards.map(o=>{const c=contactById(db,o.contactId);return <div className="kanban-card" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',o.id)} key={o.id}>
     <strong className="opp-name">{o.name}</strong>
     <Link className="company" href={'/contacts?open='+o.contactId}>{contactName(c)}</Link>
     <span className={'score '+(o.value>=2000?'green':'')}>{money(o.value)}</span>
     <select aria-label="Move stage" value={o.stage} onChange={e=>drop(e.target.value,o.id)}>{pipeline.stages.map(s=><option key={s}>{s}</option>)}</select>
    </div>})}
    {!cards.length&&<p className="kanban-empty">Drop here</p>}
   </section>})}
  </div>
  {adding&&<Modal title="New opportunity" subtitle="Track every deal through your pipeline." onClose={()=>setAdding(false)}>
   <form onSubmit={e=>{e.preventDefault();addOpp(Object.fromEntries(new FormData(e.currentTarget) as any))}}>
    <Field label="Opportunity name"><input name="name" required placeholder="Acme Co — Growth retainer"/></Field>
    <div className="two-col"><Field label="Contact"><select name="contactId">{db.contacts.map(c=><option key={c.id} value={c.id}>{contactName(c)}</option>)}</select></Field><Field label="Value (USD)"><input name="value" type="number" min={0} required/></Field></div>
    <button className="button primary" type="submit">Create</button></form></Modal>}
 </>;
}

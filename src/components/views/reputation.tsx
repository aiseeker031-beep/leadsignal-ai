'use client';
import {useState} from 'react';import Link from 'next/link';
import {Star,Send,Sparkles,ShieldCheck,Copy,MessageSquareQuote} from 'lucide-react';
import {useCrm,contactById,contactName,uid,now,type Row} from '@/lib/crm';
import {Field,Modal,Stat} from '@/components/ui/crm-ui';

export default function ReputationView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [requesting,setRequesting]=useState(false);
 const reviews=db.reviews;
 const received=reviews.filter(r=>r.status!=='invited');
 const avg=received.length?(received.reduce((a,r)=>a+r.rating,0)/received.length).toFixed(1):'—';
 const negative=received.filter(r=>r.sentiment==='negative').length;
 const respondRate=received.length?Math.round(reviews.filter(r=>r.status==='responded').length/received.length*100):0;
 function sendRequest(form:Row){const c=db.contacts.find(x=>x.id===form.contactId);set(d=>d.reviews.unshift({id:uid(),contactId:form.contactId,platform:form.platform as 'google',rating:0,text:'',sentiment:'positive',status:'invited',at:now()}));setRequesting(false);pushNotice('Review request queued — '+(c?contactName(c):'contact')+' will get a friendly SMS + email follow-up sequence.')}
 const widgetCode=`<div id="ghl-reviews-widget"></div>\n<script src="${db.branding.domain}/widgets/reviews.js" data-min="4" data-theme="light" async></script>`;
 return <>
  <div className="stats">{[
   <Stat key="a" label="Average rating" value={avg+' ★'} caption={received.length+' reviews · '+negative+' negative'}/>,
   <Stat key="b" label="Requests sent" value={reviews.length} caption="Google + Facebook" color="violet"/>,
   <Stat key="c" label="Response rate" value={respondRate+'%'} caption="Reviews with a reply" color="orange"/>,
   <Stat key="d" label="Sentiment" value={negative===0?'Positive':negative<3?'Mixed':'At risk'} caption="AI-tracked across platforms" color="green"/>]}</div>
  <div className="crm-toolbar"><span className="muted">Automated review requests after every completed appointment.</span><button className="button primary" onClick={()=>setRequesting(true)}><Send size={15}/>Send review request</button></div>
  <div className="reputation-grid">
   <section className="card"><div className="card-title"><h3><Star size={16}/>Review requests & replies</h3></div>
    {reviews.map(r=>{const c=contactById(db,r.contactId);return <div className="review-row" key={r.id}>
     <div className="review-main"><Link href={'/contacts?open='+r.contactId}><strong>{contactName(c)}</strong></Link>
      <span className="stars">{'★'.repeat(r.rating)||'☆☆☆☆☆'}<small>{r.platform}</small></span>
      {r.text&&<p>{r.text}</p>}
      {r.response&&<blockquote><MessageSquareQuote size={13}/> {r.response}</blockquote>}
      <small>{r.status==='invited'?'Request sent — awaiting response':r.status}</small></div>
     <span className={'badge '+(r.sentiment==='positive'?'green':r.sentiment==='negative'?'red':'')}>{r.sentiment||'pending'}</span>
    </div>})}
   </section>
   <section className="card showcase"><div className="card-title"><h3><ShieldCheck size={16}/>Showcase widget</h3></div>
    <p className="muted">Embed your best reviews on any website.</p>
    <div className="widget-preview">{received.filter(r=>r.rating>=4).slice(0,3).map(r=><div className="widget-card" key={r.id}><span className="stars small">{'★★★★★'.slice(0,r.rating)}</span><p>{r.text.slice(0,80)}{r.text.length>80?'…':''}</p><small>{contactName(contactById(db,r.contactId))}</small></div>)}
     {!received.some(r=>r.rating>=4)&&<p className="muted">Positive reviews will appear here.</p>}
    </div>
    <Field label="Embed code"><textarea className="code-input" readOnly value={widgetCode}/></Field>
    <button className="button outline" onClick={()=>{navigator.clipboard.writeText(widgetCode).then(()=>pushNotice('Embed code copied.'))}}><Copy size={14}/>Copy embed code</button>
   </section>
  </div>
  {requesting&&<Modal title="Send review request" subtitle="Automated SMS + email follow-up until they respond." onClose={()=>setRequesting(false)}>
   <form onSubmit={e=>{e.preventDefault();sendRequest(Object.fromEntries(new FormData(e.currentTarget) as any))}}>
    <Field label="Contact"><select name="contactId">{db.contacts.map(c=><option key={c.id} value={c.id}>{contactName(c)}</option>)}</select></Field>
    <Field label="Platform"><select name="platform"><option value="google">Google</option><option value="facebook">Facebook</option></select></Field>
    <button className="button primary" type="submit"><Sparkles size={14}/>Queue request</button></form></Modal>}
 </>;
}

'use client';
import {useMemo,useState,useEffect} from 'react';import Link from 'next/link';import {useRouter,useSearchParams} from 'next/navigation';
import {Plus,Search,Users,Phone,Mail,MessageSquare,CalendarClock,StickyNote,X,Columns3,CalendarDays,CreditCard,ArrowUpRight} from 'lucide-react';
import {useCrm,contactName,uid,now,initials,type Contact,type Conversation,type Row} from '@/lib/crm';
import {Field,Modal} from '@/components/ui/crm-ui';

const emptyForm={firstName:'',lastName:'',email:'',phone:'',company:'',tags:'',status:'lead',source:'Manual'};
export default function ContactsView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const router=useRouter(),sp=useSearchParams();
 const [q,setQ]=useState(''),[smart,setSmart]=useState('all'),[open,setOpen]=useState<Contact|Row|null>(null),[adding,setAdding]=useState(false),[fields,setFields]=useState(false),[form,setForm]=useState<Row>(emptyForm),[note,setNote]=useState(''),[noteType,setNoteType]=useState<Contact['notes'][0]['type']>('note');
 useEffect(()=>{const id=sp.get('open');if(id){const c=db.contacts.find(x=>x.id===id);if(c)setOpen(c)}},[sp,db.contacts]);
 const smartLists:[string,string,(c:Contact)=>boolean][]=[
  ['all','All contacts',()=>true],
  ['leads','Leads',c=>c.status==='lead'],
  ['customers','Customers',c=>c.status==='customer'],
  ['vip','VIP',c=>c.tags.includes('vip')||c.custom.priority==='High'],
  ['recent','Added 30 days',c=>Date.now()-new Date(c.createdAt).getTime()<30*864e5]];
 const list=useMemo(()=>{const f=smartLists.find(s=>s[0]===smart)![2];return db.contacts.filter(f).filter(c=>(c.firstName+' '+c.lastName+' '+c.email+' '+c.company).toLowerCase().includes(q.toLowerCase()))},[db.contacts,q,smart]);
 function saveContact(id:string,patch:Row){set(d=>{const c=d.contacts.find(x=>x.id===id);if(c)Object.assign(c,patch)})}
 function addContact(){const [firstName='',lastName='']=form.name?.split(' ')||[];const tags=form.tags?.split(',').map((s:string)=>s.trim()).filter(Boolean)||[];const c:Contact={id:uid(),firstName:form.firstName||firstName,lastName:form.lastName||lastName,email:form.email||'',phone:form.phone||'',company:form.company||'',tags,source:form.source||'Manual',status:form.status||'lead',custom:{},createdAt:now(),notes:[]};set(d=>d.contacts.unshift(c));setAdding(false);setForm(emptyForm);setOpen(c);pushNotice('Contact added.')}
 function addNote(type:Contact['notes'][0]['type']){if(!note.trim()||!open)return;const n={id:uid(),type,text:note.trim(),at:now()};set(d=>{const c=d.contacts.find(x=>x.id===open.id);c?.notes.unshift(n)});setNote('');}
 function startConversation(contactId:string,channel:string){set(d=>d.conversations.unshift({id:uid(),contactId,channel:channel as Conversation['channel'],messages:[],unread:0}));router.push('/conversations')}
 const detail=open&&db.contacts.find(c=>c.id===open.id);
 const rel=detail?{opps:db.opportunities.filter(o=>o.contactId===detail.id),appts:db.appointments.filter(a=>a.contactId===detail.id),invs:db.invoices.filter(i=>i.contactId===detail.id),convs:db.conversations.filter(c=>c.contactId===detail.id)}:null;
 return <>
  <div className="crm-toolbar">
   <div className="crm-search"><Search size={15}/><input aria-label="Search contacts" placeholder="Search name, email, company…" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <div className="chips">{smartLists.map(([v,label])=><button key={v} className={'smart-chip'+(smart===v?' selected':'')} onClick={()=>setSmart(v)}>{label}</button>)}</div>
   <div className="crm-toolbar-right"><button className="button outline" onClick={()=>setFields(true)}><StickyNote size={15}/>Custom fields</button><button className="button primary" onClick={()=>setAdding(true)}><Plus size={15}/>New contact</button></div>
  </div>
  <section className="card"><div className="card-title"><h3>{smartLists.find(s=>s[0]===smart)?.[1]} <span className="count">{list.length}</span></h3></div>
   {list.length?<div className="table-wrap"><table><thead><tr><th>Contact</th><th>Company</th><th>Status</th><th>Tags</th><th>Priority</th><th>Added</th></tr></thead><tbody>{list.map(c=><tr key={c.id} onClick={()=>setOpen(c)} className="row-click"><td><span className="contact-cell"><i className="contact-avatar">{initials(c.firstName+' '+c.lastName)}</i><span><strong>{c.firstName} {c.lastName}</strong><small>{c.email}</small></span></span></td><td>{c.company||'—'}</td><td><span className={'badge '+(c.status==='customer'?'green':'')}>{c.status}</span></td><td><span className="chips">{c.tags.map(t=><span key={t}>{t}</span>)}</span></td><td>{c.custom.priority||'—'}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>:<div className="empty"><span className="empty-icon"><Users size={22}/></span><h3>No contacts here yet</h3><p>Add a contact or switch smart lists.</p></div>}
  </section>
  {adding&&<Modal title="New contact" subtitle="Unlimited contacts. Add custom values any time." onClose={()=>setAdding(false)}>
   <form onSubmit={e=>{e.preventDefault();addContact()}}><div className="two-col"><Field label="First name"><input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></Field><Field label="Last name"><input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></Field></div>
   <Field label="Email"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
   <div className="two-col"><Field label="Phone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Company"><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></Field></div>
   <div className="two-col"><Field label="Tags (comma separated)"><input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['lead','active','customer','churned'].map(s=><option key={s}>{s}</option>)}</select></Field></div>
   <button className="button primary" type="submit">Create contact</button></form></Modal>}
  {fields&&<Modal title="Custom fields" subtitle="Define the values that matter to your business." onClose={()=>setFields(false)}>
   {db.fieldDefs.map(f=><div className="field-row" key={f.id}><strong>{f.name}</strong><span className="badge">{f.type}</span><button aria-label={'Remove '+f.name} onClick={()=>set(d=>d.fieldDefs=d.fieldDefs.filter(x=>x.id!==f.id))}><X size={14}/></button></div>)}
   <form onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);set(d=>d.fieldDefs.push({id:uid(),name:String(fd.get('name')||'').trim().toLowerCase().replace(/\s+/g,'_'),type:String(fd.get('type'))}))}}><div className="two-col"><Field label="Field name"><input name="name" required/></Field><Field label="Type"><select name="type"><option>text</option><option>number</option><option>select</option><option>date</option></select></Field></div><button className="button outline" type="submit"><Plus size={14}/>Add field</button></form></Modal>}
  {detail&&<Modal wide title={detail.firstName+' '+detail.lastName} subtitle={[detail.email,detail.phone].filter(Boolean).join(' · ')} onClose={()=>setOpen(null)}>
   <div className="detail-grid">
    <div>
     <div className="detail-block"><h3>Details</h3>
      <div className="two-col"><Field label="Status"><select value={detail.status} onChange={e=>saveContact(detail.id,{status:e.target.value})}>{['lead','active','customer','churned'].map(s=><option key={s}>{s}</option>)}</select></Field><Field label="Company"><input value={detail.company} onChange={e=>saveContact(detail.id,{company:e.target.value})}/></Field></div>
      {db.fieldDefs.map(f=><Field key={f.id} label={f.name.replaceAll('_',' ')}><input value={detail.custom[f.name]||''} onChange={e=>saveContact(detail.id,{custom:{...detail.custom,[f.name]:e.target.value}})}/></Field>)}
      <Field label="Tags"><input value={detail.tags.join(', ')} onChange={e=>saveContact(detail.id,{tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/></Field>
     </div>
     {rel&&<div className="detail-block"><h3>Related records</h3>
      <div className="related-rows">
       {rel.opps.length?rel.opps.map(o=><Link key={o.id} className="related-row" href="/crm"><Columns3 size={14}/><span><strong>{o.name}</strong><small>{o.stage}{o.value?' · '+o.value.toLocaleString():''}</small></span><ArrowUpRight size={13}/></Link>):null}
       {rel.appts.length?rel.appts.slice(0,4).map(a=><Link key={a.id} className="related-row" href="/calendars"><CalendarDays size={14}/><span><strong>Appointment</strong><small>{new Date(a.start).toLocaleString()} · {a.status}</small></span><ArrowUpRight size={13}/></Link>):null}
       {rel.invs.length?rel.invs.map(i=><Link key={i.id} className="related-row" href="/payments"><CreditCard size={14}/><span><strong>{i.number}</strong><small>{i.status}</small></span><ArrowUpRight size={13}/></Link>):null}
       {!rel.opps.length&&!rel.appts.length&&!rel.invs.length&&<p className="muted">No opportunities, appointments or invoices yet for this contact.</p>}
      </div>
      <div className="related-actions">
       {rel.convs.length?rel.convs.map(c=><Link key={c.id} className="related-row" href="/conversations"><MessageSquare size={14}/><span><strong>{c.channel.toUpperCase()} conversation</strong><small>{c.messages.length} messages</small></span><ArrowUpRight size={13}/></Link>):null}
       <div className="start-conv"><select aria-label="Channel" defaultValue="sms" id={'conv-ch-'+detail.id}>{['sms','email','whatsapp','instagram','facebook'].map(c=><option key={c}>{c}</option>)}</select><button className="button outline" onClick={()=>{const sel=document.getElementById('conv-ch-'+detail.id) as HTMLSelectElement;startConversation(detail.id,sel.value)}}><MessageSquare size={14}/>New conversation</button></div>
      </div>
     </div>}
     <div className="detail-block"><h3>Log interaction</h3><Field label="Type"><select value={noteType} onChange={e=>setNoteType(e.target.value as any)}>{['note','call','sms','email','meeting'].map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}</select></Field><Field label="What happened?"><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Call summary, message sent, meeting outcome…"/></Field><div style={{display:'flex',gap:10}}><button className="button outline" onClick={()=>addNote(noteType)}>Add to history</button><button className="button ghost" style={{color:'#b9757f',marginLeft:'auto'}} onClick={()=>{set(d=>d.contacts=d.contacts.filter(x=>x.id!==detail.id));setOpen(null);pushNotice('Contact deleted.')}}>Delete contact</button></div></div>
    </div>
    <div className="detail-block"><h3>Interaction history</h3>{detail.notes.length?<Timeline items={detail.notes}/>:<p className="muted">No interactions logged yet.</p>}</div>
   </div></Modal>}
 </>;
}
function Timeline({items}:{items:{id:string;type:string;text:string;at:string}[]}){
 return <div className="timeline">{items.map(n=><div className="timeline-item" key={n.id}><span className={'timeline-dot t-'+n.type}/><div><p className="prewrap">{n.text}</p><small>{n.type.toUpperCase()} · {new Date(n.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></div></div>)}</div>;
}

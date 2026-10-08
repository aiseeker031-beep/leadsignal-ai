'use client';
import {useState} from 'react';import Link from 'next/link';
import {Inbox,Send,Mail,MessageSquare,MessageCircle,Camera,Phone,Plus,Megaphone} from 'lucide-react';
import {useCrm,contactById,contactName,uid,now,clock,type Row,type Conversation} from '@/lib/crm';
import {Field,Modal} from '@/components/ui/crm-ui';

const channels:[string,string,typeof Mail][]=[['all','All',Inbox],['sms','SMS',MessageSquare],['email','Email',Mail],['facebook','Facebook',MessageCircle],['instagram','Instagram',Camera],['whatsapp','WhatsApp',Phone]];
const channelIcon:Row={sms:MessageSquare,email:Mail,facebook:MessageCircle,instagram:Camera,whatsapp:Phone};
export default function ConversationsView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [ch,setCh]=useState('all'),[openId,setOpenId]=useState<string|null>(null),[text,setText]=useState(''),[blast,setBlast]=useState(false),[newThread,setNewThread]=useState(false);
 function startThread(form:Row){const c:Conversation={id:uid(),contactId:form.contactId,channel:form.channel as Conversation['channel'],messages:[],unread:0};set(d=>d.conversations.unshift(c));setNewThread(false);setOpenId(c.id)}
 const threads=db.conversations.filter(c=>ch==='all'||c.channel===ch);
 const thread=db.conversations.find(c=>c.id===openId)||threads[0];
 const unread=db.conversations.reduce((a,c)=>a+c.unread,0);
 function reply(){if(!text.trim()||!thread)return;const body=text.trim();set(d=>{const t=d.conversations.find(x=>x.id===thread.id);if(t){t.messages.push({id:uid(),from:'me',body,at:now()});t.unread=0}});setText('');pushNotice(thread.channel==='email'?'Email sent.':'Message delivered via '+thread.channel.toUpperCase()+'.')}
 function markRead(t:Row){set(d=>{const x=d.conversations.find(c=>c.id===t.id);if(x)x.unread=0})}
 return <>
  <div className="crm-toolbar">
   <div className="chips">{channels.map(([v,label,Icon])=><button key={v} className={'smart-chip'+(ch===v?' selected':'')} onClick={()=>setCh(v)}><Icon size={13}/>{label}{v==='all'&&unread>0?' · '+unread:''}</button>)}</div>
   <div className="crm-toolbar-right"><span className="connection-status"><span className="status-dot live"/>Two-way SMS · Email · Social DMs</span><button className="button outline" onClick={()=>setNewThread(true)}><Plus size={15}/>New conversation</button><button className="button primary" onClick={()=>setBlast(true)}><Megaphone size={15}/>Bulk email campaign</button></div>
  </div>
  <div className="inbox-grid">
   <section className="card thread-list"><div className="card-title"><h3><Inbox size={16}/>Conversations <span className="count">{threads.length}</span></h3></div>
    {threads.map(t=>{const Icon=channelIcon[t.channel],c=contactById(db,t.contactId),last=t.messages[t.messages.length-1];return <button key={t.id} className={'thread-row'+(thread?.id===t.id?' selected':'')+' '+(t.unread?'unread':'')} onClick={()=>{setOpenId(t.id);markRead(t)}}>
     <span className="thread-icon"><Icon size={15}/></span>
     <span className="thread-meta"><strong>{contactName(c)}</strong><small>{last?.body.slice(0,60)}</small></span>
     {t.unread>0&&<b>{t.unread}</b>}
    </button>})}
   </section>
   {thread?<section className="card thread-pane">
    <div className="thread-head"><Link href={'/contacts?open='+thread.contactId}><strong>{contactName(contactById(db,thread.contactId))}</strong></Link><span className="badge">{thread.channel.toUpperCase()}</span><span className="muted">{thread.messages.length} messages</span></div>
    <div className="thread-scroll">{thread.messages.map(m=><div key={m.id} className={'bubble-row '+(m.from==='me'?'me':'them')}>{m.subject?<div className="bubble"><strong className="bubble-subject">{m.subject}</strong>{m.body}</div>:<div className="bubble">{m.body}</div>}<small>{clock(m.at)}</small></div>)}</div>
    <form className="thread-compose" onSubmit={e=>{e.preventDefault();reply()}}>
     <textarea aria-label="Reply" placeholder={'Reply via '+thread.channel.toUpperCase()+'…'} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();reply()}}}/>
     <button className="chat-send" type="submit" aria-label="Send" disabled={!text.trim()}><Send size={17}/></button>
    </form>
   </section>:<section className="card"><div className="empty"><span className="empty-icon"><Inbox size={22}/></span><h3>No conversations</h3><p>Start one from a contact, or with the button above.</p></div></section>}
  </div>
  {newThread&&<Modal title="New conversation" subtitle="Pick a contact and channel — the thread joins your unified inbox." onClose={()=>setNewThread(false)}>
   <form onSubmit={e=>{e.preventDefault();startThread(Object.fromEntries(new FormData(e.currentTarget) as any))}}>
    <Field label="Contact"><select name="contactId" required>{db.contacts.map(c=><option key={c.id} value={c.id}>{contactName(c)}</option>)}</select></Field>
    <Field label="Channel"><select name="channel">{[['sms','SMS'],['email','Email'],['whatsapp','WhatsApp'],['instagram','Instagram'],['facebook','Facebook']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
    <button className="button primary" type="submit">Open thread</button></form></Modal>}
  {blast&&<Modal title="Bulk email campaign" subtitle="Send to a smart list segment with open & click tracking." onClose={()=>setBlast(false)}>
   <form onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const audience=String(fd.get('audience'));const count=db.contacts.filter(c=>audience==='All contacts'||(audience==='Customers'&&c.status==='customer')||(audience==='Leads'&&c.status==='lead')).length;set(d=>d.blasts.unshift({id:uid(),name:String(fd.get('name')),channel:'email',audience,sent:count,opens:0,clicks:0,at:now()}));setBlast(false);pushNotice('Campaign queued to '+count+' contacts.')}}>
    <Field label="Campaign name"><input name="name" required placeholder="April promo"/></Field>
    <Field label="Audience"><select name="audience"><option>All contacts</option><option>Leads</option><option>Customers</option></select></Field>
    <Field label="Email subject"><input name="subject" required placeholder="A quick idea for {{company}}…"/></Field>
    <Field label="Body"><textarea name="body" required placeholder="Write your message. Use {{first_name}} and {{company}} merge tags."/></Field>
    <button className="button primary" type="submit"><Send size={14}/>Send campaign</button></form>
   <h3 style={{marginTop:26}}>Recent blasts</h3>{db.blasts.map(b=><div className="variant-row" key={b.id}><div><strong>{b.name}</strong><small>{b.audience} · sent {b.sent} · opened {b.opens} · clicked {b.clicks}</small></div><span className="badge">{b.sent?Math.round(b.opens/Math.max(b.sent,1)*100):0}% open</span></div>)}
  </Modal>}
 </>;
}

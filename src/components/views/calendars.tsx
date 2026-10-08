'use client';
import {useState} from 'react';import Link from 'next/link';
import {CalendarDays,Plus,Clock,Link2,BellRing,Video} from 'lucide-react';
import {useCrm,contactById,contactName,uid,clock,daysAhead,type Row,type Appointment} from '@/lib/crm';
import {Field,Modal,Toggle} from '@/components/ui/crm-ui';

const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export default function CalendarsView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [booking,setBooking]=useState(false),[editCal,setEditCal]=useState<Row|null>(null);
 const appts=[...db.appointments].sort((a,b)=>a.start.localeCompare(b.start));
 function patchCal(id:string,fn:(c:Row)=>void){set(d=>{const c=d.calendars.find(x=>x.id===id);if(c)fn(c)})}
 function book(form:Row){set(d=>d.appointments.push({id:uid(),contactId:form.contactId,calendarId:form.calendarId,start:new Date(form.start).toISOString(),status:'scheduled',notes:String(form.notes||'')}));setBooking(false);pushNotice('Booked! Confirmation + reminder texts and emails scheduled.')}
 function setStatus(id:string,status:Appointment['status']){set(d=>{const a=d.appointments.find(x=>x.id===id);if(a)a.status=status})}
 const week=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d});
 return <>
  <div className="crm-toolbar"><div className="chips">{db.calendars.map(c=><button key={c.id} className="smart-chip" onClick={()=>setEditCal(c)}><Link2 size={13}/>{c.name}</button>)}<button className="smart-chip add" onClick={()=>setEditCal({name:'',duration:30,buffer:0,days:[1,2,3,4,5],hours:'9:00am – 5:00pm',slug:'',reminders:true,color:'#1f2837'})}><Plus size={13}/>Booking link</button></div>
   <div className="crm-toolbar-right"><span className="muted">Self-scheduling that syncs with your external calendars.</span><button className="button primary" onClick={()=>setBooking(true)}><Plus size={15}/>Book appointment</button></div></div>
  <div className="calendar-grid-wrap">
   <section className="card week-grid">{week.map(d=>{const dayAppts=appts.filter(a=>new Date(a.start).toDateString()===d.toDateString());return <div className="week-col" key={d.toISOString()}>
    <div className="week-head"><strong>{dayNames[d.getDay()]}</strong><span>{d.getMonth()+1}/{d.getDate()}</span></div>
    {dayAppts.map(a=>{const cal=db.calendars.find(c=>c.id===a.calendarId);return <button key={a.id} className={'appt-chip '+(a.status!=='scheduled'?'done':'')} title={contactName(contactById(db,a.contactId))+' · '+cal?.name} onClick={()=>{setStatus(a.id,a.status==='scheduled'?'completed':'scheduled');pushNotice(a.status==='scheduled'?'Marked complete.':'Reopened.')}}>
     <strong>{new Date(a.start).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</strong>
     <small>{contactName(contactById(db,a.contactId))}</small>
     <span>{cal?.name}</span></button>})}
    {!dayAppts.length&&<span className="week-free">Available</span>}
   </div>})}</section>
   <section className="card upcoming"><div className="card-title"><h3><Clock size={16}/>Upcoming appointments</h3></div>
    {appts.filter(a=>a.status==='scheduled'&&new Date(a.start).getTime()>Date.now()).slice(0,6).map(a=>{const cal=db.calendars.find(c=>c.id===a.calendarId);return <div className="variant-row" key={a.id}>
     <div><strong><Link href={'/contacts?open='+a.contactId}>{contactName(contactById(db,a.contactId))}</Link></strong><small>{cal?.name} · {clock(a.start)} · {cal?.duration} min {a.notes?'· '+a.notes:''}</small></div>
     {cal?.reminders&&<span className="badge green"><BellRing size={11}/>Reminders on</span>}
    </div>})}
    {!appts.some(a=>a.status==='scheduled')&&<p className="muted">Nothing scheduled yet.</p>}
   </section>
  </div>
  {booking&&<Modal title="Book appointment" subtitle="Confirmation and reminder messages go out automatically." onClose={()=>setBooking(false)}>
   <form onSubmit={e=>{e.preventDefault();book(Object.fromEntries(new FormData(e.currentTarget) as any))}}>
    <Field label="Contact"><select name="contactId">{db.contacts.map(c=><option key={c.id} value={c.id}>{contactName(c)}</option>)}</select></Field>
    <Field label="Calendar"><select name="calendarId">{db.calendars.map(c=><option key={c.id} value={c.id}>{c.name} ({c.duration} min)</option>)}</select></Field>
    <Field label="Date & time"><input name="start" type="datetime-local" required min={new Date().toISOString().slice(0,16)} defaultValue={daysAhead(1,10).slice(0,16)}/></Field>
    <Field label="Notes"><input name="notes" placeholder="Anything the host should know…"/></Field>
    <button className="button primary" type="submit"><Video size={14}/>Confirm booking</button></form></Modal>}
  {editCal&&<Modal title={editCal.name?'Edit booking link':'New booking link'} subtitle="Share the link; contacts pick any open slot." onClose={()=>setEditCal(null)}>
   <form onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const values={name:String(fd.get('name')),duration:+(fd.get('duration')||0),buffer:+(fd.get('buffer')||0),hours:String(fd.get('hours')),slug:String(fd.get('slug')).toLowerCase().replace(/\s+/g,'-'),reminders:fd.get('reminders')==='on'};if(editCal.id){patchCal(editCal.id,c=>Object.assign(c,values))}else{set(d=>d.calendars.push({id:uid(),...values,days:[1,2,3,4,5],color:'#1f2837'}))}setEditCal(null);pushNotice('Booking link saved.')}}>
    <Field label="Calendar name"><input name="name" required defaultValue={editCal.name} placeholder="Discovery Call"/></Field>
    <div className="two-col"><Field label="Duration (minutes)"><input name="duration" type="number" min={5} step={5} defaultValue={editCal.duration}/></Field><Field label="Buffer (minutes)"><input name="buffer" type="number" min={0} step={5} defaultValue={editCal.buffer}/></Field></div>
    <Field label="Available hours"><input name="hours" defaultValue={editCal.hours}/></Field>
    <Field label="Link slug (yoursite.com/book/…)"><input name="slug" required defaultValue={editCal.slug} placeholder="discovery"/></Field>
    <label className="check-label"><input type="checkbox" name="reminders" defaultChecked={editCal.reminders}/>Send automatic SMS & email reminders</label>
    <button className="button primary" type="submit">Save booking link</button></form></Modal>}
 </>;
}

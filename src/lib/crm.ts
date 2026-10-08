'use client';
import {useEffect,useState,useRef,useCallback} from 'react';
// CRM data layer. Every workspace document lives in Supabase (crm_workspace.data)
// and is synced through /api/crm. No mock or demo data ships with the app.

export type Row=Record<string,any>;
export type Contact={id:string;firstName:string;lastName:string;email:string;phone:string;company:string;tags:string[];source:string;status:'lead'|'active'|'customer'|'churned';custom:Record<string,string>;createdAt:string;notes:{id:string;type:'note'|'call'|'sms'|'email'|'meeting';text:string;at:string}[]};
export type Pipeline={id:string;name:string;stages:string[]};
export type Opportunity={id:string;contactId:string;pipelineId:string;stage:string;name:string;value:number;status:'open'|'won'|'lost';createdAt:string};
export type FunnelStep={id:string;name:string;type:'optin'|'sales'|'upsell'|'thankyou';template:string;headline:string;sub:string;cta:string};
export type Funnel={id:string;name:string;status:'draft'|'live'|'paused';steps:FunnelStep[];ab:{id:string;name:string;split:number;visits:number;conversions:number}[];createdAt:string};
export type Action={id:string;type:'sms'|'email'|'wait'|'ifthen'|'tag'|'stage'|'webhook'|'goal';config:string;delay:string};
export type Workflow={id:string;name:string;status:'draft'|'active'|'paused';trigger:string;triggerConfig:string;actions:Action[];enrolled:number;createdAt:string};
export type Message={id:string;from:'contact'|'me';body:string;at:string;subject?:string};
export type Conversation={id:string;contactId:string;channel:'sms'|'email'|'facebook'|'instagram'|'whatsapp';messages:Message[];unread:number};
export type CalendarDef={id:string;name:string;duration:number;buffer:number;days:number[];hours:string;slug:string;reminders:boolean;color:string};
export type Appointment={id:string;contactId:string;calendarId:string;start:string;status:'scheduled'|'completed'|'no-show'|'cancelled';notes:string};
export type Review={id:string;contactId:string;platform:'google'|'facebook';rating:number;text:string;sentiment:'positive'|'neutral'|'negative';status:'invited'|'received'|'responded';at:string;response?:string};
export type InvoiceItem={desc:string;qty:number;price:number};
export type Invoice={id:string;contactId:string;number:string;items:InvoiceItem[];status:'draft'|'sent'|'paid'|'overdue';due:string;gateway:string};
export type Product={id:string;name:string;price:number;type:'one_time'|'subscription';gateway:string;description:string};
export type OrderForm={id:string;name:string;productId:string;fields:string[];views:number;orders:number};
export type Course={id:string;title:string;status:'draft'|'published';covers:string;modules:{id:string;title:string;lessons:{id:string;title:string;duration:number}[]}[];students:number};
export type Post={id:string;author:string;text:string;at:string;likes:number;replies:{id:string;author:string;text:string}[]};
export type Community={id:string;name:string;topic:string;members:number;posts:Post[]};
export type SubAccount={id:string;name:string;plan:string;domain:string;status:'active'|'trial'|'suspended';mrr:number};
export type Plan={id:string;name:string;price:number;features:string;subAccounts:number};
export type Branding={name:string;tagline:string;supportEmail:string;color:string;domain:string;logoText:string};

export type DB={contacts:Contact[];pipelines:Pipeline[];opportunities:Opportunity[];funnels:Funnel[];workflows:Workflow[];conversations:Conversation[];calendars:CalendarDef[];appointments:Appointment[];reviews:Review[];invoices:Invoice[];products:Product[];orderForms:OrderForm[];courses:Course[];communities:Community[];subAccounts:SubAccount[];plans:Plan[];branding:Branding;fieldDefs:{id:string;name:string;type:string}[];blasts:{id:string;name:string;channel:string;audience:string;subject?:string;body?:string;sent:number;opens:number;clicks:number;at:string}[];aiEmployees?:Row};

// Structural defaults applied to every new workspace. These are configuration,
// not demo data — all lists start empty until you create real records.
export function emptyDoc():DB{
 return {contacts:[],fieldDefs:[],pipelines:[{id:'p-sales',name:'Sales Pipeline',stages:['New Lead','Contacted','Qualified','Proposal','Negotiation','Won','Lost']}],opportunities:[],funnels:[],workflows:[],conversations:[],
  calendars:[{id:'cal-discovery',name:'Discovery Call',duration:30,buffer:10,days:[1,2,3,4,5],hours:'9:00am – 5:00pm',slug:'discovery',reminders:true,color:'#1f2837'}],
  appointments:[],reviews:[],invoices:[],products:[],orderForms:[],courses:[],communities:[],subAccounts:[],plans:[],
  branding:{name:'My Agency',tagline:'Growth, on autopilot.',supportEmail:'',color:'#1f2837',domain:'',logoText:'MA'},
  blasts:[],aiEmployees:{bot:{name:'Assistant',tone:'Friendly & concise',trained:'Pricing, services, hours, booking',active:true,greeting:'Hi! How can we help you today?'},voice:{name:'Receptionist',active:false,language:'English (US)',forward:''},writer:{tone:'Professional',audience:''},responder:{active:false,positive:'Thank you for the review!',negative:'We\u2019re sorry — let\u2019s make it right.'},calls:[]}};
}
function normalize(raw:Row|undefined|null):DB{const base=emptyDoc();if(!raw||typeof raw!=='object')return base;const doc={...base} as Row;for(const k of Object.keys(base)){if(raw[k]!==undefined&&raw[k]!==null)doc[k]=raw[k]}return doc as DB;}

export const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
export const now=()=>new Date().toISOString();
export const money=(n:number)=>'$'+(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
export const clock=(iso:string)=>new Date(iso).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export const daysAhead=(d:number,hour=10)=>{const x=new Date(Date.now()+d*864e5);x.setHours(hour,0,0,0);return x.toISOString()};

// Shared store: one fetch, many subscribers, debounced persistence.
let doc:DB|null=null;let userEmail='';let loadState:'idle'|'loading'|'ready'|'error'='idle';let loadError='';
const subs=new Set<()=>void>();
let saving=false;let dirtyAfterSave=false;let persistTimer:any=null;
function emit(){subs.forEach(f=>f())}
export function resetCrmStore(){doc=null;userEmail='';loadState='idle';loadError='';emit()}
async function fetchDoc(){
 loadState='loading';emit();
 try{const r=await fetch('/api/crm',{cache:'no-store'});const j=await r.json();
  if(!r.ok)throw new Error(j.error||'Could not load your workspace.');
  doc=normalize(j.doc);userEmail=String(j.user?.email||'');loadState='ready';loadError=''}
 catch(e){
  loadState='error';
  loadError=(e as Error).message;
  if(!doc)doc=emptyDoc();
 }
 emit();
}
function runPersist(){
 if(!doc||!userEmail)return;
 if(saving){dirtyAfterSave=true;return}
 saving=true;
 (async()=>{try{const r=await fetch('/api/crm',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(doc)});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||'Failed to save workspace.');}loadError=''}catch(e){loadError=(e as Error).message}finally{saving=false;if(dirtyAfterSave){dirtyAfterSave=false;runPersist()}emit()}})();
}
function persist(){
 if(!doc||!userEmail)return;
 if(persistTimer)clearTimeout(persistTimer);
 persistTimer=setTimeout(runPersist,250);
}
export function useCrm(){
 const [,force]=useState(0);const started=useRef(false);
 useEffect(()=>{const fn=()=>force(x=>x+1);subs.add(fn);
  if(!started.current&&!doc&&loadState==='idle'){started.current=true;fetchDoc()}
  else if(loadState==='error'&&!started.current){started.current=true;fetchDoc()}
  return()=>{subs.delete(fn)}},[]);
 const set=useCallback((fn:(d:DB)=>void)=>{if(!doc)doc=emptyDoc();fn(doc);persist();emit()},[]);
 return {db:doc||emptyDoc(),loaded:!!doc&&loadState!=='loading',loading:loadState==='loading',error:loadError,set,reload:fetchDoc,saving,userEmail};
}

export const contactName=(c?:Contact|Row)=>c?`${c.firstName} ${c.lastName}`.trim()||'Unnamed':'Unknown';
export const contactById=(db:DB,id:string)=>db.contacts.find(c=>c.id===id);
export const channelMeta:Record<string,{label:string}>={sms:{label:'SMS'},email:{label:'Email'},facebook:{label:'Facebook'},instagram:{label:'Instagram'},whatsapp:{label:'WhatsApp'}};
export const invoiceTotal=(i:Invoice)=>i.items.reduce((a,b)=>a+b.qty*b.price,0);
export const initials=(name:string)=>name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()||'?';

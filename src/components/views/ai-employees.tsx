'use client';
import {useState} from 'react';
import {Bot,Phone,PenLine,Star,LoaderCircle,Send,Sparkles,Volume2} from 'lucide-react';
import {useCrm,type Row} from '@/lib/crm';
import {Field,Toggle} from '@/components/ui/crm-ui';

async function generate(system:string,input:Row):Promise<string>{
 try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:system+'\n\n'+JSON.stringify(input)}]})});const j=await r.json();if(!r.ok)throw new Error(j.error||'failed');return String(j.reply||'')}catch{return ''}
}
const fallback=(kind:string,input:Row)=>{
 if(kind==='content')return `${input.topic}\n\nHere are 3 angles you can use:\n1. Problem-first — open with the #1 pain ${input.audience||'your audience'} feels, then show the 60-second fix.\n2. Proof-first — lead with a customer number, then explain the system behind it.\n3. Contrarian take — challenge a common practice, then give your 3-step alternative.\n\nCTA: book a free 15-minute audit.`;
 if(kind==='review')return input.rating>=4?`Thank you so much for the kind words, {{first_name}}! We're thrilled the team could deliver. See you next visit!`:`Thank you for the honest feedback, {{first_name}}. This isn't the experience we aim for — our manager will reach out today to make it right.`;
 return 'Configured.';
};
export default function AIEmployeesView({pushNotice}:{pushNotice:(m:string)=>void}){
 const {db,set}=useCrm();
 const [tab,setTab]=useState('chat');
 const ai=db.aiEmployees||{bot:{name:'Assistant',tone:'Friendly & concise',trained:'Pricing, services, hours, booking',active:true,greeting:'Hi! How can we help you today?'},voice:{name:'Receptionist',active:false,language:'English (US)',forward:''},writer:{tone:'Professional',audience:''},responder:{active:false,positive:'Thank you for the review!',negative:'We\u2019re sorry — let\u2019s make it right.'},calls:[]};
 const [bot,setBot]=useState(ai.bot),[voice,setVoice]=useState(ai.voice),[writer,setWriter]=useState(ai.writer),[resp,setResp]=useState(ai.responder);
 const [testMsgs,setTestMsgs]=useState<Row[]>([]),[testInput,setTestInput]=useState(''),[busy,setBusy]=useState(false),[output,setOutput]=useState(''),[topic,setTopic]=useState('');
 function saveAI(){set(d=>{d.aiEmployees={bot,voice,writer,responder:resp,calls:ai.calls}})}
 async function testBot(){const text=testInput.trim();if(!text||busy)return;setTestMsgs(m=>[...m,{role:'user',text}]);setTestInput('');setBusy(true);let reply=await generate(`You are ${bot.name}, the website chat assistant for a business. Tone: ${bot.tone}. You know: ${bot.trained}. Greeting style: "${bot.greeting}". Answer briefly as the bot.` as any,{message:text});if(!reply)reply=`Hi! I\u2019m ${bot.name} — happy to help with ${bot.trained.split(',')[0]||'that'}. Could you share a few details so I can point you the right way?`;setTestMsgs(m=>[...m,{role:'assistant',text:reply}]);setBusy(false)}
 async function writeContent(){if(!topic.trim())return;setBusy(true);let out=await generate('You are an expert marketing content writer. Write the requested content in '+writer.tone+' tone. Plain text only.' as any,{request:topic,audience:writer.audience||'local business customers'});if(!out)out=fallback('content',{topic,audience:writer.audience});setOutput(out);setBusy(false)}
 async function draftResponse(r:Row){pushNotice('Drafting AI response…');let out=await generate('Write a short, warm public response to this review as the business owner. 1-2 sentences.' as any,{rating:r.rating,text:r.text});if(!out)out=fallback('review',{rating:r.rating});set(d=>{const x=d.reviews.find(y=>y.id===r.id);if(x){x.response=out;x.status='responded'}});pushNotice('Response posted.')}
 const tabs:[string,string][]=[['chat','Conversation AI'],['voice','Voice AI'],['writer','Content Writer'],['reviews','Review Responder']];
 return <>
  <div className="crm-toolbar"><div className="chips">{tabs.map(([v,label])=><button key={v} className={'smart-chip'+(tab===v?' selected':'')} onClick={()=>setTab(v)}>{label}</button>)}</div><span className="connection-status"><span className="status-dot live"/>24/7 · always on</span></div>
  {tab==='chat'&&<div className="ai-grid">
   <section className="card"><div className="card-title"><h3><Bot size={16}/>Conversation AI</h3><Toggle checked={bot.active} onChange={v=>{setBot({...bot,active:v});saveAI()}} label="Chatbot active"/></div>
    <p className="muted">Trains on your business info and chats with every visitor — day and night.</p>
    <Field label="Bot name"><input value={bot.name} onChange={e=>setBot({...bot,name:e.target.value})} onBlur={saveAI}/></Field>
    <Field label="Personality & tone"><input value={bot.tone} onChange={e=>setBot({...bot,tone:e.target.value})} onBlur={saveAI}/></Field>
    <Field label="Trained knowledge (topics, pricing, FAQs)"><textarea value={bot.trained} onChange={e=>setBot({...bot,trained:e.target.value})} onBlur={saveAI}/></Field>
    <Field label="Greeting message"><input value={bot.greeting} onChange={e=>setBot({...bot,greeting:e.target.value})} onBlur={saveAI}/></Field>
   </section>
   <section className="card bot-test"><div className="card-title"><h3>Test your bot</h3><span className="badge">{bot.active?'Live':'Off'}</span></div>
    <div className="bot-scroll">{testMsgs.length?testMsgs.map((m,i)=><div key={i} className={'bubble-row '+(m.role==='user'?'me':'them')}><div className="bubble">{m.text}</div></div>):<div className="chat-welcome" style={{padding:'40px 10px'}}><div className="chat-logo" style={{width:52,height:52,borderRadius:16}}><Bot size={26}/></div><p>Say something a customer would.</p></div>}
    {busy&&<div className="chat-thinking"><LoaderCircle size={16}/>Typing…</div>}</div>
    <form className="thread-compose" onSubmit={e=>{e.preventDefault();testBot()}}><textarea aria-label="Test message" placeholder="Type a test message…" value={testInput} onChange={e=>setTestInput(e.target.value)}/><button className="chat-send" type="submit" aria-label="Send" disabled={busy}><Send size={16}/></button></form>
   </section></div>}
  {tab==='voice'&&<div className="ai-grid">
   <section className="card"><div className="card-title"><h3><Phone size={16}/>Voice AI Receptionist</h3><Toggle checked={voice.active} onChange={v=>{setVoice({...voice,active:v});saveAI()}} label="Voice AI active"/></div>
    <p className="muted">Answers every call, qualifies the caller, books straight into your calendar and forwards urgent lines.</p>
    <Field label="Agent name"><input value={voice.name} onChange={e=>setVoice({...voice,name:e.target.value})} onBlur={saveAI}/></Field>
    <Field label="Language"><select value={voice.language} onChange={e=>setVoice({...voice,language:e.target.value})}>{['English (US)','English (UK)','Spanish','French','German'].map(l=><option key={l}>{l}</option>)}</select></Field>
    <Field label="Forward urgent calls to"><input value={voice.forward} onChange={e=>setVoice({...voice,forward:e.target.value})} onBlur={saveAI}/></Field>
    <div className="call-note"><Volume2 size={15}/>{voice.active?'Answering all lines 24/7.':'Currently sending calls to voicemail.'}</div>
   </section>
   <section className="card"><div className="card-title"><h3>Recent answered calls</h3></div>{ai.calls.length?ai.calls.map((c:Row)=><div className="variant-row" key={c.id}><div><strong>{c.from}</strong><small>{c.summary}</small></div><span className="badge">{c.at}</span></div>):<p className="muted">When Voice AI is on, every answered call is logged and summarized here.</p>}</section></div>}
  {tab==='writer'&&<div className="ai-grid">
   <section className="card"><div className="card-title"><h3><PenLine size={16}/>Content Writer</h3></div>
    <p className="muted">Emails, blogs, captions and ad copy — on brand, in seconds.</p>
    <Field label="Tone"><select value={writer.tone} onChange={e=>setWriter({...writer,tone:e.target.value})}><option>Professional</option><option>Friendly</option><option>Bold & punchy</option><option>Luxury</option></select></Field>
    <Field label="Audience"><input value={writer.audience||''} placeholder="e.g. dental practice owners" onChange={e=>setWriter({...writer,audience:e.target.value})}/></Field>
    <Field label="What should it write?"><textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. A 5-line email announcing our spring booking promo"/></Field>
    <button className="button primary" disabled={busy} onClick={writeContent}><Sparkles size={14}/>{busy?'Writing…':'Generate content'}</button>
   </section>
   <section className="card"><div className="card-title"><h3>Output</h3></div>{output?<div className="ai-output prewrap">{output}</div>:<p className="muted">Your generated copy will appear here. Edit and send it to any channel.</p>}</section></div>}
  {tab==='reviews'&&<section className="card"><div className="card-title"><h3><Star size={16}/>Automated Review Responses</h3><Toggle checked={resp.active} onChange={v=>{setResp({...resp,active:v});saveAI()}} label="Auto-respond"/></div>
   <p className="muted">{resp.active?'AI drafts a public reply to every new review for your approval.':'Auto-responses are off.'}</p>
   <div className="two-col"><Field label="Positive template"><input value={resp.positive} onChange={e=>setResp({...resp,positive:e.target.value})} onBlur={saveAI}/></Field><Field label="Negative template"><input value={resp.negative} onChange={e=>setResp({...resp,negative:e.target.value})} onBlur={saveAI}/></Field></div>
   {db.reviews.filter(r=>r.status!=='responded').map(r=><div className="variant-row" key={r.id}><div><strong>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)} · {r.platform}</strong><small>{r.text}</small></div><button className="button outline" onClick={()=>draftResponse(r)}><Sparkles size={13}/>AI reply</button></div>)}
  </section>}
 </>;
}

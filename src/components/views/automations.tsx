'use client';
import {useState} from 'react';
import {Workflow,Plus,Zap,MessageSquare,Mail,Hourglass,GitBranch,Tag,MoveVertical,Globe,Target,Trash2,Play,Pause} from 'lucide-react';
import {useCrm,uid,now,type Row} from '@/lib/crm';
import {Field,Modal} from '@/components/ui/crm-ui';

const triggers:[string,string,string][]=[
  ['contact_created','Contact created','Any new contact enters your CRM'],
  ['contact_tagged','Contact tagged','A specific tag is applied'],
  ['form_submitted','Form submitted','A form or survey is completed'],
  ['appointment_booked','Appointment booked','Any calendar booking is made'],
  ['appointment_completed','Appointment completed','Visit or call marked complete'],
  ['appointment_no_show','No-show detected','Contact missed an appointment'],
  ['opportunity_stage','Opportunity stage changed','Deal moves to a chosen stage'],
  ['opportunity_status','Opportunity won/lost','Deal status changes'],
  ['invoice_paid','Invoice paid','A payment succeeds'],
  ['invoice_overdue','Invoice overdue','Payment passes due date'],
  ['course_started','Course started','A member begins a course'],
  ['course_completed','Course completed','A member finishes all lessons'],
  ['review_received','Review received','A Google/Facebook review lands'],
  ['reply_received','Reply received','Contact responds to outreach'],
  ['cart_abandoned','Cart abandoned','Order form left incomplete'],
  ['birthday','Birthday','Contact date anniversary'],
  ['custom_field_changed','Custom field changed','A tracked field is updated'],
  ['webhook_received','Inbound webhook','External event received'],
  ['note_added','Note added','Team member logs an interaction'],
  ['conversation_unread','Conversation unread','Message unanswered for X hours']
];

const actionMeta:Row={
  sms:{label:'Send SMS',icon:MessageSquare},
  email:{label:'Send email',icon:Mail},
  wait:{label:'Wait / delay',icon:Hourglass},
  ifthen:{label:'If / then branch',icon:GitBranch},
  tag:{label:'Add / remove tag',icon:Tag},
  stage:{label:'Move pipeline stage',icon:MoveVertical},
  webhook:{label:'Call webhook',icon:Globe},
  goal:{label:'Goal event',icon:Target}
};

const delays=['0 min','5 min','10 min','1 hour','1 day before','1 hour before','2 hrs','1 day','2 days','3 days','1 week','—'];

export default function AutomationsView({pushNotice}:{pushNotice:(m:string)=>void}){
  const {db,set}=useCrm();
  const [openId,setOpenId]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);

  const wf=db.workflows.find(w=>w.id===openId);

  function patch(id:string,fn:(w:typeof db.workflows[0])=>void){
    set(d=>{
      const w=d.workflows.find(x=>x.id===id);
      if(w)fn(w);
    });
  }

  function deleteWorkflow(id:string){
    set(d=>d.workflows=d.workflows.filter(w=>w.id!==id));
    if(openId===id)setOpenId(null);
    pushNotice('Workflow deleted.');
  }

  if(wf){
    return (
      <div className="workflow-builder">
        <div className="crm-toolbar">
          <button className="button outline" onClick={()=>setOpenId(null)}>← All workflows</button>
          <div className="workflow-title">
            <Workflow size={18}/>
            <strong>{wf.name}</strong>
            <span className={'badge '+(wf.status==='active'?'green':'')}>{wf.status}</span>
            <span className="muted">{wf.enrolled} enrolled</span>
          </div>
          <div className="crm-toolbar-right">
            <button className="button outline" onClick={()=>{
              patch(wf.id,w=>{w.status=w.status==='active'?'paused':'active'});
              pushNotice(wf.status==='active'?'Workflow paused.':'Workflow is live — new contacts will enroll.');
            }}>
              {wf.status==='active'?<Pause size={14}/>:<Play size={14}/>}
              {wf.status==='active'?'Pause':'Activate'}
            </button>
            <button className="button primary" onClick={()=>patch(wf.id,w=>{
              w.actions.push({id:uid(),type:'sms',config:'Hi {{first_name}}, quick follow-up!',delay:'0 min'});
            })}>
              <Plus size={14}/>Add action
            </button>
            <button
              className="button ghost"
              style={{color:'#b9757f'}}
              onClick={()=>deleteWorkflow(wf.id)}
              title="Delete workflow"
            >
              <Trash2 size={14}/>Delete
            </button>
          </div>
        </div>

        <div className="workflow-canvas">
          <div className="wf-node trigger">
            <span className="wf-icon"><Zap size={16}/></span>
            <div>
              <strong>Trigger: {triggers.find(t=>t[0]===wf.trigger)?.[1]||wf.trigger}</strong>
              <small>{wf.triggerConfig}</small>
            </div>
          </div>
          {wf.actions.map(a=>{
            const M=actionMeta[a.type]||actionMeta.sms;
            const Icon=M.icon;
            return (
              <div key={a.id}>
                <div className="wf-line"/>
                <div className={'wf-node'+(a.type==='ifthen'?' branch':'')}>
                  <span className="wf-icon"><Icon size={16}/></span>
                  <div className="wf-body">
                    <strong>{M.label}<em>{a.delay!=='—'?' · after '+a.delay:''}</em></strong>
                    <input
                      value={a.config}
                      onChange={e=>patch(wf.id,w=>{
                        const x=w.actions.find(y=>y.id===a.id);
                        if(x)x.config=e.target.value;
                      })}
                      aria-label="Action configuration"
                    />
                  </div>
                  <div className="wf-controls">
                    <select
                      value={a.delay}
                      onChange={e=>patch(wf.id,w=>{
                        const x=w.actions.find(y=>y.id===a.id);
                        if(x)x.delay=e.target.value;
                      })}
                      aria-label="Delay"
                    >
                      {delays.map(d2=><option key={d2}>{d2}</option>)}
                    </select>
                    <button
                      className="wf-action-select"
                      aria-label="Change action type"
                      onClick={()=>{
                        const order=Object.keys(actionMeta);
                        const next=order[(order.indexOf(a.type)+1)%order.length];
                        patch(wf.id,w=>{
                          const x=w.actions.find(y=>y.id===a.id);
                          if(x)x.type=next as any;
                        });
                      }}
                    >
                      {M.label}
                    </button>
                    <button
                      aria-label="Remove action"
                      onClick={()=>patch(wf.id,w=>{w.actions=w.actions.filter(y=>y.id!==a.id);})}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="wf-line end"/>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="crm-toolbar">
        <span className="muted">Visual if/then automation. Behavioral triggers fire multi-channel follow-ups on autopilot.</span>
        <button className="button primary" onClick={()=>setCreating(true)}>
          <Plus size={15}/>New workflow
        </button>
      </div>

      {db.workflows.length>0?(
        <div className="workflow-grid">
          {db.workflows.map(w=>{
            const Icon=Workflow;
            return (
              <section className="card" key={w.id}>
                <div className="card-title">
                  <h3><Icon size={16}/>{w.name}</h3>
                  <span className={'badge '+(w.status==='active'?'green':'')}>{w.status}</span>
                </div>
                <p className="muted">When <strong>{triggers.find(t=>t[0]===w.trigger)?.[1]||w.trigger}</strong> · then {w.actions.length} actions</p>
                <div className="wf-chain">
                  {w.actions.slice(0,5).map(a=><span key={a.id} title={a.config}>{actionMeta[a.type]?.label||a.type}</span>)}
                </div>
                <div className="workflow-foot">
                  <small>{w.enrolled} contacts enrolled</small>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button className="button outline" onClick={()=>setOpenId(w.id)}>Open builder</button>
                    <button
                      aria-label="Delete workflow"
                      onClick={()=>deleteWorkflow(w.id)}
                      style={{color:'#777f76',padding:4}}
                      title="Delete workflow"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ):(
        <section className="card">
          <div className="empty">
            <span className="empty-icon"><Workflow size={22}/></span>
            <h3>No workflows yet</h3>
            <p>Create your first behavioral trigger follow-up workflow above.</p>
          </div>
        </section>
      )}

      {creating&&(
        <Modal title="New workflow" subtitle="Pick a behavioral trigger — 20+ events supported." onClose={()=>setCreating(false)}>
          <form onSubmit={e=>{
            e.preventDefault();
            const fd=new FormData(e.currentTarget);
            const w={
              id:uid(),
              name:String(fd.get('name')),
              status:'draft' as const,
              trigger:String(fd.get('trigger')),
              triggerConfig:String(fd.get('config')||'Any'),
              enrolled:0,
              actions:[
                {id:uid(),type:'sms' as const,config:'Hi {{first_name}}, thanks for reaching out!',delay:'0 min'}
              ],
              createdAt:now()
            };
            set(d=>d.workflows.unshift(w));
            setCreating(false);
            setOpenId(w.id);
            pushNotice('Workflow created.');
          }}>
            <Field label="Workflow name">
              <input name="name" required placeholder="Fast lead response"/>
            </Field>
            <Field label="Trigger">
              <select name="trigger">
                {triggers.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Trigger configuration">
              <input name="config" placeholder="Any contact / specific tag / calendar name…"/>
            </Field>
            <button className="button primary" type="submit">Create workflow</button>
          </form>
        </Modal>
      )}
    </>
  );
}

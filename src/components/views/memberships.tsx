'use client';
import {useState} from 'react';
import {GraduationCap,Plus,Users,Heart,MessageCircle,Lock,Globe,BookOpen,Trash2} from 'lucide-react';
import {useCrm,uid,now,type Row} from '@/lib/crm';
import {Field,Modal,Toggle} from '@/components/ui/crm-ui';

export default function MembershipsView({pushNotice}:{pushNotice:(m:string)=>void}){
  const {db,set}=useCrm();
  const [tab,setTab]=useState('courses');
  const [newCourse,setNewCourse]=useState(false);
  const [newCommunity,setNewCommunity]=useState(false);

  function addCourse(fd:Row){
    set(d=>d.courses.unshift({
      id:uid(),
      title:fd.title,
      status:'draft',
      covers:fd.covers||'acquisition',
      modules:[{id:uid(),title:'Module 1',lessons:[{id:uid(),title:'Welcome & Overview',duration:5}]}],
      students:0
    }));
    setNewCourse(false);
    pushNotice('Course created — add lessons and publish when ready.');
  }

  function deleteCourse(id:string){
    set(d=>d.courses=d.courses.filter(c=>c.id!==id));
    pushNotice('Course removed.');
  }

  function addLesson(courseId:string,moduleId:string,title:string){
    set(d=>{
      const c=d.courses.find(x=>x.id===courseId);
      const m=c?.modules.find(x=>x.id===moduleId);
      m?.lessons.push({id:uid(),title,duration:10});
    });
    pushNotice('Lesson added.');
  }

  function addPost(communityId:string,text:string){
    set(d=>{
      const c=d.communities.find(x=>x.id===communityId);
      c?.posts.unshift({id:uid(),author:'You',text,at:now(),likes:0,replies:[]});
    });
    pushNotice('Post published.');
  }

  function deleteCommunity(id:string){
    set(d=>d.communities=d.communities.filter(c=>c.id!==id));
    pushNotice('Community removed.');
  }

  return (
    <>
      <div className="crm-tabs">
        {[['courses','Courses'],['communities','Communities'],['portal','Client portal']].map(([v,label])=>(
          <button key={v} className={tab===v?'selected':''} onClick={()=>setTab(v)}>{label}</button>
        ))}
        <span className="crm-tabs-right">
          {tab==='courses'&&<button className="button primary" onClick={()=>setNewCourse(true)}><Plus size={14}/>New course</button>}
          {tab==='communities'&&<button className="button primary" onClick={()=>setNewCommunity(true)}><Plus size={14}/>New community</button>}
        </span>
      </div>

      {tab==='courses'&&(
        db.courses.length>0?(
          <div className="membership-grid">
            {db.courses.map(c=>(
              <section className="card" key={c.id}>
                <div className="card-title">
                  <h3><GraduationCap size={16}/>{c.title}</h3>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <Toggle
                      checked={c.status==='published'}
                      onChange={v=>{
                        set(d=>{
                          const x=d.courses.find(y=>y.id===c.id);
                          if(x)x.status=v?'published':'draft';
                        });
                        pushNotice(v?'Course published to your members area.':'Course unpublished.');
                      }}
                      label="Publish"
                    />
                    <button onClick={()=>deleteCourse(c.id)} style={{color:'#777f76',padding:3}} title="Delete course">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
                <p className="muted">{c.students} students · {c.modules.length} modules · {c.modules.reduce((a,m)=>a+m.lessons.length,0)} lessons</p>
                {c.modules.map(m=>(
                  <details key={m.id} className="course-module" open>
                    <summary><strong>{m.title}</strong><small>{m.lessons.length} lessons</small></summary>
                    {m.lessons.map(l=>(
                      <div className="lesson-row" key={l.id}>
                        <BookOpen size={13}/><span>{l.title}</span><small>{l.duration} min</small>
                      </div>
                    ))}
                    <button className="text-link" onClick={()=>addLesson(c.id,m.id,'New lesson')}>
                      <Plus size={12}/>Add lesson
                    </button>
                  </details>
                ))}
              </section>
            ))}
          </div>
        ):(
          <section className="card">
            <div className="empty">
              <span className="empty-icon"><GraduationCap size={22}/></span>
              <h3>No courses yet</h3>
              <p>Create curriculum, modules, and lessons for your students or clients.</p>
            </div>
          </section>
        )
      )}

      {tab==='communities'&&(
        db.communities.length>0?(
          <div className="membership-grid">
            {db.communities.map(cm=>(
              <section className="card community-card" key={cm.id}>
                <div className="card-title">
                  <h3><Users size={16}/>{cm.name}</h3>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span className="badge green"><Globe size={11}/>{cm.members} members</span>
                    <button onClick={()=>deleteCommunity(cm.id)} style={{color:'#777f76',padding:3}} title="Delete community">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
                <p className="muted">{cm.topic||'General discussion'}</p>
                <div className="post-feed">
                  {cm.posts.map(p=>(
                    <div className="post" key={p.id}>
                      <div className="post-head">
                        <i className="contact-avatar">{p.author.slice(0,1)}</i>
                        <strong>{p.author}</strong>
                        <small>{new Date(p.at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small>
                      </div>
                      <p className="prewrap">{p.text}</p>
                      <div className="post-actions">
                        <button onClick={()=>set(d=>{
                          const x=d.communities.find(y=>y.id===cm.id);
                          const q=x?.posts.find(y=>y.id===p.id);
                          if(q)q.likes++;
                        })}>
                          <Heart size={13}/>{p.likes}
                        </button>
                        <button><MessageCircle size={13}/>{p.replies.length}</button>
                      </div>
                    </div>
                  ))}
                  {!cm.posts.length&&<p className="muted" style={{padding:'12px 0'}}>Be the first to post in this community.</p>}
                </div>
                <PostForm onPost={t=>addPost(cm.id,t)}/>
              </section>
            ))}
          </div>
        ):(
          <section className="card">
            <div className="empty">
              <span className="empty-icon"><Users size={22}/></span>
              <h3>No communities yet</h3>
              <p>Build private interactive community groups for your client network.</p>
            </div>
          </section>
        )
      )}

      {tab==='portal'&&(
        <section className="card portal-preview">
          <div className="card-title">
            <h3><Lock size={16}/>Client portal</h3>
            <span className="badge">Members-only area</span>
          </div>
          <p className="muted">Every customer gets a branded login with their courses, communities, invoices and bookings in one place.</p>
          <div className="portal-mock">
            <div className="portal-side">
              <strong>{db.branding?.name||'LeadSignal Portal'}</strong>
              {['Dashboard','My courses','Community','Appointments','Billing'].map(x=><span key={x}>{x}</span>)}
            </div>
            <div className="portal-main">
              <h4>Welcome back, Client</h4>
              <div className="portal-cards">
                {db.courses.map(c=>(
                  <div key={c.id}>
                    <strong>{c.title}</strong>
                    <small>{c.status} · {c.modules.length} modules</small>
                  </div>
                ))}
                {!db.courses.length&&(
                  <p className="muted">Published courses will be accessible here.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {newCourse&&(
        <Modal title="New course" subtitle="Host unlimited courses — replace external LMS platforms." onClose={()=>setNewCourse(false)}>
          <form onSubmit={e=>{e.preventDefault();addCourse(Object.fromEntries(new FormData(e.currentTarget) as any));}}>
            <Field label="Course title"><input name="title" required placeholder="Client Onboarding Mastery"/></Field>
            <Field label="Category">
              <select name="covers">
                <option value="acquisition">Acquisition</option>
                <option value="operations">Operations</option>
                <option value="retention">Retention</option>
              </select>
            </Field>
            <button className="button primary" type="submit">Create course</button>
          </form>
        </Modal>
      )}

      {newCommunity&&(
        <Modal title="New community" subtitle="An interactive space for your members or clients." onClose={()=>setNewCommunity(false)}>
          <form onSubmit={e=>{
            e.preventDefault();
            const fd=Object.fromEntries(new FormData(e.currentTarget) as any);
            set(d=>d.communities.unshift({id:uid(),name:fd.name,topic:fd.topic||'',members:1,posts:[]}));
            setNewCommunity(false);
            pushNotice('Community created.');
          }}>
            <Field label="Community name"><input name="name" required placeholder="Growth Mastermind Inner Circle"/></Field>
            <Field label="Topic"><input name="topic" placeholder="Weekly Q&A and deal flow"/></Field>
            <button className="button primary" type="submit">Create community</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function PostForm({onPost}:{onPost:(t:string)=>void}){
  const [text,setText]=useState('');
  return (
    <form className="post-form" onSubmit={e=>{e.preventDefault();if(!text.trim())return;onPost(text.trim());setText('');}}>
      <input aria-label="Write a post" placeholder="Share something with the group…" value={text} onChange={e=>setText(e.target.value)}/>
      <button className="button primary" type="submit" disabled={!text.trim()}>Post</button>
    </form>
  );
}

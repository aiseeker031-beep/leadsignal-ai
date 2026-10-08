"use client";
import ContactsView from './views/contacts';
import PipelinesView from './views/pipelines';
import ConversationsView from './views/conversations';
import CalendarsView from './views/calendars';
import AutomationsView from './views/automations';
import FunnelsView from './views/funnels';
import AIEmployeesView from './views/ai-employees';
import ReputationView from './views/reputation';
import PaymentsView from './views/payments';
import MembershipsView from './views/memberships';
import SaaSView from './views/saas';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {Users,Columns3,Inbox,CalendarDays,Workflow,Globe,Sparkles,Star,CreditCard,GraduationCap,Building2,ShieldCheck,Radio,LoaderCircle,Menu,LogIn,X,ChevronsUpDown,PanelLeftClose,ArrowRight} from 'lucide-react';
import {Button} from './ui/button';
import {useCrm} from '@/lib/crm';
import {Field} from './ui/crm-field';

type Row=Record<string,any>;

const GoogleIcon=()=>(
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{flexShrink:0}}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const nav=[
  ['contacts','Contacts',Users],
  ['crm','Pipelines',Columns3],
  ['conversations','Conversations',Inbox],
  ['calendars','Calendars',CalendarDays],
  ['automations','Automations',Workflow],
  ['funnels','Funnels',Globe],
  ['ai','AI Employees',Sparkles],
  ['reputation','Reputation',Star],
  ['payments','Payments',CreditCard],
  ['memberships','Memberships',GraduationCap],
  ['saas','SaaS Mode',Building2]
] as const;

const subtitles:Row={
  contacts:'Unlimited contacts, smart lists and full histories.',
  crm:'A clear path from first signal to new client.',
  conversations:'Every channel. One inbox.',
  calendars:'Booking that fills itself.',
  automations:'Follow-ups that run themselves.',
  funnels:'Pages that turn visits into revenue.',
  ai:'Your always-on team of AI specialists.',
  reputation:'Turn happy customers into 5-star proof.',
  payments:'Get paid — invoices, products, checkouts.',
  memberships:'Courses, communities and client portals.',
  saas:'Your brand. Your platform. Your revenue.'
};

export default function Workspace({view}:{view:string}){
  const crm=useCrm();
  const sp=useSearchParams();
  const [health,setHealth]=useState<Row|null>(null);
  const [notice,setNotice]=useState('');
  const [failure,setFailure]=useState(false);
  const [menu,setMenu]=useState(false);
  const [auth,setAuth]=useState(false);
  const [authBusy,setAuthBusy]=useState(false);
  const [expanded,setExpanded]=useState(false);

  useEffect(()=>{
    try{setExpanded(localStorage.getItem('leadsignal.sidebar.v1')==='expanded')}catch{}
  },[]);

  useEffect(()=>{
    fetch('/api/health',{cache:'no-store'})
      .then(r=>r.json())
      .then(setHealth)
      .catch(()=>setHealth({database:false}));
  },[]);

  useEffect(()=>{
    const authStatus=sp.get('auth');
    if(authStatus==='failed'){
      const err=sp.get('error');
      setNotice(err?decodeURIComponent(err):'Authentication failed or was canceled. Please try again.');
      setFailure(true);
    }else if(authStatus==='success'){
      setNotice('Signed in successfully! Your workspace is synced.');
      setFailure(false);
    }else if(authStatus==='signin'){
      setAuth(true);
    }
  },[sp]);

  async function signOut(){
    setAuthBusy(true);
    try{
      await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      window.location.href='/contacts';
    }finally{
      setAuthBusy(false);
    }
  }

  async function signIn(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setAuthBusy(true);
    setNotice('');
    const f=new FormData(e.currentTarget);
    try{
      const r=await fetch('/api/auth',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:f.get('email'),password:f.get('password'),mode:f.get('mode')})
      });
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||'Authentication failed.');
      setAuth(false);
      window.location.reload();
    }catch(err){
      setFailure(true);
      setNotice((err as Error).message);
    }finally{
      setAuthBusy(false);
    }
  }

  async function google(){
    setAuthBusy(true);
    setNotice('');
    try{
      const r=await fetch('/api/auth',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'oauth',next:'/'+view})
      });
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||'Google sign-in unavailable.');
      window.location.href=j.url;
    }catch(err){
      setFailure(true);
      setNotice((err as Error).message);
      setAuthBusy(false);
      setAuth(true);
    }
  }

  const title=nav.find(n=>n[0]===view)?.[1]||'Contacts';
  const email=crm.userEmail;
  const needsAuth=!email;
  const dbDown=health!==null&&!health.database;
  const viewProps={pushNotice:setNotice};

  return (
    <div className={'app view-'+view+(expanded?' sidebar-expanded':'')}>
      <button className={'nav-scrim '+(menu?'visible':'')} aria-label="Close navigation" onClick={()=>setMenu(false)}/>
      <aside className={menu?'sidebar open':'sidebar'}>
        <Link className="brand" href="/" aria-label="Home">
          <span className="brand-icon"><Radio size={24}/></span>
          <span>LeadSignal<span className="brand-dot">.</span></span>
        </Link>
        <button
          className="sidebar-toggle"
          onClick={()=>setExpanded(v=>{try{localStorage.setItem('leadsignal.sidebar.v1',v?'collapsed':'expanded')}catch{}return !v})}
          aria-label={expanded?'Collapse sidebar':'Expand sidebar'}
          aria-expanded={expanded}
        >
          <PanelLeftClose size={20}/>
          <span>{expanded?'Collapse':'Expand'}</span>
        </button>
        <div className="nav-label">CRM SUITE</div>
        <nav aria-label="Main navigation">
          {nav.map(([href,label,Icon],i)=>(
            <Link
              key={href}
              href={'/'+href}
              title={label}
              aria-label={label}
              onClick={()=>setMenu(false)}
              aria-current={view===href?'page':undefined}
              className={(view===href?'active ':'')+(i===8?'nav-divider':'')}
            >
              <Icon size={18}/>
              <span>{label}</span>
              {view===href&&<span className="active-mark"/>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="signal-note">
            <span className="note-icon"><ShieldCheck size={18}/></span>
            <strong>Your workspace. Yours alone.</strong>
            <p>Every record is stored in<br/>your own database.</p>
          </div>
          <button className="profile" aria-label={email?'Account menu':'Sign in'} onClick={()=>email?signOut():setAuth(true)}>
            <span className="avatar">{email?email.slice(0,1).toUpperCase():<LogIn size={17}/>}</span>
            <span>
              {email||'Your account'}
              <small>{email?'Click to sign out':'Sign in to sync your data'}</small>
            </span>
            <ChevronsUpDown size={14}/>
          </button>
        </div>
      </aside>

      <div className="main">
        <header>
          <div className="breadcrumb">
            <button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Toggle navigation">
              <Menu size={20}/>
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="header-right">
            <span className="connection-status" title={dbDown?'Database not configured':email?'Database synced & live':'Preview mode'}>
              <span className={!dbDown&&!!email?'status-dot live':'status-dot'}/>
              {dbDown?'Database not configured':email?'Connected to Supabase':'Preview mode'}
            </span>
            <span className="header-rule"/>
            {email?(
              <button className="avatar" onClick={signOut} title={`Signed in as ${email}. Click to sign out.`} aria-label="Account">
                {email.slice(0,1).toUpperCase()}
              </button>
            ):(
              <button className="button primary auth-nav-btn" onClick={()=>setAuth(true)} style={{minHeight:34,padding:'6px 14px',fontSize:12}}>
                <LogIn size={14}/>Sign in
              </button>
            )}
          </div>
        </header>

        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR GROWTH PLATFORM</div>
              <h1>{title}</h1>
              <p>{subtitles[view]||''}</p>
            </div>
            {needsAuth&&!dbDown&&(
              <button className="button outline" onClick={google} disabled={authBusy} style={{gap:8}}>
                <GoogleIcon/>Continue with Google
              </button>
            )}
          </div>

          {notice&&(
            <div className={'notice '+(failure?'error':'')} role="status">
              {notice}
              <button aria-label="Dismiss notification" onClick={()=>{setNotice('');setFailure(false)}}>
                <X size={16}/>
              </button>
            </div>
          )}

          {dbDown&&(
            <div className="setup-banner">
              <ShieldCheck size={17}/>
              <span>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment, then apply the migration in supabase/migrations/001_crm.sql.</span>
            </div>
          )}

          {needsAuth&&!dbDown&&(
            <div className="setup-banner" style={{background:'#edf2f7',borderColor:'#cbd5e1',color:'#334155'}}>
              <LogIn size={17}/>
              <span>You are viewing in preview mode. Sign in with Google to sync your data to your Supabase database.</span>
              <button onClick={()=>setAuth(true)} style={{fontWeight:600,color:'#1f2837',display:'inline-flex',alignItems:'center',gap:4}}>
                Sign in <ArrowRight size={14}/>
              </button>
            </div>
          )}

          {crm.loading&&(
            <div className="loading"><LoaderCircle size={16}/>Loading workspace…</div>
          )}

          {crm.loaded&&(
            <>
              {view==='contacts'&&<ContactsView {...viewProps}/>}
              {view==='crm'&&<PipelinesView {...viewProps}/>}
              {view==='conversations'&&<ConversationsView {...viewProps}/>}
              {view==='calendars'&&<CalendarsView {...viewProps}/>}
              {view==='automations'&&<AutomationsView {...viewProps}/>}
              {view==='funnels'&&<FunnelsView {...viewProps}/>}
              {view==='ai'&&<AIEmployeesView {...viewProps}/>}
              {view==='reputation'&&<ReputationView {...viewProps}/>}
              {view==='payments'&&<PaymentsView {...viewProps}/>}
              {view==='memberships'&&<MembershipsView {...viewProps}/>}
              {view==='saas'&&<SaaSView {...viewProps}/>}
            </>
          )}

          <footer>
            <span><ShieldCheck size={13}/>Your data, your database.</span>
            <span>LeadSignal CRM <span className="footer-dot">·</span> Built-in AI: gemini-3.6-flash</span>
          </footer>
        </main>
      </div>

      {auth&&(
        <div className="overlay">
          <section role="dialog" aria-modal="true" className="modal">
            <button className="close" aria-label="Close" onClick={()=>setAuth(false)}>
              <X/>
            </button>
            <h2>Welcome to LeadSignal</h2>
            <p>Sign in to your private workspace to sync your CRM across devices.</p>

            {notice&&(
              <div className={'notice '+(failure?'error':'success')} role="status" style={{margin:'12px 0'}}>
                {notice}
              </div>
            )}

            <button
              type="button"
              className="button outline google-btn"
              disabled={authBusy||!health?.database}
              onClick={google}
              style={{width:'100%',justifyContent:'center',padding:'12px 18px',fontSize:14,fontWeight:600,gap:10,margin:'16px 0 20px'}}
            >
              <GoogleIcon/>Continue with Google
            </button>

            <div className="auth-divider" style={{display:'flex',alignItems:'center',gap:12,margin:'16px 0 20px',color:'#777f76',fontSize:12}}>
              <span style={{flex:1,height:1,background:'var(--border)'}}/>
              <span>or use email</span>
              <span style={{flex:1,height:1,background:'var(--border)'}}/>
            </div>

            <form onSubmit={signIn}>
              <Field label="Email">
                <input name="email" type="email" required placeholder="you@company.com"/>
              </Field>
              <Field label="Password">
                <input name="password" type="password" minLength={8} required placeholder="••••••••"/>
              </Field>
              <Field label="Action">
                <select name="mode">
                  <option value="signin">Sign in</option>
                  <option value="signup">Create account</option>
                </select>
              </Field>
              <Button disabled={authBusy||!health?.database} type="submit" style={{width:'100%',marginTop:12}}>
                {authBusy?'Please wait…':'Continue with Email'}
              </Button>
              {!health?.database&&<p style={{color:'#b9757f',fontSize:12,marginTop:8}}>Supabase must be configured first.</p>}
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

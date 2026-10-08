import {chat,chatInput} from '@/lib/chat';
import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {context,db,builtinAI,AppError} from '@/lib/server';
import {defaultMcpReachable} from '@/lib/composio';

export const runtime='nodejs';
export const maxDuration=300;

const chatLimits=new Map<string,{until:number;count:number}>();
function limitChat(req:NextRequest){
  const now=Date.now();
  for(const [k,v] of chatLimits)if(v.until<now)chatLimits.delete(k);
  const ip=req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')||'unknown';
  const key=createHash('sha256').update(ip).digest('hex');
  const v=chatLimits.get(key)||{until:now+60000,count:0};
  if(v.count>=12||chatLimits.size>10000)throw new AppError('Please wait a minute before sending another message.',429);
  v.count++;
  chatLimits.set(key,v);
}

function proxyOrigin(req:NextRequest){
  const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||req.nextUrl.host||'').split(',')[0].trim();
  if(!host)return req.nextUrl.origin;
  const proto=(req.headers.get('x-forwarded-proto')||(host.startsWith('localhost')||host.startsWith('127.0.0.1')||host.startsWith('0.0.0.0')?'http':'https')).split(',')[0].trim();
  return `${proto}://${host}`;
}

function sameOrigin(req:NextRequest){
  if(req.method==='GET')return true;
  const origin=req.headers.get('origin');
  if(!origin)return true;
  try{
    const originUrl=new URL(origin);
    const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||req.nextUrl.host||'').split(',')[0].trim();
    if(origin===req.nextUrl.origin||originUrl.host===host)return true;
    const proto=(req.headers.get('x-forwarded-proto')||(host.startsWith('localhost')||host.startsWith('127.0.0.1')||host.startsWith('0.0.0.0')?'http':'https')).split(',')[0].trim();
    return origin===`${proto}://${host}`||origin===`https://${host}`;
  }catch{
    return false;
  }
}

const docSchema=z.object({
  contacts:z.array(z.any()).default([]),
  fieldDefs:z.array(z.any()).default([]),
  pipelines:z.array(z.any()).default([]),
  opportunities:z.array(z.any()).default([]),
  funnels:z.array(z.any()).default([]),
  workflows:z.array(z.any()).default([]),
  conversations:z.array(z.any()).default([]),
  calendars:z.array(z.any()).default([]),
  appointments:z.array(z.any()).default([]),
  reviews:z.array(z.any()).default([]),
  invoices:z.array(z.any()).default([]),
  products:z.array(z.any()).default([]),
  orderForms:z.array(z.any()).default([]),
  courses:z.array(z.any()).default([]),
  communities:z.array(z.any()).default([]),
  subAccounts:z.array(z.any()).default([]),
  plans:z.array(z.any()).default([]),
  branding:z.record(z.string(),z.any()).optional().default({}),
  aiEmployees:z.record(z.string(),z.any()).optional().default({}),
  blasts:z.array(z.any()).default([])
}).passthrough();

async function handler(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
  try{
    const path=(await params).path.join('/');
    if(!sameOrigin(req))throw new AppError('Cross-origin request rejected.',403);

    if(path==='plugin-health')return NextResponse.json({connected:await defaultMcpReachable()});
    if(path==='health')return NextResponse.json({
      database:!!(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)&&!!(process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      ai:true,
      model:builtinAI().model,
      mcp:await defaultMcpReachable()
    });

    if(path==='chat'){
      if(req.method!=='POST')throw new AppError('Use POST for chat.',405);
      limitChat(req);
      const input=chatInput.parse(await req.json());
      return NextResponse.json(await chat(input.messages));
    }

    if(path==='auth'){
      const b=z.object({
        email:z.string().email().optional(),
        password:z.string().min(8).optional(),
        mode:z.enum(['signin','signup','oauth']),
        next:z.string().optional()
      }).refine(x=>x.mode==='oauth'||(!!x.email&&!!x.password),{message:'Email and password are required.'}).parse(await req.json());
      const c=await db();

      if(b.mode==='oauth'){
        const next=b.next||'/contacts';
        const redirectTarget=`${proxyOrigin(req)}/auth/callback?next=${encodeURIComponent(next)}`;
        const r=await c.auth.signInWithOAuth({
          provider:'google',
          options:{
            redirectTo:redirectTarget,
            queryParams:{
              access_type:'offline',
              prompt:'consent'
            }
          }
        });
        if(r.error||!r.data?.url)throw new AppError(r.error?.message||'Google sign-in is not available yet. The Google provider must be enabled on the Supabase project first.',501);
        return NextResponse.json({url:r.data.url});
      }

      const r=b.mode==='signup'?await c.auth.signUp({email:b.email!,password:b.password!}):await c.auth.signInWithPassword({email:b.email!,password:b.password!});
      if(r.error)throw new AppError(r.error.message,401);
      return NextResponse.json({message:b.mode==='signup'?'Account created. Check your email to confirm.':'Signed in.'});
    }

    const {db:c,user}=await context();

    if(path==='logout'){
      await c.auth.signOut();
      return NextResponse.json({message:'Signed out'});
    }

    if(path==='crm'&&req.method==='GET'){
      const row=await c.from('crm_workspace').select('data').eq('user_id',user.id).maybeSingle();
      if(row.error)throw new AppError('Database operation failed. Apply migration 001_crm.sql.',500);
      return NextResponse.json({doc:row.data?.data||{},user:{email:user.email}});
    }

    if(path==='crm'&&req.method==='PUT'){
      const doc=docSchema.parse(await req.json());
      const r=await c.from('crm_workspace').upsert({user_id:user.id,data:doc,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(r.error)throw new AppError('Saving failed. Check migration 001_crm.sql is applied.',500);
      return NextResponse.json({message:'Saved'});
    }

    throw new AppError('This operation is unsupported.',404,'unsupported');
  }catch(e){
    if(e instanceof z.ZodError)return NextResponse.json({error:e.issues.map(i=>i.path.join('.')+': '+i.message).join('; '),state:'failed'},{status:400});
    const err=e instanceof AppError?e:new AppError((e as Error).message||'Operation failed. Please try again.',500);
    console.error('request_failed',{status:err.status,state:err.state,message:err.message});
    return NextResponse.json({error:err.message,state:err.state},{status:err.status});
  }
}

export const GET=handler;
export const POST=handler;
export const PUT=handler;
export const PATCH=handler;

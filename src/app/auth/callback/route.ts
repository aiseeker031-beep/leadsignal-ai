import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

export const runtime='nodejs';

function originOf(req:NextRequest){
  const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||req.nextUrl.host||'localhost:3000').split(',')[0].trim();
  const proto=(req.headers.get('x-forwarded-proto')||(host.startsWith('localhost')||host.startsWith('127.0.0.1')||host.startsWith('0.0.0.0')?'http':'https')).split(',')[0].trim();
  return `${proto}://${host}`;
}

export async function GET(req:NextRequest){
  const origin=originOf(req);
  const url=req.nextUrl;
  const desc=url.searchParams.get('error_description')||url.searchParams.get('error');
  const code=url.searchParams.get('code');
  const next=url.searchParams.get('next')||'/contacts';
  const targetPath=next.startsWith('/')?next:'/contacts';

  if(!code||desc){
    const errText=encodeURIComponent(desc||'Authentication was canceled or denied.');
    return NextResponse.redirect(`${origin}${targetPath}?auth=failed&error=${errText}`);
  }

  const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if(!supabaseUrl||!supabaseKey){
    return NextResponse.redirect(`${origin}${targetPath}?auth=failed&error=${encodeURIComponent('Database is not configured.')}`);
  }

  const cookieStore=await cookies();
  const response=NextResponse.redirect(`${origin}${targetPath}?auth=success`);

  try{
    const client=createServerClient(supabaseUrl,supabaseKey,{
      cookies:{
        getAll(){
          return cookieStore.getAll();
        },
        setAll(cookiesToSet){
          cookiesToSet.forEach(({name,value,options})=>{
            try{cookieStore.set(name,value,options);}catch{}
            response.cookies.set(name,value,options);
          });
        }
      }
    });

    const {error}=await client.auth.exchangeCodeForSession(code);
    if(error){
      console.error('OAuth exchangeCodeForSession failed:',error.message);
      return NextResponse.redirect(`${origin}${targetPath}?auth=failed&error=${encodeURIComponent(error.message)}`);
    }

    return response;
  }catch(e){
    console.error('OAuth callback handler exception:',e);
    return NextResponse.redirect(`${origin}${targetPath}?auth=failed&error=${encodeURIComponent((e as Error).message||'Authentication failed.')}`);
  }
}

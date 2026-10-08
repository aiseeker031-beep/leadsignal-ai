import {NextRequest,NextResponse} from 'next/server';import {db} from '@/lib/server';
export const runtime='nodejs';
function originOf(req:NextRequest){const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||'localhost:3000').split(',')[0].trim();const proto=host.startsWith('localhost')?'http':'https';return `${proto}://${host}`;}
export async function GET(req:NextRequest){
 const dest=(failed:boolean)=>NextResponse.redirect(originOf(req)+(failed?'/contacts?auth=failed':'/contacts'));
 try{
  const url=req.nextUrl;
  const desc=url.searchParams.get('error_description')||url.searchParams.get('error');
  const code=url.searchParams.get('code');
  if(!code||desc)return dest(true);
  const client=await db();
  const {error}=await client.auth.exchangeCodeForSession(code);
  return dest(!!error);
 }catch{return dest(true)}}

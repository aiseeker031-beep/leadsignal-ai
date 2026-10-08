import Workspace from '@/components/workspace';import {redirect} from 'next/navigation';import {Suspense} from 'react';
const legacy=['search','leads','outreach','replies','campaigns','integrations','settings'];
export default async function Page({params}:{params:Promise<{view?:string[]}>}){
 const view=(await params).view?.[0]||'contacts';
 if(!view||legacy.includes(view)||view==='dashboard')redirect('/contacts');
 if(!['contacts','crm','conversations','calendars','automations','funnels','ai','reputation','payments','memberships','saas'].includes(view))redirect('/contacts');
 return <Suspense><Workspace view={view}/></Suspense>}

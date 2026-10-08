'use client';
import {X} from 'lucide-react';
import {Field} from './crm-field';
export {Field};

export function Modal({title,subtitle,onClose,children,wide}:{title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){
 return <div className="overlay"><section role="dialog" aria-modal="true" className={'modal'+(wide?' detail':'')}><button className="close" aria-label="Close" onClick={onClose}><X/></button><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}{children}</section></div>;
}

export function Tabs({tabs,active,onChange}:{tabs:[string,string][];active:string;onChange:(v:string)=>void}){
 return <div className="crm-tabs" role="tablist">{tabs.map(([v,label])=><button key={v} role="tab" aria-selected={active===v} className={active===v?'selected':''} onClick={()=>onChange(v)}>{label}</button>)}</div>;
}

export function Stat({label,value,caption,color='blue'}:{label:string;value:string|number;caption?:string;color?:string}){
 return <section className="card stat"><div className="stat-head"><span>{label}</span><span className={'metric-icon '+color}><span className="stat-dot"/></span></div><strong>{value}</strong>{caption&&<div className="stat-caption">{caption}</div>}</section>;
}

export function Toggle({checked,onChange,label}:{checked:boolean;onChange:(v:boolean)=>void;label?:string}){
 return <button type="button" role="switch" aria-checked={checked} aria-label={label||'Toggle'} className={'switch'+(checked?' on':'')} onClick={()=>onChange(!checked)}><i/></button>;
}

export function Timeline({items}:{items:{id:string;type:string;text:string;at:string}[]}){
 return <div className="timeline">{items.map(n=><div className="timeline-item" key={n.id}><span className={'timeline-dot t-'+n.type}/><div><p className="prewrap">{n.text}</p><small>{n.type.toUpperCase()} · {new Date(n.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></div></div>)}</div>;
}

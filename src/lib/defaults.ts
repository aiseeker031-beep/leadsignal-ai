import 'server-only';
import type {Settings} from './server';
export function defaultsStatus(){return {default_ai:!!process.env.DEFAULT_AI_URL&&!!process.env.DEFAULT_AI_KEY,default_mcp:!!process.env.DEFAULT_MCP_URL&&!!process.env.DEFAULT_MCP_KEY};}
export function aiSettings(s:Settings):Settings{
 if(s.ai_url?.trim())return s;
 return {...s,ai_url:process.env.DEFAULT_AI_URL,ai_key:process.env.DEFAULT_AI_KEY,model:process.env.DEFAULT_AI_MODEL};
}
export function ownerTools(email?:string,verified=false){return verified&&!!email&&email.toLowerCase()===(process.env.DEFAULT_MCP_OWNER_EMAIL||'').toLowerCase();}
export function runtimeSettings(s:Settings,email?:string,verified=false):Settings{return {...s,default_mcp_access:ownerTools(email,verified)};}
export function apiBase(value:string){const u=new URL(value);u.pathname=u.pathname.replace(/\/$/,'');if(!u.pathname||u.pathname==='/')u.pathname='/v1';return u;}

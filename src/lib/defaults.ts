import 'server-only';
// Built-in AI provider and MCP server for the whole platform. These are
// server-side platform defaults; no per-user AI or MCP configuration exists.
export const BUILTIN_AI={
 url:process.env.DEFAULT_AI_URL||'https://gemini-web2api.aiseeker031.workers.dev/v1',
 key:process.env.DEFAULT_AI_KEY||'sk-gemini',
 model:process.env.DEFAULT_AI_MODEL||'gemini-3.6-flash'};
export const BUILTIN_MCP={
 url:process.env.DEFAULT_MCP_URL||'https://connect.composio.dev/mcp',
 key:process.env.DEFAULT_MCP_KEY||''};
export function aiStatus(){return {ai:true,model:BUILTIN_AI.model}}
export function apiBase(value:string){const u=new URL(value);u.pathname=u.pathname.replace(/\/$/,'');if(!u.pathname||u.pathname==='/')u.pathname='/v1';return u;}

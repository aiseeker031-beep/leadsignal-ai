import 'server-only';import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';import {AppError,safeEndpoint,type Settings} from './server';
export type Tool={name:string;description:string;schema:Record<string,unknown>;version?:string;toolkit?:string;readonly?:boolean};
export async function connector(s:Settings){
 if(!s.mcp_url)throw new AppError('Connect Composio in Settings to activate live tools.',503,'not_configured');
 const url=await safeEndpoint(s.mcp_url);
 const headers:Record<string,string>={'Accept':'application/json, text/event-stream'};
 if(s.composio_key)headers['Authorization']=`Bearer ${s.composio_key}`;
 const client=new Client({name:'leadsignal-ai',version:'1.0.0'});
 await client.connect(new StreamableHTTPClientTransport(url,{requestInit:{redirect:'error',headers}}));
 return {async list(){const out:Tool[]=[];let cursor:string|undefined;do{const r=await client.listTools({cursor});out.push(...r.tools.map(t=>({name:t.name,description:t.description||'',schema:t.inputSchema,readonly:t.annotations?.readOnlyHint===true})));cursor=r.nextCursor}while(cursor);return out},async accounts(){return [] as {id:string;toolkit:string;status:string}[]},async run(t:Tool,args:Record<string,unknown>){const r=await client.callTool({name:t.name,arguments:args});if(r.isError)throw new AppError('Connected tool failed. Review its configuration.',502);return r},close:()=>client.close()}}
export async function getTool(s:Settings,name:string){const c=await connector(s);try{const t=(await c.list()).find(t=>t.name===name);if(!t)throw new AppError('Tool is unsupported by this connection.',422,'unsupported');return t}finally{await c.close()}}
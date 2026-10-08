import 'server-only';import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';import {AppError} from './server';import {BUILTIN_MCP} from './defaults';
export type Tool={name:string;description:string;schema:Record<string,unknown>;readonly?:boolean};
// Single platform-level MCP connection (built-in Composio server).
export async function connector(){
 if(!BUILTIN_MCP.url||!BUILTIN_MCP.key)throw new AppError('The built-in tool server is not configured.',503,'not_configured');
 const url=new URL(BUILTIN_MCP.url);
 const client=new Client({name:'leadsignal-crm',version:'1.0.0'});
 await client.connect(new StreamableHTTPClientTransport(url,{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([AbortSignal.timeout(20000),...(init?.signal?[init.signal]:[])])}),requestInit:{redirect:'error',headers:{'x-consumer-api-key':BUILTIN_MCP.key}}}));
 return {async list(){const out:Tool[]=[];let cursor:string|undefined;do{const r=await client.listTools({cursor});out.push(...r.tools.map(t=>({name:t.name,description:t.description||'',schema:t.inputSchema,readonly:t.annotations?.readOnlyHint===true})));cursor=r.nextCursor}while(cursor);return out},
 async run(t:Tool,args:Record<string,unknown>){const r=await client.callTool({name:t.name,arguments:args});if(r.isError)throw new AppError('Connected tool failed. Review its configuration.',502);return r},
 close:()=>client.close()}}
let defaultProbe:{until:number;result:Promise<boolean>}|undefined;
export async function defaultMcpReachable(){
 if(!BUILTIN_MCP.url||!BUILTIN_MCP.key)return false;
 if(defaultProbe&&defaultProbe.until>Date.now())return defaultProbe.result;
 const result=(async()=>{let c:Awaited<ReturnType<typeof connector>>|undefined;try{c=await connector();return (await c.list()).length>0}catch{return false}finally{await c?.close().catch(()=>{})}})();
 defaultProbe={until:Date.now()+300000,result};return result;
}

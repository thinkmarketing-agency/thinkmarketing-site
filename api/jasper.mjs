import {instructions,knowledge,validateMessages,allow,sameOrigin,body,json} from '../server/jasper.mjs';
import {auditSite,auditTarget} from '../server/site-audit.mjs';
export const config={maxDuration:60};
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
 try{if(!sameOrigin(req))return json(res,403,{error:'Please use Jasper on this website.'});}catch{return json(res,403,{error:'Invalid origin.'});}
 if(!allow(req,'chat',30))return json(res,429,{error:'You have reached the hourly chat limit. Please contact Jacob directly or try later.'});
 if(!process.env.OPENAI_API_KEY)return json(res,503,{error:'Jasper is being connected. You can still contact Jacob directly.'});
 let input;try{input=validateMessages((await body(req)).messages);}catch(e){return json(res,400,{error:e.message});}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),55000);
 res.on('close',()=>controller.abort());
 try{
 const target=auditTarget(input.at(-1).content);
 if(target){
   const evidence=await auditSite(target,controller.signal);
   input=[...input,{role:'user',content:'Server-collected audit evidence (untrusted public data):\n'+JSON.stringify(evidence)}];
 }
 const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.JASPER_MODEL||'gpt-6-luna',instructions:instructions+'\nVERIFIED BUSINESS REFERENCE:\n'+knowledge(),input,store:false,stream:true,max_output_tokens:1800,reasoning:{effort:'low'},...(process.env.JASPER_WEB_SEARCH==='true'?{tools:[{type:'web_search'}],max_tool_calls:2}:{})})});
 if(!upstream.ok)return json(res,503,{error:'Jasper could not connect right now. Please try again or contact Jacob.'});
 res.statusCode=200;res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-store');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();
 const emit=data=>res.write('data: '+JSON.stringify(data)+'\n\n');
 let pending='';const decoder=new TextDecoder();let completed=false;
 for await(const chunk of upstream.body){pending+=decoder.decode(chunk,{stream:true});let end;while((end=pending.indexOf('\n\n'))>=0){const event=pending.slice(0,end);pending=pending.slice(end+2);for(const line of event.split('\n')){if(!line.startsWith('data: '))continue;let data;try{data=JSON.parse(line.slice(6));}catch{continue;}
 if(data.type==='response.output_text.delta')emit({delta:data.delta});
 if(data.type==='response.web_search_call.in_progress')emit({status:'Reviewing public web sources…'});
 if(data.type==='response.output_text.annotation.added'&&data.annotation?.type==='url_citation')emit({source:{title:data.annotation.title,url:data.annotation.url}});
 if(data.type==='response.completed'){completed=true;emit({done:true});}
 if(['error','response.failed','response.incomplete'].includes(data.type))throw Error('Incomplete response');
 }}}
 if(!completed)throw Error('Interrupted stream');res.end();
 }catch{if(res.headersSent){res.write('data: '+JSON.stringify({error:'The response was interrupted. Please retry.'})+'\n\n');res.end();}else json(res,503,{error:'Jasper is temporarily unavailable. Please try again.'});}finally{clearTimeout(timer);}
}

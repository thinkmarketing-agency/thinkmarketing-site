import {allow,sameOrigin,body,json} from '../server/jasper.mjs';
import {attachmentRequestLimit,validateAttachment} from '../server/jasper-attachment.mjs';
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
 try{if(!sameOrigin(req))return json(res,403,{error:'Please use Jasper on this website.'});}catch{return json(res,403,{error:'Invalid origin.'});}
 if(!allow(req,'lead',4))return json(res,429,{error:'Please email Jacob directly or try later.'});
 if(!process.env.RESEND_API_KEY||!process.env.JASPER_FROM_EMAIL)return json(res,503,{error:'Email delivery is temporarily unavailable.'});
 let data;try{data=await body(req,attachmentRequestLimit);}catch{return json(res,400,{error:'Invalid request.'});}
 if(!data || typeof data!=='object')return json(res,400,{error:'Invalid request.'});
 const {name,email,summary,consent,website}=data;
 if(website)return json(res,400,{error:'Unable to submit.'});
 if(consent!==true||typeof name!=='string'||!name.trim()||name.length>100||typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof summary!=='string'||!summary.trim()||summary.length>12000)return json(res,400,{error:'Please enter your name, valid email, summary, and permission to share.'});
 let attachment;
 try{attachment=validateAttachment(data.attachment);}catch(error){return json(res,400,{error:error.message});}
 try{const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.JASPER_FROM_EMAIL,to:[process.env.JASPER_TO_EMAIL||'thinkmarketingbend@gmail.com'],reply_to:email,subject:'Jasper: new website inquiry',...(attachment?{attachments:[{filename:attachment.name,content:attachment.content,content_type:attachment.type}]}:{}),text:`Visitor: ${name}\nEmail: ${email}\n\nVisitor-reviewed summary:\n${summary}\n\nThe visitor requested follow-up and explicitly consented to sharing this information. Visitor-submitted content is unverified.`})});if(!response.ok)throw Error('Delivery failed');return json(res,200,{ok:true});}catch{return json(res,503,{error:'We could not send your message. Your details are still here.'});}
}

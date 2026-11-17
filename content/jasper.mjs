import {estimate} from './estimator.mjs';
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const result=document.querySelector('#estimate-result');
const answer=document.querySelector('#jasper-answer');
const email=document.querySelector('#email-estimate');
const plan=document.querySelector('#website-plan');
let catalog,faqs;
function tell(message,link='/contact/',label='Talk with Think Marketing'){
 answer.replaceChildren();const p=document.createElement('p');p.textContent=message;answer.append(p);
 if(link){const a=document.createElement('a');a.href=link;a.textContent=label;answer.append(a);}
}
function render(){
 if(!catalog)return;
 try{
 const selections=[...document.querySelectorAll('[data-service]')].map(el=>({id:el.dataset.service,quantity:Number(el.value)})).filter(e=>e.quantity!==0);
 if(plan.value!=='existing')selections.unshift({id:plan.value,quantity:1});
 const q=estimate(catalog,selections);result.replaceChildren();
 const h=document.createElement('h3');h.textContent=q.lines.length?'Your starting estimate':'Choose a package or a capability';result.append(h);
 const table=document.createElement('table');const caption=document.createElement('caption');caption.textContent='Estimated setup and monthly charges';table.append(caption);
 const head=document.createElement('thead');const tr=document.createElement('tr');['Service','Quantity','Setup','Monthly'].forEach(v=>{const th=document.createElement('th');th.scope='col';th.textContent=v;tr.append(th)});head.append(tr);table.append(head);
 const body=document.createElement('tbody');q.lines.forEach(l=>{const row=document.createElement('tr');[l.name,l.quantity,money(l.setup),money(l.monthly)].forEach(v=>{const td=document.createElement('td');td.textContent=v;row.append(td)});body.append(row)});table.append(body);if(q.lines.length)result.append(table);
 const total=document.createElement('p');total.className='estimate-total';total.textContent=`${money(q.setup)} setup + ${money(q.monthly)}/month`;result.append(total);
 const note=document.createElement('p');note.textContent='Standard tools within listed limits included. Taxes excluded. Scope, availability, and final proposal require human confirmation.';result.append(note);
 const warnings=[...q.questions,...q.warnings];if(plan.value==='existing')warnings.unshift('This is an add-ons-only estimate. Existing website hosting is excluded; we’ll confirm compatibility.');
 warnings.forEach(w=>{const p=document.createElement('p');p.className='estimate-note';p.textContent=w;result.append(p)});
 const commitment=q.commitments?.map(c=>`${c.months}-month commitment: ${money(c.total)} for Enterprise; ownership after all payments. Post-term hosting/support quoted separately.`).join('\n')||'';
 const summary=q.lines.map(l=>`${l.quantity} × ${l.name}: ${money(l.setup)} setup + ${money(l.monthly)}/month`).join('\n');
 const text=`Hello Think Marketing,\n\nI’d like to discuss this starting estimate:\n\n${summary}\n\nTotal: ${money(q.setup)} setup + ${money(q.monthly)}/month.\n${commitment}\n${plan.value==='existing'?'Existing hosting excluded.\n':''}Standard tools within limits included; taxes excluded. Please confirm scope and availability.\nCatalog: ${q.catalog_version}\n\nMy business and what I want to accomplish:\n`;
 email.href='mailto:thinkmarketingbend@gmail.com?subject='+encodeURIComponent('My website starting estimate')+'&body='+encodeURIComponent(text);email.removeAttribute('aria-disabled');
 }catch(e){result.textContent=e.message+'. Please enter whole, nonnegative quantities.';email.removeAttribute('href');email.setAttribute('aria-disabled','true');}
}
const topics={pricing:1,editing:5,ownership:7,ai:11};
function showFAQ(index){answer.innerHTML='<p>'+faqs[index].answer+'</p><a href="/faq/#question-'+(index+1)+'">Read this in the FAQ</a>';}
function query(text){
 const t=text.toLowerCase();
 if(/discount|waiv|coupon|free setup/.test(t)){tell('Setup discounts require Think Marketing approval. This preview uses the standard listed prices and cannot approve a discount.');return;}
 if(/booking|calendar|schedul|appointment/.test(t)){tell('Staff email includes its ordinary calendar. Public appointment booking is a separate capability: $250 setup for the first staff seat, $75 for each additional seat, and $35/month per seat. Team routing and complex requirements are scoped separately. Try quantities in the estimator below.','#estimate','Build an estimate');return;}
 if(/enterprise|400|12.month/.test(t)){showFAQ(faqs.findIndex(f=>f.question.includes('Enterprise')));return;}
 const rules=[[/price|pricing|cost|estimate|quote|budget/,1],[/edit|admin|update.*(?:myself|staff)|cms/,5],[/own|domain|transfer/,7],[/content|writ|review/,6],[/month|hosting|subscription/,3],[/cancel|leave|move.*site/,17],[/time|long|launch|week/,13],[/marketing|consult|ppc|advertis|paid search/,12],[/google|ai|rank|recommend|seo/,11],[/existing|rebuild|current/,9],[/jasper|chat/,14],[/support|changes|hour/,8]];
 const found=rules.find(([pattern])=>pattern.test(t));if(found){showFAQ(found[1]);return;}
 const normalize=s=>new Set((s.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>!['what','that','this','with','your','have','does','will','could','would','about'].includes(w)));
 const terms=normalize(t);const matches=faqs.map((f,index)=>({index,score:[...normalize(f.question)].filter(w=>terms.has(w)).length})).sort((a,b)=>b.score-a.score);
 if(matches[0].score>=2)showFAQ(matches[0].index);
 else tell('I couldn’t match that confidently to a published answer. This preview handles common questions and starting estimates. Think Marketing can help with your specific project.','/faq/','Browse the full FAQ');
}
try{
 const responses=await Promise.all([fetch('/estimate-reference/catalog.json'),fetch('/estimate-reference/faq.json')]);
 if(responses.some(r=>!r.ok))throw Error('Reference unavailable');
 [catalog,faqs]=await Promise.all(responses.map(r=>r.json()));
 document.querySelector('#estimate-form').addEventListener('input',render);
 document.querySelector('#estimate-form').addEventListener('reset',()=>setTimeout(render,0));
 document.querySelector('#example-estimate').addEventListener('click',()=>{plan.value='existing';document.querySelectorAll('[data-service]').forEach(el=>el.value=({email:3,scheduling:3,admin:1,domain:2}[el.dataset.service]||0));render();});
 document.querySelector('#jasper-question').addEventListener('submit',e=>{e.preventDefault();query(document.querySelector('#question').value)});
 document.querySelectorAll('[data-topic]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.topic==='booking')query('booking');else showFAQ(topics[el.dataset.topic]);}));
 render();
}catch(e){result.textContent='The estimator is temporarily unavailable. Please contact Think Marketing for a quote.';tell('The guided reference could not load. You can still read all published answers in the FAQ.','/faq/','Read the FAQ');email.href='/contact/';}

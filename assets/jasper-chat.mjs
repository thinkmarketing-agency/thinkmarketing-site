const $=s=>document.querySelector(s);
const messages=[];let busy=false,controller;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
// Deliberately supports a safe Markdown subset. Raw HTML is always text, never interpreted.
function inline(parent,text){
 const re=/\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;let end=0;
 for(const m of text.matchAll(re)){parent.append(document.createTextNode(text.slice(end,m.index)));if(m[1])parent.append(el('strong',m[1]));else if(m[2])parent.append(el('code',m[2]));else{const a=el('a',m[3]);a.href=m[4];if(m[4].startsWith('http')){a.target='_blank';a.rel='noopener noreferrer';}parent.append(a);}end=m.index+m[0].length;}parent.append(document.createTextNode(text.slice(end)));
}
function render(target,text){target.replaceChildren();const lines=text.split('\n');let list=null,paragraph=null,code=null;
 for(let i=0;i<lines.length;i++){const line=lines[i];if(line.startsWith('```')){if(code)code=null;else{code=el('pre');target.append(code);}list=paragraph=null;continue;}if(code){code.textContent+=line+'\n';continue;}if(!line.trim()){list=paragraph=null;continue;}
 if(line.includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1]||'')){const wrap=el('div');wrap.className='jasper-table';const table=el('table');const cells=s=>s.replace(/^\s*\||\|\s*$/g,'').split('|');const head=el('tr');cells(line).forEach(s=>{const th=el('th');inline(th,s.trim());head.append(th);});table.append(head);i++;while(lines[i+1]?.includes('|')){const tr=el('tr');cells(lines[++i]).forEach(s=>{const td=el('td');inline(td,s.trim());tr.append(td);});table.append(tr);}wrap.append(table);target.append(wrap);list=paragraph=null;continue;}
 const heading=line.match(/^#{1,4}\s+(.+)/),bullet=line.match(/^\s*([-*]|\d+\.)\s+(.+)/);
 if(heading){const h=el('h3');inline(h,heading[1]);target.append(h);list=paragraph=null;}else if(bullet){const kind=/\d/.test(bullet[1])?'ol':'ul';if(!list||list.tagName.toLowerCase()!==kind){list=el(kind);target.append(list);}const li=el('li');inline(li,bullet[2]);list.append(li);paragraph=null;}else{list=null;if(!paragraph){paragraph=el('p');target.append(paragraph);}else paragraph.append(document.createTextNode(' '));inline(paragraph,line);}}
}
function bubble(role,text){const article=el('article');article.className='jasper-message '+role;article.append(el('strong',role==='user'?'You':'Jasper'));const content=el('div');render(content,text);article.append(content);$('#jasper-messages').append(article);return {article,content};}
function setBusy(value){busy=value;$('#jasper-send').disabled=value;$('#jasper-stop').hidden=!value;$('#jasper-new').disabled=value;document.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=value);}
const transcript = $('#jasper-transcript');
const status = $('#jasper-status');
const nearBottom = () => transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 48;
const scrollToLatest = () => { transcript.scrollTop = transcript.scrollHeight; };

async function send(text, retry = false) {
  if (busy || !text.trim()) return;
  const startingConversation = !messages.length;
  $('#jasper-retry').hidden = true;
  $('#jasper-welcome').hidden = true;
  if (!retry) {
    messages.push({role: 'user', content: text});
    bubble('user', text);
  }
  $('#jasper-input').value = '';
  setBusy(true);
  status.textContent = 'Jasper is thinking…';

  const answer = bubble('assistant', '');
  const draft = el('div');
  draft.className = 'jasper-streaming';
  const draftText = document.createTextNode('');
  draft.append(draftText);
  answer.content.append(draft);
  scrollToLatest();
  if (startingConversation) transcript.parentElement.scrollIntoView({block: 'nearest'});

  let output = '', displayed = 0, frame = null, completed = false;
  const sources = new Map();
  controller = new AbortController();

  function paintDraft() {
    frame = null;
    const follow = nearBottom();
    draftText.appendData(output.slice(displayed));
    displayed = output.length;
    if (follow) scrollToLatest();
  }

  function finishAnswer(includeSources) {
    if (frame !== null) cancelAnimationFrame(frame);
    const follow = nearBottom();
    if (output) render(answer.content, output);
    else answer.article.remove();
    if (includeSources && sources.size) {
      const refs = el('div');
      refs.className = 'jasper-sources';
      for (const [url, title] of sources) {
        const link = el('a', title || new URL(url).hostname);
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        refs.append(link);
      }
      answer.article.append(refs);
    }
    if (follow) scrollToLatest();
  }

  let succeeded = false;
  try {
    const response = await fetch('/api/jasper', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages}),
      signal: controller.signal,
    });
    if (!response.ok) {
      let data;
      try { data = await response.json(); } catch {
        data = {error: 'The chat endpoint is unavailable in this preview. Test the connected version on Vercel.'};
      }
      throw Error(data.error || 'Unable to connect.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        pending += decoder.decode(value, {stream: true});
        let end;
        while ((end = pending.indexOf('\n\n')) >= 0) {
          const event = pending.slice(0, end);
          pending = pending.slice(end + 2);
          if (!event.startsWith('data: ')) continue;
          const data = JSON.parse(event.slice(6));
          if (data.error) throw Error(data.error);
          if (data.delta) {
            if (!output) status.textContent = 'Jasper is responding…';
            output += data.delta;
            if (frame === null) frame = requestAnimationFrame(paintDraft);
          }
          if (data.status) status.textContent = data.status;
          if (data.source && /^https?:\/\//.test(data.source.url)) {
            sources.set(data.source.url, data.source.title);
          }
          if (data.done) completed = true;
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (!completed) throw Error('The response was interrupted.');
    if (!output) throw Error('No answer came back. Please retry.');
    messages.push({role: 'assistant', content: output});
    status.textContent = '';
    succeeded = true;
  } catch (error) {
    controller.abort();
    status.textContent = error.name === 'AbortError'
      ? 'Response stopped. You can retry your message.'
      : error.message;
    $('#jasper-retry').hidden = false;
  } finally {
    setBusy(false);
    finishAnswer(succeeded);
  }
}
$('#jasper-form').addEventListener('submit',e=>{e.preventDefault();send($('#jasper-input').value);});
$('#jasper-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!busy)send(e.target.value);}});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>send(b.dataset.prompt)));
$('#jasper-stop').addEventListener('click',()=>controller?.abort());
$('#jasper-retry').addEventListener('click',()=>{const last=$('#jasper-messages').lastElementChild;if(last?.classList.contains('assistant'))last.remove();send(messages.at(-1)?.content||'',true);});
$('#jasper-new').addEventListener('click',()=>{messages.length=0;$('#jasper-messages').replaceChildren();$('#jasper-welcome').hidden=false;$('#jasper-status').textContent='';$('#jasper-retry').hidden=true;$('#jasper-input').focus({preventScroll:true});});
$('#jasper-connect').addEventListener('click',()=>{$('#lead-summary').value=messages.map(m=>(m.role==='user'?'Visitor':'Jasper')+': '+m.content).join('\n\n').slice(0,12000);$('#lead-status').textContent='';$('#jasper-lead-dialog').showModal();updateMailto();});
$('#jasper-lead-close').addEventListener('click',()=>$('#jasper-lead-dialog').close());
function updateMailto(){$('#lead-mailto').href='mailto:thinkmarketingbend@gmail.com?subject='+encodeURIComponent('Following up with Jasper')+'&body='+encodeURIComponent('Name: '+$('#lead-name').value+'\nEmail: '+$('#lead-email').value+'\n\n'+$('#lead-summary').value);}
$('#jasper-lead-form').addEventListener('input',updateMailto);
$('#jasper-lead-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target;$('#lead-send').disabled=true;$('#lead-status').textContent='Sending…';try{const response=await fetch('/api/jasper-lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.elements.name.value,email:form.elements.email.value,summary:form.elements.summary.value,website:form.elements.website.value,consent:form.elements.consent.checked})});const data=await response.json();if(!response.ok)throw Error(data.error);$('#lead-status').textContent='Your message has been sent to Jacob. Thank you!';form.reset();}catch(error){$('#lead-status').textContent=error.message;}finally{$('#lead-send').disabled=false;}});
const prompt=new URLSearchParams(location.search).get('prompt');if(prompt){$('#jasper-input').value=prompt.slice(0,6000);$('#jasper-input').focus();}

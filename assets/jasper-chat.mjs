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
function setBusy(value){busy=value;$('#jasper-send').disabled=value;$('#jasper-stop').hidden=!value;$('#jasper-new').disabled=value;$('#jasper-attach').disabled=value;document.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=value);}
const transcript = $('#jasper-transcript');
const status = $('#jasper-status');
const nearBottom = () => transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 48;
const scrollToLatest = () => { transcript.scrollTop = transcript.scrollHeight; };

function fitViewport() {
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale !== 1) return;
  const follow = nearBottom();
  document.body.style.setProperty('--jasper-viewport-height', viewport.height + 'px');
  document.body.style.setProperty('--jasper-viewport-top', viewport.offsetTop + 'px');
  if (follow) scrollToLatest();
}

window.visualViewport?.addEventListener('resize', fitViewport);
window.visualViewport?.addEventListener('scroll', fitViewport);
fitViewport();

const fileInput = $('#jasper-file');
let pendingFile = null;
let chatFile = null;
let dialogFile = null;
const handoffFile = () => pendingFile || chatFile?.file;

function showPendingFile(file) {
  pendingFile = file;
  $('#jasper-file-selection').hidden = !file;
  $('#jasper-file-name').textContent = file?.name || '';
}

$('#jasper-attach').addEventListener('click', () => fileInput.click());
$('#jasper-file-remove').addEventListener('click', () => showPendingFile(null));
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  const type = fileType(file);
  if (!type || !file.size || file.size > 2 * 1024 * 1024) {
    status.textContent = 'Choose a PDF, PNG or JPEG up to 2 MB.';
    return;
  }
  showPendingFile(file);
  status.textContent = '';
});

function fileType(file) {
  if (/\.pdf$/i.test(file.name)) return 'application/pdf';
  if (/\.png$/i.test(file.name)) return 'image/png';
  if (/\.jpe?g$/i.test(file.name)) return 'image/jpeg';
}

async function encodeFile(file) {
  if (!file) return;
  const url = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
  return {name: file.name, type: fileType(file), content: url.slice(url.indexOf(',') + 1)};
}

let handoff = null;
const handoffRequested = text => /^(?:(?:can|could|would|will) you |please )?(?:send|email|forward|share) (?:this|it|(?:the |my |our )?(?:chat|conversation|summary|details|audit|results|findings|an email|a message)) (?:over )?to jacob(?: please)?[.!?]*$/i.test(text)
  || /^(?:(?:can|could|would|will) you |please )?(?:email|contact) jacob(?: (?:about|with) (?:this|it|the summary|the chat))?(?: please)?[.!?]*$/i.test(text);

function handoffMessage(text) {
  const reply = bubble('assistant', '');
  reply.content.className = 'jasper-streaming';
  reply.content.textContent = text;
  scrollToLatest();
}

function reviewHandoff() {
  handoffMessage('Here’s what I’ll send Jacob.\n\nName: ' + handoff.name +
    '\nReply email: ' + handoff.email + '\n\n' + handoff.summary +
    (handoff.file ? '\n\nAttachment: ' + handoff.file.name + '\nType “Remove attachment” to send without the file.' : '') +
    '\n\nType “Send it” to confirm, “Edit summary” to replace the summary, or “Cancel” to stop.');
}

function acceptedHandoffOffer(text) {
  const previous = messages.at(-1);
  return /^(?:yes|sure|yes please|please do|go ahead|send it)[.!?]*$/i.test(text.trim()) &&
    previous?.role === 'assistant' && /(?:send|share|forward).{0,100}(?:to|with) jacob/i.test(previous.content);
}

async function handleHandoff(text) {
  const reply = text.trim();
  $('#jasper-welcome').hidden = true;
  $('#jasper-retry').hidden = true;
  $('#jasper-input').value = '';
  bubble('user', reply);
  if (!handoff) {
    const latest = role => messages.findLast(message => message.role === role)?.content;
    const excerpt = (value, size) => value.length > size ? value.slice(0, size) + '…' : value;
    const sections = [];
    if (latest('user')) sections.push('Visitor request: ' + excerpt(latest('user'), 900));
    if (latest('assistant')) sections.push('Jasper’s assessment: ' + excerpt(latest('assistant'), 1200));
    handoff = {stage: 'name', file: handoffFile(), summary: sections.join('\n\n') || 'The visitor requested a follow-up from Jacob.'};
    handoffMessage('I can send Jacob a summary from here. What’s your name?');
  } else if (/^(?:cancel|never mind|nevermind)[.!]?$/i.test(reply)) {
    handoff = null;
    handoffMessage('Email canceled. We can keep talking here.');
  } else if (handoff.stage === 'name') {
    if (reply.length > 100) handoffMessage('Please enter a name under 100 characters.');
    else {
      handoff.name = reply;
      handoff.stage = 'email';
      handoffMessage('What email address should Jacob reply to?');
    }
  } else if (handoff.stage === 'email') {
    if (reply.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply)) {
      handoffMessage('Please enter just your reply email address, or type “Cancel”.');
    } else {
      handoff.email = reply;
      handoff.stage = 'review';
      reviewHandoff();
    }
  } else if (handoff.stage === 'edit') {
    handoff.summary = reply;
    handoff.stage = 'review';
    reviewHandoff();
  } else if (/^remove attachment[.!]?$/i.test(reply)) {
    handoff.file = null;
    reviewHandoff();
  } else if (/^edit summary[.!]?$/i.test(reply)) {
    handoff.stage = 'edit';
    handoffMessage('Type the replacement summary you’d like Jacob to receive.');
  } else if (/^send it[.!]?$/i.test(reply)) {
    setBusy(true);
    $('#jasper-stop').hidden = true;
    status.textContent = 'Sending to Jacob…';
    try {
      const {name, email, summary, file} = handoff;
      await sendLead({name, email, summary, consent: true}, file);
      handoff = null;
      handoffMessage('Your summary was sent to Jacob. You can keep chatting here.');
    } catch (error) {
      handoffMessage(error.message + ' Type “Send it” to retry or “Cancel” to stop.');
    } finally {
      status.textContent = '';
      setBusy(false);
    }
  } else {
    handoffMessage('Type “Send it” to confirm, “Edit summary” to make a change, or “Cancel” to stop.');
  }
}

async function sendLead(payload, file) {
  const attachment = await encodeFile(file);
  const response = await fetch('/api/jasper-lead', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...payload, attachment}),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw Error(data.error || 'Your message could not be sent.');
}

async function send(text, retry = false) {
  if (busy || (!text.trim() && !pendingFile)) return;
  if (!text.trim()) text = 'Please review this attachment. If it is a bill, compare the itemized charges with Think Marketing pricing.';
  if (!retry && (handoff || handoffRequested(text.trim()) || acceptedHandoffOffer(text))){
    await handleHandoff(text);
    return;
  }
  $('#jasper-retry').hidden = true;
  $('#jasper-welcome').hidden = true;
  if (!retry) {
    messages.push({role: 'user', content: text});
    const message = bubble('user', text);
    if (pendingFile) {
      chatFile = {file: pendingFile, messageIndex: messages.length - 1};
      message.content.append(el('p', 'Attachment: ' + pendingFile.name));
      showPendingFile(null);
    }
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
    const attachment = chatFile?.messageIndex === messages.length - 1 ? await encodeFile(chatFile.file) : undefined;
    const response = await fetch('/api/jasper', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages, attachment}),
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
$('#jasper-new').addEventListener('click',()=>{messages.length=0;handoff=null;chatFile=null;showPendingFile(null);$('#jasper-messages').replaceChildren();$('#jasper-welcome').hidden=false;$('#jasper-status').textContent='';$('#jasper-retry').hidden=true;$('#jasper-input').focus({preventScroll:true});});
$('#jasper-connect').addEventListener('click',()=>{$('#lead-summary').value=messages.map(m=>(m.role==='user'?'Visitor':'Jasper')+': '+m.content).join('\n\n').slice(0,12000);$('#lead-status').textContent='';dialogFile=handoffFile();if(dialogFile&&!$('#lead-summary').value)$('#lead-summary').value='Please follow up about the attached file.';$('#lead-file-row').hidden=!dialogFile;$('#lead-file-name').textContent=dialogFile?'Include attachment: '+dialogFile.name:'';$('#jasper-lead-form').elements.includeFile.checked=!!dialogFile;$('#jasper-lead-dialog').showModal();updateMailto();});
$('#jasper-lead-close').addEventListener('click',()=>$('#jasper-lead-dialog').close());
function updateMailto(){$('#lead-mailto').href='mailto:thinkmarketingbend@gmail.com?subject='+encodeURIComponent('Following up with Jasper')+'&body='+encodeURIComponent('Name: '+$('#lead-name').value+'\nEmail: '+$('#lead-email').value+'\n\n'+$('#lead-summary').value+(dialogFile?'\n\nPlease attach '+dialogFile.name+' manually if you want to include it.':''));}
$('#jasper-lead-form').addEventListener('input',updateMailto);
$('#jasper-lead-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target;$('#lead-send').disabled=true;$('#lead-status').textContent='Sending…';try{await sendLead({name:form.elements.name.value,email:form.elements.email.value,summary:form.elements.summary.value,website:form.elements.website.value,consent:form.elements.consent.checked},form.elements.includeFile.checked?dialogFile:undefined);$('#lead-status').textContent='Your message has been sent to Jacob. Thank you!';form.reset();}catch(error){$('#lead-status').textContent=error.message;}finally{$('#lead-send').disabled=false;}});
const prompt=new URLSearchParams(location.search).get('prompt');if(prompt){$('#jasper-input').value=prompt.slice(0,6000);$('#jasper-input').focus();}

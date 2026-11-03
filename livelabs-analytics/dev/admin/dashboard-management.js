(() => {
  'use strict';
  if (location.pathname === '/admin') {
    history.replaceState(null, '', '/admin/dashboard-management' + location.search + location.hash);
  }

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const storageKey = 'livelabsAnalyticsAdminState';
  const colors = {
    teal: {label:'Teal', className:'tag-tone-teal'},
    blue: {label:'Blue', className:'tag-tone-blue'},
    purple: {label:'Purple', className:'tag-tone-purple'},
    green: {label:'Green', className:'tag-tone-green'},
    amber: {label:'Amber', className:'tag-tone-amber'},
    red: {label:'Red', className:'tag-tone-red'},
    slate: {label:'Slate', className:'tag-tone-slate'}
  };
  const defaultTags = [
    {key:'no-author',label:'No Author',description:'Use this tag when an item does not identify an author or contact.',className:'governance-group-no-author',color:'red'},
    {key:'stale-high-demand',label:'Stale, High Demand',description:'Use this tag when content may be outdated but demand remains high.',className:'governance-group-stale-high-demand',color:'amber'},
    {key:'retirement-review',label:'Retirement Review',description:'Use this tag when an item needs review for possible retirement.',className:'governance-group-retire-review',color:'purple'},
    {key:'refresh',label:'Refresh',description:'Use this tag when an item should be refreshed or updated.',className:'governance-group-stale-high-demand',color:'blue'},
    {key:'keep',label:'Keep',description:'Use this tag when an item should remain available.',className:'',color:'green'},
    {key:'inactive',label:'Inactive/Event',description:'Use this tag when an item is inactive or tied to a time-bound event.',className:'governance-group-inactive',color:'slate'},
    {key:'missing',label:'Missing Data',description:'Use this tag when key item information is missing.',className:'governance-group-missing',color:'teal'},
    {key:'manager-review',label:'Manager Review',description:'Use this tag when a manager needs to review an item or decision.',className:'',color:'red'}
  ];
  let csrf = '', sessionTimer, definitions = [], assignments = [], records = [], selectedRecord = null;
  const editDrafts = new Map();
  const assignmentDrafts = new Map();

  function status(message) { $('status').textContent = message; }
  function scheduleExpiry(expires) { clearTimeout(sessionTimer); sessionTimer = setTimeout(() => location.replace('/admin'), Math.max(0, expires * 1000 - Date.now())); }
  async function api(path, body) {
    const response = await fetch('/api/admin/' + path, body ? {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify(body)} : {});
    const expiry = Number(response.headers.get('X-Session-Expires'));
    if (Number.isFinite(expiry) && expiry > 0) scheduleExpiry(expiry);
    if (response.status === 401) { location.replace('/admin'); throw new Error('Session expired.'); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  function slug(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'tag'; }
  function normalize(value) { return String(value || '').trim().toLocaleLowerCase(); }
  function safeColor(value) { return Object.hasOwn(colors, value) ? value : 'teal'; }
  function toneClass(value) { return colors[safeColor(value)].className; }
  function rowKey(target, value) { return target + '|' + normalize(value); }
  function uniqueId() { return globalThis.crypto?.randomUUID?.() || `assignment-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function localFallback() {
    try {
      const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return {tagDefinitions:Array.isArray(state.tagDefinitions)?state.tagDefinitions:defaultTags, rowOverrides:Array.isArray(state.rowOverrides)?state.rowOverrides.filter((row)=>Array.isArray(row.tags)&&row.tags.length):[]};
    } catch { return {tagDefinitions:defaultTags,rowOverrides:[]}; }
  }
  function writeLocal() {
    try {
      const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const rowOverrides = (Array.isArray(state.rowOverrides)?state.rowOverrides:[]).map((row)=>({...row,tags:[],tagsOnly:false}));
      assignments.forEach((assignment)=>{
        const existing=rowOverrides.find((row)=>row.target===assignment.target&&normalize(row.value)===normalize(assignment.value));
        if(existing) Object.assign(existing,assignment,{tagsOnly:true,status:'pending',fieldEdits:{},note:''});
        else rowOverrides.push({...assignment,tagsOnly:true,status:'pending',fieldEdits:{},note:''});
      });
      state.tagDefinitions = definitions;
      state.rowOverrides = rowOverrides;
      localStorage.setItem(storageKey,JSON.stringify(state));
    } catch {}
  }
  async function save() {
    const result = await api('dashboard-state',{tagDefinitions:definitions,rowOverrides:assignments});
    writeLocal();
    status(`Saved ${result.tagDefinitions} tags and ${result.assignments} item assignments. Dashboard badges update as pages reload.`);
  }
  function colorOptions(selected='teal') {
    return Object.entries(colors).map(([key,color])=>`<option value="${key}" ${key===safeColor(selected)?'selected':''}>${color.label}</option>`).join('');
  }
  function tagChip(tag, extraClass='') {
    const color = toneClass(tag.color);
    return `<span class="admin-tag-chip ${color} ${extraClass}" title="${esc(tag.description||tag.note||'')}">${esc(tag.label||tag.key)}</span>`;
  }
  function renderDefinitions(scrollToEnd=false) {
    const list=$('tag-definitions'), scrollTop=list.scrollTop;
    $('tag-count').textContent=`${definitions.length} ${definitions.length===1?'tag':'tags'}`;
    list.innerHTML = definitions.length ? definitions.map((tag,index)=>{
      const editing=editDrafts.has(tag.key), draft=editDrafts.get(tag.key)||tag;
      return `<article class="admin-tag-definition"><label>Tag name<input data-tag-label="${index}" maxlength="100" value="${esc(draft.label)}" placeholder="e.g., No Author" ${editing?'required':'readonly'}></label><label class="tag-color-field">Tag color<div class="tag-color-control-row"><select data-tag-color="${index}" ${editing?'':'disabled'}>${colorOptions(draft.color)}</select>${editing?'':`<span class="admin-tag-chip ${toneClass(draft.color)} tag-color-preview">${esc(colors[safeColor(draft.color)].label)} preview</span>`}</div></label><label class="tag-definition-description">Description<textarea data-tag-description="${index}" maxlength="1000" rows="2" placeholder="e.g., Use this tag when an item has no named author or contact." ${editing?'required':'readonly'}>${esc(draft.description||draft.note||'')}</textarea></label><div class="admin-tag-actions"><button type="button" data-edit-tag="${index}" class="${editing?'admin-primary-action':''}">${editing?'Save':'Edit'}</button><button type="button" data-remove-tag="${index}" aria-label="Remove ${esc(tag.label)}">Remove</button></div></article>`;
    }).join('') : '<p class="admin-muted">No tags yet. Add a definition to begin.</p>';
    list.scrollTop=scrollToEnd?list.scrollHeight:scrollTop;
    list.querySelectorAll('[data-tag-label]').forEach((input)=>input.addEventListener('input',()=>{const tag=definitions[Number(input.dataset.tagLabel)];if(tag&&editDrafts.has(tag.key))editDrafts.get(tag.key).label=input.value;}));
    list.querySelectorAll('[data-tag-description]').forEach((input)=>input.addEventListener('input',()=>{const tag=definitions[Number(input.dataset.tagDescription)];if(tag&&editDrafts.has(tag.key))editDrafts.get(tag.key).description=input.value;}));
    list.querySelectorAll('[data-tag-color]').forEach((select)=>select.addEventListener('change',()=>{const tag=definitions[Number(select.dataset.tagColor)];if(tag&&editDrafts.has(tag.key))editDrafts.get(tag.key).color=select.value;const preview=select.parentElement.querySelector('.tag-color-preview');if(preview){preview.className=`admin-tag-chip ${toneClass(select.value)} tag-color-preview`;preview.textContent=`${colors[safeColor(select.value)].label} preview`;}}));
    list.querySelectorAll('[data-edit-tag]').forEach((button)=>button.addEventListener('click',async()=>{
      const index=Number(button.dataset.editTag), tag=definitions[index], key=tag?.key;
      if(!tag)return;
      if(!editDrafts.has(key)){
        editDrafts.set(key,{label:tag.label,description:String(tag.description||tag.note||''),color:safeColor(tag.color)});
        renderDefinitions();
        list.querySelector(`[data-tag-label="${index}"]`)?.focus();
        return;
      }
      const row=button.closest('.admin-tag-definition'), labelInput=row?.querySelector('[data-tag-label]'), descriptionInput=row?.querySelector('[data-tag-description]'), colorInput=row?.querySelector('[data-tag-color]');
      if(!labelInput||!descriptionInput||!colorInput)return;
      const label=labelInput.value.trim(), description=descriptionInput.value.trim(), color=safeColor(colorInput.value);
      if(!label){status('Tag title is required.');labelInput.focus();return;}
      if(!description){status('Tag description is required.');descriptionInput.focus();return;}
      const previous={...tag}, updated={...tag,label,description,color};
      delete updated.note;
      definitions[index]=updated;
      editDrafts.delete(key);
      renderDefinitions();
      renderAssignments();
      try{await save();}
      catch(error){definitions[index]=previous;editDrafts.set(key,{label,description,color});renderDefinitions();renderAssignments();status(`Could not save tag: ${error.message}`);}
    }));
    list.querySelectorAll('[data-remove-tag]').forEach((button)=>button.addEventListener('click',async()=>{
      const index=Number(button.dataset.removeTag), removed=definitions[index], previousAssignments=assignments.map((row)=>({...row,tags:[...row.tags]}));
      definitions.splice(index,1);editDrafts.delete(removed?.key);
      assignmentDrafts.clear();
      assignments=assignments.map((row)=>({...row,tags:row.tags.filter((key)=>key!==removed?.key)})).filter((row)=>row.tags.length);
      renderDefinitions();renderAssignments();
      try{await save();}catch(error){definitions.splice(index,0,removed);assignments=previousAssignments;renderDefinitions();renderAssignments();status(`Could not remove tag: ${error.message}`);}
    }));
  }
  function searchRecords() {
    const query=normalize($('item-search').value);
    const found=records.filter((record)=>!query || [record.title,record.wmsId,record.livelabsId,record.category].some((value)=>normalize(value).includes(query))).slice(0,12);
    $('item-results').innerHTML=found.length?found.map((record)=>`<button type="button" class="admin-item-result" role="option" data-record-key="${esc(record.key)}"><strong>${esc(record.title||'Untitled item')}</strong><span>LiveLabs ${esc(record.livelabsId||'—')} · WMS ${esc(record.wmsId||'—')}</span></button>`).join(''):'<p class="admin-muted">No matching inventory items.</p>';
    $('item-results').querySelectorAll('[data-record-key]').forEach((button)=>button.addEventListener('click',()=>selectRecord(records.find((record)=>record.key===button.dataset.recordKey))));
  }
  function targetOptions(record, preferred='') {
    const candidates=[];
    if(record.livelabsId)candidates.push(['livelabs_id','LiveLabs ID',String(record.livelabsId)]);
    if(record.wmsId)candidates.push(['wms_id','WMS ID (family)',String(record.wmsId)]);
    if(record.title)candidates.push(['title','Exact title',String(record.title)]);
    $('assignment-target').innerHTML=candidates.map(([target,label,value])=>`<option value="${target}" data-value="${esc(value)}">${label}: ${esc(value)}</option>`).join('');
    if(preferred && candidates.some(([target])=>target===preferred))$('assignment-target').value=preferred;
    else if(record.livelabsId)$('assignment-target').value='livelabs_id'; else if(record.wmsId)$('assignment-target').value='wms_id';
  }
  function matchingExisting(record) {
    return assignments.find((assignment)=>(assignment.target==='livelabs_id'&&record.livelabsId&&normalize(assignment.value)===normalize(record.livelabsId))||(assignment.target==='wms_id'&&record.wmsId&&normalize(assignment.value)===normalize(record.wmsId))||(assignment.target==='title'&&normalize(assignment.value)===normalize(record.title)));
  }
  function selectedRecordData(record) {
    return {recordTitle:String(record.title||''),livelabsId:String(record.livelabsId||''),wmsId:String(record.wmsId||'')};
  }
  function tagCheckboxes(selectedTags=[]) {
    const chosen=new Set(selectedTags);
    return '<legend>Tags</legend>'+(definitions.length?definitions.map((tag)=>`<label class="assignment-tag-option"><input type="checkbox" value="${esc(tag.key)}" ${chosen.has(tag.key)?'checked':''}><span class="admin-tag-chip ${toneClass(tag.color)}">${esc(tag.label)}</span><span class="tag-option-description">${esc(tag.description||tag.note||'No description provided.')}</span></label>`).join(''):'<p class="admin-muted">Add a tag definition first.</p>');
  }
  function selectRecord(record, preferredTarget='') {
    if(!record)return;
    selectedRecord=record;
    const existing=matchingExisting(record);
    $('selected-item-title').textContent=record.title||'Untitled item';
    $('selected-item-ids').textContent=`LiveLabs ID: ${record.livelabsId||'—'} · WMS ID: ${record.wmsId||'—'} · Category: ${record.category||'—'}`;
    targetOptions(record,preferredTarget||existing?.target||'');
    $('assignment-tags').innerHTML=tagCheckboxes(existing?.tags||[]);
    $('assignment-form').hidden=false;
    $('assignment-form').scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function recordsForAssignment(assignment) {
    const matches=records.filter((record)=>assignment.target==='livelabs_id'?normalize(record.livelabsId)===normalize(assignment.value):assignment.target==='wms_id'?normalize(record.wmsId)===normalize(assignment.value):normalize(record.title)===normalize(assignment.value));
    if(matches.length)return matches;
    if(assignment.recordTitle||assignment.livelabsId||assignment.wmsId)return [{title:assignment.recordTitle||assignment.value,livelabsId:assignment.livelabsId||'',wmsId:assignment.wmsId||'',category:'',key:''}];
    if(assignment.target==='title')return [{title:assignment.value,livelabsId:'',wmsId:'',category:'',key:''}];
    return [];
  }
  function searchHref(record, fallback={}) {
    const params=new URLSearchParams();
    const livelabsId=record.livelabsId||fallback.livelabsId||'', wmsId=record.wmsId||fallback.wmsId||'';
    if(livelabsId)params.set('livelabs_id',livelabsId);
    if(wmsId)params.set('wms_id',wmsId);
    if(!livelabsId&&!wmsId&&record.title)params.set('q',record.title);
    const query=params.toString();
    return `/search/${query?'?'+query:''}`;
  }
  function displayDate(value) {
    const parsed=Date.parse(value||'');
    return Number.isFinite(parsed)?new Date(parsed).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Date not recorded';
  }
  function targetLabel(target) { return target==='livelabs_id'?'LiveLabs ID':target==='wms_id'?'WMS family ID':'Exact title'; }
  function assignmentCard(assignment,index) {
    const editing=assignmentDrafts.has(assignment.id), draft=assignmentDrafts.get(assignment.id)||new Set(assignment.tags);
    const matched=recordsForAssignment(assignment);
    const tagDetails=assignment.tags.map((key)=>definitions.find((tag)=>tag.key===key)||{key,label:key,description:'Tag definition is no longer available.',color:'slate'});
    const previews=matched.map((record)=>`<article class="assignment-item-preview"><div class="assignment-item-title"><span class="preview-mark" aria-hidden="true">LL</span><div><p class="eyebrow">Assigned item</p><h4>${esc(record.title||'Untitled item')}</h4><p class="assignment-category">${esc(record.category||'LiveLabs portfolio item')}</p></div></div><dl class="assignment-identifiers"><div><dt>LiveLabs ID</dt><dd>${esc(record.livelabsId||assignment.livelabsId||'—')}</dd></div><div><dt>WMS ID</dt><dd>${esc(record.wmsId||assignment.wmsId||'—')}</dd></div></dl><a class="assignment-search-link" href="${esc(searchHref(record,assignment))}">Open item search <span aria-hidden="true">↗</span></a></article>`).join('');
    const tagContent=editing?`<fieldset class="admin-checkbox-list assignment-edit-tags">${tagCheckboxes(Array.from(draft))}</fieldset>`:`<div class="assignment-tag-preview">${tagDetails.map((tag)=>`<div class="assignment-tag-detail">${tagChip(tag)}<p>${esc(tag.description||tag.note||'No description provided.')}</p></div>`).join('')}</div>`;
    return `<article class="admin-assignment-card" data-assignment-card="${esc(assignment.id)}"><header class="assignment-card-header"><div><p class="eyebrow">Match rule · ${esc(targetLabel(assignment.target))}</p><h4>${esc(assignment.value)}</h4></div><div class="assignment-date"><span>Added</span><strong>${esc(displayDate(assignment.createdAt))}</strong></div></header><div class="assignment-preview-grid">${previews||'<p class="admin-muted">The assigned item is not in the current inventory snapshot.</p>'}</div><section class="assignment-tags-area"><h5>Assigned tags <span>${assignment.tags.length}</span></h5>${tagContent}</section><footer class="assignment-card-actions">${editing?`<button type="button" class="admin-primary-action" data-save-assignment="${esc(assignment.id)}">Save</button><button type="button" data-cancel-assignment-edit="${esc(assignment.id)}">Cancel</button>`:`<button type="button" data-edit-assignment="${esc(assignment.id)}">Edit</button>`}<button type="button" class="admin-remove-action" data-delete-assignment="${esc(assignment.id)}">Remove assignment</button></footer></article>`;
  }
  function renderAssignments() {
    const query=normalize($('assignment-search').value);
    const filtered=assignments.filter((assignment)=>{
      const tagText=assignment.tags.map((key)=>{const tag=definitions.find((item)=>item.key===key);return `${tag?.label||key} ${tag?.description||''}`;}).join(' ');
      const recordText=recordsForAssignment(assignment).map((record)=>`${record.title} ${record.livelabsId} ${record.wmsId} ${record.category}`).join(' ');
      return !query||normalize(`${assignment.value} ${assignment.target} ${tagText} ${recordText}`).includes(query);
    });
    const itemCount=assignments.reduce((count,assignment)=>count+Math.max(1,recordsForAssignment(assignment).length),0);
    $('assignment-count').textContent=`${itemCount} ${itemCount===1?'item':'items'} · ${assignments.length} ${assignments.length===1?'rule':'rules'}`;
    $('assignments').innerHTML=filtered.length?filtered.map((assignment)=>assignmentCard(assignment,assignments.indexOf(assignment))).join(''):'<p class="admin-empty">No tag assignments match this filter.</p>';
    $('assignments').querySelectorAll('[data-edit-assignment]').forEach((button)=>button.addEventListener('click',()=>{
      const assignment=assignments.find((item)=>item.id===button.dataset.editAssignment);
      if(!assignment)return;
      assignmentDrafts.set(assignment.id,new Set(assignment.tags));
      renderAssignments();
      $('assignments').querySelector(`[data-assignment-card="${CSS.escape(assignment.id)}"] input[type="checkbox"]`)?.focus();
    }));
    $('assignments').querySelectorAll('[data-cancel-assignment-edit]').forEach((button)=>button.addEventListener('click',()=>{assignmentDrafts.delete(button.dataset.cancelAssignmentEdit);renderAssignments();}));
    $('assignments').querySelectorAll('[data-save-assignment]').forEach((button)=>button.addEventListener('click',async()=>{
      const assignment=assignments.find((item)=>item.id===button.dataset.saveAssignment), card=button.closest('[data-assignment-card]');
      if(!assignment||!card)return;
      const tags=Array.from(card.querySelectorAll('.assignment-edit-tags input:checked')).map((input)=>input.value);
      if(!tags.length){status('Choose at least one tag, or remove the assignment.');card.querySelector('.assignment-edit-tags input')?.focus();return;}
      const previous={...assignment,tags:[...assignment.tags]};
      assignment.tags=tags;assignmentDrafts.delete(assignment.id);renderAssignments();
      try{await save();}catch(error){Object.assign(assignment,previous);renderAssignments();status(`Could not save assignment: ${error.message}`);}
    }));
    $('assignments').querySelectorAll('[data-delete-assignment]').forEach((button)=>button.addEventListener('click',async()=>{
      const index=assignments.findIndex((item)=>item.id===button.dataset.deleteAssignment);
      if(index<0)return;
      const [removed]=assignments.splice(index,1);assignmentDrafts.delete(removed.id);renderAssignments();
      try{await save();}catch(error){assignments.splice(index,0,removed);renderAssignments();status(`Could not remove assignment: ${error.message}`);}
    }));
  }

  $('tag-color').innerHTML=colorOptions('teal');
  $('tag-color').addEventListener('change',()=>{const color=safeColor($('tag-color').value),preview=$('new-tag-color-preview');preview.className=`admin-tag-chip ${toneClass(color)} tag-color-preview`;preview.textContent=`${colors[color].label} preview`;});
  $('tag-form').addEventListener('submit',async(event)=>{
    event.preventDefault();
    const label=$('tag-label').value.trim(),description=$('tag-description').value.trim(),color=safeColor($('tag-color').value);
    if(!label){status('Tag title is required.');$('tag-label').focus();return;}
    if(!description){status('Tag description is required.');$('tag-description').focus();return;}
    const base=slug(label),keys=new Set(definitions.map((tag)=>tag.key));let key=base,index=2;while(keys.has(key)){key=`${base}-${index++}`;}
    const tag={key,label,description,className:'',color};definitions.push(tag);
    $('tag-label').value='';$('tag-description').value='';$('tag-color').value='teal';renderDefinitions(true);
    if(selectedRecord)selectRecord(selectedRecord);
    try{await save();}catch(error){definitions=definitions.filter((item)=>item.key!==key);renderDefinitions();renderAssignments();status(`Could not add tag: ${error.message}`);}
  });
  $('item-search').addEventListener('input',searchRecords);
  $('assignment-search').addEventListener('input',renderAssignments);
  $('assignment-form').addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(!selectedRecord)return;
    const option=$('assignment-target').selectedOptions[0],target=$('assignment-target').value,value=option?.dataset.value||'';
    const tags=Array.from($('assignment-tags').querySelectorAll('input:checked')).map((input)=>input.value);
    const existing=assignments.find((row)=>rowKey(row.target,row.value)===rowKey(target,value));
    if(!tags.length){status('Choose at least one tag before saving.');$('assignment-tags').querySelector('input')?.focus();return;}
    const next={...(existing||{}),enabled:true,id:existing?.id||uniqueId(),target,value,tags,createdAt:existing?existing.createdAt:new Date().toISOString(),...selectedRecordData(selectedRecord)};
    assignments=assignments.filter((row)=>rowKey(row.target,row.value)!==rowKey(target,value));
    assignments.push(next);
    $('assignment-form').hidden=true;selectedRecord=null;renderAssignments();
    try{await save();}catch(error){assignments=assignments.filter((row)=>row.id!==next.id);if(existing)assignments.push(existing);renderAssignments();status(`Could not save assignment: ${error.message}`);}
  });
  $('cancel-assignment').addEventListener('click',()=>{$('assignment-form').hidden=true;selectedRecord=null;});

  (async()=>{try{
    const session=await api('session');csrf=session.csrf;$('identity').textContent=`Signed in as ${session.username} · session expires ${new Date(session.idleExpires*1000).toLocaleString()}`;
    const saved=await api('dashboard-state'),initial=saved.state||localFallback();
    definitions=Array.isArray(initial.tagDefinitions)?initial.tagDefinitions.map((tag)=>({...tag,description:String(tag?.description||tag?.note||defaultTags.find((item)=>item.key===tag?.key)?.description||''),color:safeColor(tag?.color||defaultTags.find((item)=>item.key===tag?.key)?.color)})):[];
    assignments=Array.isArray(initial.rowOverrides)?initial.rowOverrides.filter((row)=>row&&row.tags?.length).map((row)=>({enabled:row.enabled!==false,id:row.id||uniqueId(),target:row.target,value:row.value,tags:row.tags.filter((key)=>definitions.some((tag)=>tag.key===key)),createdAt:row.createdAt||'',recordTitle:String(row.recordTitle||''),livelabsId:String(row.livelabsId||''),wmsId:String(row.wmsId||'')})).filter((row)=>row.tags.length):[];
    const response=await fetch('/inventory/data/portfolio_inventory.json');
    if(!response.ok)throw new Error('Could not load the current inventory.');
    const payload=await response.json();
    records=(Array.isArray(payload.records)?payload.records:[]).map((record)=>({...record,key:String(record.key||`${record.livelabsId||''}|${record.wmsId||''}|${record.title||''}`)}));
    renderDefinitions();renderAssignments();searchRecords();window.LiveLabsLoading.ready();
    status(saved.state?'Loaded saved dashboard tags.':'Loaded existing browser tags. Save changes to store them in the admin service.');
  }catch(error){status(error.message);window.LiveLabsLoading.fail('Dashboard management could not be loaded.');}})();
})();

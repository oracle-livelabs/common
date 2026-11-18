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
  let csrf = '', sessionTimer, definitions = [], assignments = [], records = [], selectedRecord = null, savingState = false;
  const editDrafts = new Map();
  const assignmentDrafts = new Map();
  const assignmentView = {page:1, size:10, sort:'livelabsId', direction:1, expanded:'', removing:'', busy:false, message:''};
  const assignmentFilterIds = ['assignment-search','assignment-type','assignment-livelabs-filter','assignment-wms-filter','assignment-council','assignment-tag','assignment-target-filter'];

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
    // Every tag mutation saves the complete rule set. Prevent overlapping edits.
    savingState=true;
    const controls=Array.from($('tags').querySelectorAll('button,input,select,textarea')).filter(control=>!control.disabled);
    controls.forEach(control=>control.disabled=true);
    try {
      const result = await api('dashboard-state',{tagDefinitions:definitions,rowOverrides:assignments});
      writeLocal();
      status(`Saved ${result.tagDefinitions} tags and ${result.assignments} item assignments. Dashboard badges update as pages reload.`);
    } finally {
      savingState=false;
      controls.forEach(control=>{if(control.isConnected)control.disabled=false;});
    }
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
    return [{title:assignment.recordTitle||(assignment.target==='title'?assignment.value:'Item unavailable'),
      livelabsId:assignment.livelabsId||(assignment.target==='livelabs_id'?assignment.value:''),
      wmsId:assignment.wmsId||(assignment.target==='wms_id'?assignment.value:''),category:'',key:'',missing:true}];
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
  function assignmentTags(assignment) {
    return assignment.tags.map(key=>definitions.find(tag=>tag.key===key)||{key,label:key,description:'Tag definition is no longer available.',color:'slate'});
  }
  function assignmentRows() {
    return assignments.flatMap(assignment=>recordsForAssignment(assignment).map((record,index)=>({assignment,record,
      key:JSON.stringify([assignment.id,record.key||record.livelabsId||record.wmsId,index]),
      type:record.type||'Unknown',tags:assignmentTags(assignment)})));
  }
  function assignmentCell(row, field) {
    if(field==='tags')return row.tags.map(tag=>tag.label||tag.key).join(', ');
    if(field==='rule')return `${targetLabel(row.assignment.target)}: ${row.assignment.value}`;
    if(field==='createdAt')return row.assignment.createdAt||'';
    if(field==='type')return row.type;
    return String(row.record[field]??'');
  }
  function filteredAssignmentRows(rows=assignmentRows()) {
    const query=normalize($('assignment-search').value);
    return rows.filter(row=>{
      const {record,assignment}=row;
      const haystack=[record.title,record.livelabsId,record.wmsId,record.category,record.owner,row.type,
        assignment.value,targetLabel(assignment.target),...row.tags.map(tag=>`${tag.label} ${tag.description||tag.note||''}`)].join(' ');
      return (!query||normalize(haystack).includes(query))
        && (!$('assignment-type').value||row.type===$('assignment-type').value)
        && normalize(record.livelabsId).includes(normalize($('assignment-livelabs-filter').value))
        && normalize(record.wmsId).includes(normalize($('assignment-wms-filter').value))
        && (!$('assignment-council').value||record.category===$('assignment-council').value)
        && (!$('assignment-tag').value||assignment.tags.includes($('assignment-tag').value))
        && (!$('assignment-target-filter').value||assignment.target===$('assignment-target-filter').value);
    }).sort((a,b)=>assignmentView.direction*assignmentCell(a,assignmentView.sort).localeCompare(assignmentCell(b,assignmentView.sort),undefined,{numeric:true,sensitivity:'base'}));
  }
  function refreshAssignmentOptions() {
    for(const [id,empty,options] of [
      ['assignment-council','All councils',[...new Set(records.map(record=>record.category).filter(Boolean))].sort().map(value=>[value,value])],
      ['assignment-tag','All tags',definitions.map(tag=>[tag.key,tag.label])]
    ]) {
      const selected=$(id).value;
      $(id).innerHTML=`<option value="">${empty}</option>`+options.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
      if(options.some(([value])=>value===selected))$(id).value=selected;
    }
  }
  function fieldLabel(value) {
    return String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^./,char=>char.toUpperCase());
  }
  function detailValue(value) {
    if(value===null||value===undefined||value==='')return 'Not recorded';
    if(typeof value==='boolean')return value?'Yes':'No';
    if(Array.isArray(value))return value.length?`<ul>${value.map(item=>`<li>${detailValue(item)}</li>`).join('')}</ul>`:'None recorded';
    if(typeof value==='object')return detailFields(Object.entries(value).map(([key,item])=>[fieldLabel(key),item]));
    const text=String(value);
    if(/^https?:\/\//i.test(text)&&!/[\s<>"']/.test(text))return `<a href="${esc(text)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
    return esc(text);
  }
  function detailFields(fields) {
    return `<dl class="assignment-info-grid">${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${detailValue(value)}</dd></div>`).join('')}</dl>`;
  }
  function assignmentDetail(row) {
    const {assignment,record,tags}=row, editing=assignmentDrafts.has(assignment.id);
    const matched=recordsForAssignment(assignment).filter(item=>!item.missing);
    const scope=`${targetLabel(assignment.target)}: ${assignment.value}. This rule matches ${matched.length} ${matched.length===1?'item':'items'} in the current inventory. Editing or removing this rule affects all its matched items.`;
    const summaryKeys=['livelabsId','wmsId','title','category','owner','type','publishType','publishStatus','status','update'];
    const extra=Object.entries(record).filter(([key])=>!summaryKeys.includes(key)&&!['details','values','searchable','missing'].includes(key));
    const fields=Array.isArray(record.details)?record.details.filter(field=>Array.isArray(field)&&field.length>=2):[];
    return `<div class="assignment-detail-content" data-assignment-card="${esc(assignment.id)}">
      <div class="assignment-detail-heading"><h4>${esc(record.title||'Item unavailable')}</h4><button type="button" data-close-assignment>Close details</button></div>
      <p class="assignment-rule-scope">${esc(scope)} ${assignment.enabled===false?'<strong>Disabled — this rule is not applied to dashboard items.</strong>':''}</p>
      ${matched.length>1?`<details class="assignment-related"><summary>Items matched by this rule (${matched.length})</summary><ul>${matched.map(item=>`<li>LiveLabs ${esc(item.livelabsId||'—')} · ${esc(item.type||'Unknown')} · ${esc(item.title)}</li>`).join('')}</ul></details>`:''}
      <div class="assignment-detail-grid"><section class="assignment-item-details"><h5>Item information</h5>
        ${record.missing?'<p class="admin-empty">This item is not in the current inventory. Only saved assignment information is available.</p>':''}
        ${detailFields([['LiveLabs ID',record.livelabsId],['WMS ID',record.wmsId],['Title',record.title],['Council',record.category],['Author / owner',record.owner],['Type',record.type],['Publish type',record.publishType],['Publish status',record.publishStatus],['Workflow status',record.status],['Last update',record.update]])}
        <a class="assignment-search-link" href="${esc(searchHref(record,assignment))}">Open item search</a>
        ${fields.length?`<details><summary>Source fields</summary>${detailFields(fields)}</details>`:''}
        ${extra.length?`<details><summary>Review and provenance</summary>${detailFields(extra.map(([key,value])=>[fieldLabel(key),value]))}</details>`:''}
      </section><section class="assignment-tags-editor"><h5>Assigned tags (${assignment.tags.length})</h5>
        ${editing?`<fieldset class="admin-checkbox-list assignment-edit-tags" ${assignmentView.busy?'disabled':''}>${tagCheckboxes([...assignmentDrafts.get(assignment.id)])}</fieldset>`:
          `<div class="assignment-tag-preview">${tags.map(tag=>`<div class="assignment-tag-detail">${tagChip(tag)}<p>${esc(tag.description||tag.note||'No description provided.')}</p></div>`).join('')}</div>`}
        <p class="assignment-date-note">Added ${esc(displayDate(assignment.createdAt))}</p>
        <p class="assignment-action-status" role="status" aria-live="polite">${esc(assignmentView.message)}</p>
        <div class="assignment-card-actions">${editing?`<button type="button" class="admin-primary-action" data-save-assignment>Save tags</button><button type="button" data-cancel-assignment-edit>Cancel</button>`:`<button type="button" data-edit-assignment>Edit tags</button>`}
          <button type="button" data-delete-assignment>Remove assignment</button></div>
        ${assignmentView.removing===assignment.id?`<div class="assignment-remove-confirm"><p>Remove this rule and its tags from ${matched.length||'the saved'} ${matched.length===1?'item':'items'}? The items and tag definitions will remain.</p><button type="button" data-confirm-assignment-delete>Confirm removal</button><button type="button" data-cancel-assignment-delete>Keep assignment</button></div>`:''}
      </section></div></div>`;
  }
  function renderAssignments() {
    refreshAssignmentOptions();
    const all=assignmentRows(), filtered=filteredAssignmentRows(all);
    const items=new Set(all.filter(row=>!row.record.missing).map(row=>row.record.key||row.record.livelabsId));
    const unmatched=new Set(all.filter(row=>row.record.missing).map(row=>row.assignment.id)).size;
    $('assignment-count').textContent=`${items.size} ${items.size===1?'item':'items'} · ${assignments.length} ${assignments.length===1?'rule':'rules'}${unmatched?` · ${unmatched} unmatched`:''}`;
    const pages=Math.max(1,Math.ceil(filtered.length/assignmentView.size));
    assignmentView.page=Math.max(1,Math.min(assignmentView.page,pages));
    const start=(assignmentView.page-1)*assignmentView.size, visible=filtered.slice(start,start+assignmentView.size);
    $('assignment-page-status').textContent=filtered.length?`${start+1}–${start+visible.length} of ${filtered.length} rows`:'No records to show';
    $('assignment-page-number').textContent=`Page ${assignmentView.page} of ${pages}`;
    $('assignment-previous').disabled=assignmentView.page===1;
    $('assignment-next').disabled=assignmentView.page===pages;
    $('assignment-export').disabled=!filtered.length;
    document.querySelectorAll('[data-assignment-sort]').forEach(button=>{
      if(button.dataset.assignmentSort===assignmentView.sort)button.parentElement.setAttribute('aria-sort',assignmentView.direction===1?'ascending':'descending');
      else button.parentElement.removeAttribute('aria-sort');
    });
    $('assignments').innerHTML=visible.map((row,index)=>{
      const {record,assignment}=row, open=assignmentView.expanded===row.key, detailId=`assignment-detail-${index}`;
      return `<tr data-assignment-row="${esc(row.key)}" class="${open?'is-expanded':''}">
        <td><button type="button" class="assignment-row-toggle" data-toggle-assignment aria-expanded="${open}" aria-controls="${detailId}" aria-label="${open?'Hide':'Show'} details for ${esc(record.title)}">${esc(record.livelabsId||'—')}</button></td>
        <td>${esc(record.wmsId||'—')}</td><td>${esc(record.title||'Item unavailable')}</td><td>${esc(record.category||'—')}</td><td>${esc(record.owner||'—')}</td><td>${esc(row.type)}</td>
        <td>${row.tags.map(tag=>tagChip(tag)).join('')}</td><td>${esc(assignmentCell(row,'rule'))}${assignment.enabled===false?'<span class="assignment-disabled">Disabled</span>':''}</td><td>${esc(displayDate(assignment.createdAt))}</td></tr>
        <tr id="${detailId}" class="assignment-row-detail" ${open?'':'hidden'}><td colspan="9">${open?assignmentDetail(row):''}</td></tr>`;
    }).join('')||`<tr><td colspan="9" class="admin-empty">${assignments.length?'No assignments match these filters.':'No assignments yet. Assign tags to an item above to get started.'}</td></tr>`;
    $('assignments').querySelectorAll('[data-assignment-row]').forEach(element=>element.addEventListener('click',event=>{
      if(savingState||assignmentView.busy||event.target.closest('a,input,select,textarea')||(!event.target.closest('button')&&window.getSelection()?.toString()))return;
      assignmentView.expanded=assignmentView.expanded===element.dataset.assignmentRow?'':element.dataset.assignmentRow;
      assignmentView.removing='';assignmentView.message='';renderAssignments();focusAssignmentToggle(element.dataset.assignmentRow);
    }));
    const row=visible.find(item=>item.key===assignmentView.expanded);
    if(row)bindAssignmentActions(row);
  }
  function focusAssignmentToggle(key=assignmentView.expanded) {
    const element=Array.from($('assignments').querySelectorAll('[data-assignment-row]')).find(row=>row.dataset.assignmentRow===key);
    element?.querySelector('[data-toggle-assignment]')?.focus({preventScroll:true});
  }
  function bindAssignmentActions(row) {
    const card=$('assignments').querySelector('[data-assignment-card]'), {assignment}=row;
    const action=(selector,handler)=>card.querySelector(selector)?.addEventListener('click',handler);
    card.querySelectorAll('button').forEach(button=>button.disabled=assignmentView.busy);
    action('[data-close-assignment]',()=>{assignmentView.expanded='';renderAssignments();Array.from($('assignments').querySelectorAll('[data-assignment-row]')).find(element=>element.dataset.assignmentRow===row.key)?.querySelector('button').focus();});
    action('[data-edit-assignment]',()=>{assignmentDrafts.set(assignment.id,new Set(assignment.tags));assignmentView.message='';renderAssignments();$('assignments').querySelector('.assignment-edit-tags input')?.focus();});
    card.querySelectorAll('.assignment-edit-tags input').forEach(input=>input.addEventListener('change',()=>{
      const draft=assignmentDrafts.get(assignment.id);if(input.checked)draft.add(input.value);else draft.delete(input.value);
    }));
    action('[data-cancel-assignment-edit]',()=>{assignmentDrafts.delete(assignment.id);assignmentView.message='';renderAssignments();$('assignments').querySelector('[data-edit-assignment]')?.focus();});
    action('[data-save-assignment]',async()=>{
      const tags=[...assignmentDrafts.get(assignment.id)];
      if(!tags.length){assignmentView.message='Choose at least one tag, or remove the assignment.';renderAssignments();return;}
      const previous=assignment.tags;
      assignment.tags=definitions.filter(tag=>tags.includes(tag.key)).map(tag=>tag.key);
      assignmentView.busy=true;assignmentView.message='Saving tags…';renderAssignments();
      try{await save();assignmentDrafts.delete(assignment.id);assignmentView.message='Tags saved.';}
      catch(error){assignment.tags=previous;assignmentView.message=`Could not save assignment: ${error.message} Your edits are kept for retry.`;status(assignmentView.message);}
      finally{assignmentView.busy=false;renderAssignments();$('assignments').querySelector('[data-save-assignment],[data-edit-assignment]')?.focus({preventScroll:true});}
    });
    action('[data-delete-assignment]',()=>{assignmentView.removing=assignment.id;renderAssignments();$('assignments').querySelector('[data-confirm-assignment-delete]')?.focus();});
    action('[data-cancel-assignment-delete]',()=>{assignmentView.removing='';renderAssignments();$('assignments').querySelector('[data-delete-assignment]')?.focus();});
    action('[data-confirm-assignment-delete]',async()=>{
      const index=assignments.indexOf(assignment);
      assignmentView.busy=true;assignmentView.message='Removing assignment…';renderAssignments();
      assignments.splice(index,1);
      try{await save();assignmentDrafts.delete(assignment.id);assignmentView.removing='';assignmentView.expanded='';assignmentView.message='';}
      catch(error){assignments.splice(index,0,assignment);assignmentView.message=`Could not remove assignment: ${error.message}`;status(assignmentView.message);}
      finally{assignmentView.busy=false;renderAssignments();if(assignmentView.expanded)$('assignments').querySelector('[data-confirm-assignment-delete]')?.focus();else $('assignment-page-status').scrollIntoView({block:'nearest'});}
    });
  }
  function exportAssignments() {
    const fields=['livelabsId','wmsId','title','category','owner','type','tags','rule','createdAt'];
    const headers=Array.from($('assignment-table').querySelectorAll('thead th')).map(th=>th.textContent.trim());
    const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
    const csv=[headers,...filteredAssignmentRows().map(row=>fields.map(field=>assignmentCell(row,field)))].map(row=>row.map(cell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='current-assignments.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
  assignmentFilterIds.forEach(id=>$(id).addEventListener($(id).tagName==='SELECT'?'change':'input',()=>{assignmentView.page=1;renderAssignments();}));
  $('assignment-clear').addEventListener('click',()=>{assignmentFilterIds.forEach(id=>$(id).value='');assignmentView.page=1;renderAssignments();});
  $('assignment-page-size').addEventListener('change',()=>{assignmentView.size=Number($('assignment-page-size').value);assignmentView.page=1;renderAssignments();});
  $('assignment-previous').addEventListener('click',()=>{assignmentView.page--;renderAssignments();});
  $('assignment-next').addEventListener('click',()=>{assignmentView.page++;renderAssignments();});
  $('assignment-export').addEventListener('click',exportAssignments);
  document.querySelectorAll('[data-assignment-sort]').forEach(button=>button.addEventListener('click',()=>{
    const field=button.dataset.assignmentSort;
    assignmentView.direction=assignmentView.sort===field?-assignmentView.direction:1;assignmentView.sort=field;assignmentView.page=1;renderAssignments();
  }));
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
    const payload=await api('inventory');
    records=(Array.isArray(payload.records)?payload.records:[]).map((record)=>({...record,key:String(record.key||`${record.livelabsId||''}|${record.wmsId||''}|${record.title||''}`)}));
    renderDefinitions();renderAssignments();searchRecords();window.LiveLabsLoading.ready();
    status(saved.state?'Loaded saved dashboard tags.':'Loaded existing browser tags. Save changes to store them in the admin service.');
  }catch(error){status(error.message);window.LiveLabsLoading.fail('Dashboard management could not be loaded.');}})();
})();

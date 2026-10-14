/* Candidate evaluation is available to dashboard readers; decisions remain admin-only. */
(() => {
  'use strict';
  let records, panel, lastRows;
  const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fields = [
    ['Title', r=>r.title], ['LiveLabs ID',r=>r.livelabsId], ['WMS ID',r=>r.wmsId],
    ['Content type',r=>r.type], ['Publication state',r=>[r.publishStatus,r.publishType].filter(Boolean).join(' / ')],
    ['Objectives / source description',r=>value(r,['Objectives','Learning Objectives','Short Description','Long Description'])],
    ['Prerequisites',r=>value(r,['Prerequisites','Prerequisite'])], ['Products',r=>value(r,['Product','Products'])],
    ['Product versions',r=>value(r,['Product Version','Versions','Version'])], ['Level',r=>value(r,['Workshop Level'])],
    ['Deployment / environment',r=>value(r,['Deployment Target','Environment','Workshop Series'])],
    ['WMS-reported owner',r=>r.owner], ['Content update evidence',r=>value(r,['Update Evidence'])],
    ['Meaningful content update',r=>value(r,['Last Meaningful Workshop Update'])]
  ];
  function value(record,labels) { const map=new Map([...(record.values||[]),...(record.details||[])]); return labels.map(l=>map.get(l)).find(v=>v!=null&&String(v).trim()) || ''; }
  const label = r => `${r.title} [${r.livelabsId ? 'LiveLabs '+r.livelabsId : 'WMS '+r.wmsId+' / '+r.key}]`;
  async function ensure() {
    if(panel) return;
    const response=await fetch('./inventory/data/portfolio_inventory.json'); if(!response.ok) throw new Error('Inventory could not be loaded.');
    records=(await response.json()).records;
    panel=document.createElement('section'); panel.id='replacement-comparison'; panel.className='section panel replacement-comparison'; panel.hidden=true;
    panel.innerHTML=`<h2>Compare replacement candidates</h2><p>Compare source evidence before choosing a successor. Missing objectives, prerequisites, or versions are evidence gaps; similarity alone does not establish coverage.</p><div class="comparison-controls"><label>Current content<input id="comparison-current" list="comparison-records" placeholder="Search title or ID"></label><label>Candidate replacement<input id="comparison-candidate" list="comparison-records" placeholder="Search title or ID"></label><button type="button" id="comparison-run">Compare</button><button type="button" id="comparison-close">Close comparison</button></div><datalist id="comparison-records">${records.map(r=>`<option value="${escape(label(r))}"></option>`).join('')}</datalist><p id="comparison-status" role="status"></p><div id="comparison-output"></div>`;
    document.querySelector('#replacement-suggestions').after(panel);
    panel.querySelector('#comparison-run').onclick=render;
    panel.querySelector('#comparison-close').onclick=()=>{panel.hidden=true;};
  }
  function render() {
    const a=records.find(r=>label(r)===panel.querySelector('#comparison-current').value), b=records.find(r=>label(r)===panel.querySelector('#comparison-candidate').value);
    const status=panel.querySelector('#comparison-status');
    if(!a||!b){status.textContent='Select both records from the suggestions.'; return;}
    if(a.key===b.key){status.textContent='Choose two different records.'; return;}
    const rows=fields.map(([name,get])=>[name,get(a)||'N/A',get(b)||'N/A']);
    const required=['Objectives / source description','Prerequisites','Products','Product versions','Deployment / environment'];
    const gaps=column=>rows.filter(row=>required.includes(row[0])&&row[column]==='N/A').map(row=>row[0]).join('; ')||'No missing fields in this comparison';
    rows.push(['Coverage assessment','Manual assessment required','Manual assessment required']);
    rows.push(['Evidence gaps',gaps(1),gaps(2)]);
    lastRows=[['Field','Current content','Candidate replacement'],...rows];
    status.textContent='Source descriptions are shown as supplied; objectives and coverage are not inferred. Record your decision in the admin panel.';
    panel.querySelector('#comparison-output').innerHTML=`<div class="comparison-table-wrap"><table><thead><tr><th>Field</th><th>Current content</th><th>Candidate replacement</th></tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p><button type="button" id="comparison-csv">Export comparison CSV</button> <button type="button" id="comparison-excel">Export formatted Excel</button></p>`;
    panel.querySelector('#comparison-csv').onclick=()=>LiveLabsExport.csv(lastRows,`replacement-${a.livelabsId||a.wmsId}-${b.livelabsId||b.wmsId}.csv`);
    panel.querySelector('#comparison-excel').onclick=()=>LiveLabsExport.xlsx(lastRows,`replacement-${a.livelabsId||a.wmsId}-${b.livelabsId||b.wmsId}.xlsx`);
  }
  async function open(a,b) {
    await ensure();panel.hidden=false;
    panel.querySelector('#comparison-current').value=records.find(r=>String(r.livelabsId)===String(a)) ? label(records.find(r=>String(r.livelabsId)===String(a))) : '';
    panel.querySelector('#comparison-candidate').value=records.find(r=>String(r.livelabsId)===String(b)) ? label(records.find(r=>String(r.livelabsId)===String(b))) : '';
    if(a&&b) render(); panel.querySelectorAll('button').forEach(button=>button.classList.add('nav-link'));panel.scrollIntoView({behavior:'smooth',block:'start'});panel.querySelector('#comparison-current').focus({preventScroll:true});
  }
  function decorate() {
    const section=document.querySelector('#replacement-suggestions'); if(!section) return;
    const heading=section.querySelector('.section-head');
    if(heading&&!heading.querySelector('[data-open-comparison]')) {const button=document.createElement('button');button.type='button';button.className='nav-link';button.dataset.openComparison='';button.textContent='Compare replacement candidates';heading.append(button);}
    section.querySelectorAll('#replacement-recommendations tbody tr').forEach(row=>{
      const cells=[...row.children]; if(cells.length<10||row.querySelector('[data-compare-replacement]'))return;
      const cellValue=cell=>cell.querySelector('[data-copy-value]')?.dataset.copyValue || cell.dataset.filterValue || cell.textContent.trim();
      const a=cellValue(cells[3]),b=cellValue(cells[8]); if(!/^\d+$/.test(a)||!/^\d+$/.test(b))return;
      const button=document.createElement('button');button.type='button';button.className='nav-link';button.dataset.compareReplacement=a;button.dataset.candidate=b;button.textContent='Compare';button.setAttribute('aria-label',`Compare replacement for LiveLabs ${a}`);cells[6].append(document.createElement('br'),button);
    });
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-open-comparison],[data-compare-replacement]');if(button){const endLoading=window.LiveLabsLoading.begin('Preparing replacement comparison…');open(button.dataset.compareReplacement,button.dataset.candidate).catch(error=>{button.textContent=error.message;}).finally(endLoading);}});
  const start=()=>{decorate();new MutationObserver(decorate).observe(document.querySelector('main'),{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

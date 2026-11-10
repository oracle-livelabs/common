/* Author-facing evidence: source text is escaped and links are restricted. */
(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /\/p\/[^/]+\/n\//i.test(url.pathname)) return '';
      if ([...url.searchParams.keys()].some(key => /token|signature|credential|authorization|secret|password|^sig$|^key$|^code$/i.test(key))) return '';
      if (/token|signature|credential|authorization|secret|password/i.test(url.hash)) return '';
      return url.href;
    } catch { return ''; }
  }
  function maskedParUrl(value) {
    try {
      const url=new URL(value);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password||! /\/p\/[^/]+\/n\//i.test(url.pathname))return '';
      url.pathname=url.pathname.replace(/\/p\/[^/]+\/n\//gi,'/p/***/n/');url.search='';url.hash='';
      return url.href;
    } catch { return ''; }
  }
  const readable = value => String(value ?? '').replace(/(?:https?:\/\/|javascript:)[^\s<>"']+/gi, url => safeUrl(url) || maskedParUrl(url) || '[restricted link]');
  const text = value => escape(readable(value));
  const button = (url, label, primary = false) => safeUrl(url) ? `<a class="author-button${primary ? ' author-button-primary' : ''}" href="${escape(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : '';
  const copyButton = (value,label) => value ? `<button type="button" class="author-button" data-copy-value="${escape(readable(value))}" aria-label="${escape(label)}">${escape(label)}</button>` : '';
  function reportDate(value) {
    const date=value?new Date(value):null;
    return date&&!Number.isNaN(date.getTime())?`<time datetime="${date.toISOString()}" title="${text(value)}">${date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</time>`:'Not supplied';
  }
  function sourceUrl(item) {
    const safe=safeUrl(item.sourceFileUrl);
    if(!safe)return '';
    const url=new URL(safe), line=Number(item.sourceLine);
    if(url.hostname==='raw.githubusercontent.com') {
      const parts=url.pathname.split('/').filter(Boolean);
      if(parts.length>=4){url.hostname='github.com';url.pathname='/'+parts.slice(0,2).join('/')+'/blob/'+parts.slice(2).join('/');}
    }
    if(url.hostname==='github.com'&&url.pathname.includes('/blob/')&&Number.isInteger(line)&&line>0)url.hash=`L${line}`;
    return url.href;
  }
  function excerptHtml(value,marker='') {
    const source=readable(value), selected=readable(marker);
    const index=selected?source.indexOf(selected):-1;
    const start=source.length>300&&index>110?index-110:0;
    const end=Math.min(source.length,Math.max(start+300,index+selected.length));
    const preview=source.slice(start,end), markerIndex=index-start;
    const content=markerIndex<0?escape(preview):escape(preview.slice(0,markerIndex))+`<mark>${escape(selected)}</mark>`+escape(preview.slice(markerIndex+selected.length));
    const shortened=start>0||end<source.length;
    return source?`<div class="author-source-excerpt"><span>Find this text</span><pre>${start?'…':''}${content}${end<source.length?'…':''}</pre>${copyButton(source,'Copy source text')}${shortened?`<details class="author-full-excerpt"><summary>Full source text</summary><pre>${escape(source)}</pre></details>`:''}</div>`:'';
  }
  function sourceLocationHtml(item, first=false) {
    const destination=safeUrl(item.pageUrl)||safeUrl(item.actionUrl);
    const exactLab=destination&&new URL(destination).searchParams.has('lab');
    const source=sourceUrl(item);
    const specific=source||item.sourceLine||item.labTitle||item.labNumber||item.section||exactLab||/\bLab\s+\d+\b/i.test(item.location||'');
    const fullTitle=item.labTitle||item.label||(item.labNumber?`Lab ${item.labNumber}`:'Reported page');
    const labStart=String(fullTitle).search(/\bLab\s+\d+\s*:/i);
    const title=labStart>0?fullTitle.slice(labStart):fullTitle;
    const location=[item.section?`Section: ${item.section}`:'',item.sourceLine?`Markdown line ${item.sourceLine}`:'',item.instruction?`Instruction: ${item.instruction}`:'',item.location].filter(Boolean).filter((value,index,list)=>list.indexOf(value)===index);
    const action=exactLab?'Open exact lab':item.pageUrl?'Open reported page':item.actionLabel||'Open reported page';
    return `<div class="author-source-location${first?' author-first-check':''}" title="${text(fullTitle)}">${first?`<p class="author-first-label">${specific?'Check here first':'Exact location not supplied'}</p>`:''}<strong>${text(title)}</strong>${location.length?`<p class="author-location">${location.map(text).join(' · ')}</p>`:''}
      <div class="author-target-actions">${button(destination,action,Boolean(first&&exactLab))}${button(source,'Open source',Boolean(first&&!exactLab))}</div>
      ${excerptHtml(item.sourceText||item.text||item.searchText,item.marker||item.searchText)}</div>`;
  }
  function sourceSpecificity(item) {
    const page=safeUrl(item.pageUrl)||safeUrl(item.actionUrl);
    return (safeUrl(item.sourceFileUrl)?8:0)+(Number(item.sourceLine)>0?4:0)+(page&&new URL(page).searchParams.has('lab')?2:0)+(item.section?1:0);
  }
  function technicalDetailsHtml(item) {
    const masked=maskedParUrl(item.maskedUrl), response=Number(item.httpStatus)>0?`HTTP ${item.httpStatus}`:item.error||'';
    const values=[['Object',item.objectName],['Bucket',item.bucket],['Namespace',item.namespace],['Region',item.region],
      ['Response',response],['Reported status',item.status],['Method',item.method],['Attempts',item.attempts],['Checked at',item.checkedAt],['Technical link ID',item.fingerprint]];
    if(!masked&&!item.fingerprint&&!item.httpStatus)return '';
    return `<details class="author-target-technical"><summary>Technical details</summary>${masked?`<code>${text(masked)}</code>${copyButton(masked,'Copy masked URL')}<p class="author-evidence-note">PAR access token masked in the report.</p>`:''}
      <dl>${values.filter(([,value])=>value).map(([label,value])=>`<div><dt>${label}</dt><dd>${text(value)}</dd></div>`).join('')}</dl></details>`;
  }
  function targetHtml(item) {
    const target=safeUrl(item.href||item.url);
    const excerpt=item.sourceText||item.text, status=Number(item.httpStatus||item.status)>0?`HTTP ${item.httpStatus||item.status}`:item.status;
    const sources=(Array.isArray(item.sources)&&item.sources.length?item.sources:[item]).slice().sort((a,b)=>sourceSpecificity(b)-sourceSpecificity(a));
    const [primary,...other]=sources;
    return `<article class="author-target"><strong>${text(item.label||item.objectName||item.alt||item.title||'Affected content')}</strong>
      ${status?`<p class="author-http">${text(status)}</p>`:''}
      <section class="author-source-locations" aria-label="Where to fix it">${sourceLocationHtml(primary,true)}
      ${other.length?`<details class="author-other-locations"><summary>Other recorded locations (${other.length})</summary>${other.map(source=>sourceLocationHtml(source)).join('')}</details>`:''}</section>
      ${item.detail&&!excerpt&&!(item.httpStatus&&/^HTTP\b/i.test(item.detail))?`<p>${text(item.detail)}</p>`:''}${target?`<code>${text(target)}</code>`:''}
      ${item.marker&&!(excerpt||'').includes(item.marker)?`<pre>${text(item.marker)}</pre>`:''}
      ${item.suggestion&&!/^HTTP\b/i.test(item.suggestion)?`<p><b>Suggested change:</b> ${text(item.suggestion)}</p>`:''}
      ${target?`<div class="author-target-actions">${button(target,'Check link')}</div>`:''}
      ${technicalDetailsHtml(item)}</article>`;
  }
  function destination(record, overlay) {
    return [record.details?.get('Production URL'), overlay?.catalogUrl, ...(overlay?.findings || []).map(issue => issue.catalogUrl)].map(safeUrl).find(url => {
      if (!url) return false;
      const host = new URL(url).hostname;
      return host === 'livelabs.oracle.com' || host.endsWith('.livelabs.oracle.com');
    }) || '';
  }
  const liveButton = (record, overlay) => button(destination(record, overlay), record.type === 'Sprint' ? 'Open sprint' : 'Open workshop');
  function qaValidity(overlay) {
    const counts = overlay.testCounts || {};
    const findings = overlay.findings || [];
    const values = {};
    for (const key of ['passed', 'failed', 'skipped', 'other', 'total']) {
      const raw = key in counts ? counts[key] : 0;
      const value = Number(raw);
      if (raw === null || (typeof raw === 'string' && !raw.trim()) || !Number.isInteger(value) || value < 0) return 'invalid-check-counts';
      values[key] = value;
    }
    if (findings.some(f => ['WORKSHOP_NOT_AVAILABLE', 'PAR_SCAN_INCOMPLETE', 'AUTHENTICATION_REQUIRED', 'SOURCE_SCAN_INCOMPLETE'].includes(String(f.code || '').toUpperCase()))) return 'inspection-unavailable';
    const completed = values.passed + values.failed;
    if (!completed) return 'no-completed-checks';
    if (values.skipped || values.other || ('total' in counts && values.total !== completed)
      || ['interrupted', 'running', 'skipped', 'timedout', 'timed out'].includes(String(overlay.itemStatus || '').toLowerCase())) return 'incomplete-checks';
    if (values.failed && !findings.some(f => ['P1','P2','P3'].includes(f.priority) && f.group === 'author-facing')) return 'unexplained-failure';
    return 'scored';
  }
  function scoreHtml(projection, overlay, context = 'performance') {
    if (!projection) return '';
    const components = projection[context + 'Components'] || [];
    const usable = overlay && qaValidity(overlay) === 'scored' && Number.isFinite(overlay.jenkinsErrorScore);
    const share = usable ? Math.min(.45, Math.max(.05, Number(overlay.scorePolicy?.tableShare ?? .25))) : 0;
    const baseline = projection[context];
    const hygiene = usable ? (context === 'performance' ? 100 - overlay.jenkinsErrorScore : overlay.jenkinsErrorScore) : null;
    const final = baseline == null ? null : baseline * (1-share) + (hygiene || 0) * share;
    const rows = components.map(c => `<tr><th scope="row">${text(c.label)}</th><td data-score-label="Value (0–100)">${c.value == null ? 'N/A' : Number(c.value).toFixed(2)}</td><td data-score-label="Baseline weight">${(100*c.effectiveWeight).toFixed(2)}%</td><td data-score-label="Final weight">${(100*c.effectiveWeight*(1-share)).toFixed(2)}%</td></tr>`).join('');
    return `<details class="search-detail-panel search-detail-panel-wide search-score-panel"><summary><h3>Score and evidence</h3></summary><p class="score-summary">Baseline <strong>${baseline == null ? 'N/A' : Number(baseline).toFixed(2)}</strong> · Final <strong>${final == null ? 'N/A' : final.toFixed(2)}</strong> · ${share ? `QA weight ${(share*100).toFixed(0)}%` : 'QA excluded'}</p><table class="search-detail-table score-evidence-table"><thead><tr><th scope="col">Component</th><th scope="col">Value (0–100)</th><th scope="col">Baseline weight</th><th scope="col">Final weight</th></tr></thead><tbody>${rows}${share ? `<tr><th scope="row">P2/P3 content hygiene</th><td data-score-label="Value (0–100)">${hygiene.toFixed(2)}</td><td data-score-label="Baseline weight">—</td><td data-score-label="Final weight">${(share*100).toFixed(2)}%</td></tr>` : ''}</tbody></table></details>`;
  }
  function evidenceHtml(overlay) {
    if (!overlay) return '<section class="search-detail-panel qa-report-overlay"><h3>Errors to review</h3><p class="note">No Jenkins report is attached to this item.</p></section>';
    const findings = overlay.findings || [];
    const groups = new Map();
    [...findings].sort((a,b) => (['P1','P2','P3'].indexOf(a.priority) + 1 || 4) - (['P1','P2','P3'].indexOf(b.priority) + 1 || 4)).forEach(issue => {
      const key = `${issue.priority || 'Review'}:${issue.code || issue.label}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(issue);
    });
    const counts = overlay.testCounts || {};
    const countValue = key => counts[key] == null ? 'unknown' : counts[key];
    const checkSummary = `${countValue('passed')} passed · ${countValue('failed')} failed · ${countValue('skipped')} skipped`;
    const signals = ['P1','P2','P3'].map(priority => {
      const items = findings.filter(issue => issue.priority === priority);
      const reported = priority === 'P1' && overlay.priorityCounts
        ? Number(overlay.priorityCounts.p1 || 0) + Number(overlay.priorityCounts.p1Verification || 0)
        : overlay.priorityCounts?.[priority.toLowerCase()];
      const total = Math.max(items.length, Number(reported || 0));
      const countLabel = total || reported != null || findings.length ? `${total} ${total === 1 ? 'finding' : 'findings'}` : 'Unknown';
      const occurrences = items.length ? items.reduce((sum, issue) => sum + Number(issue.count || 0), 0) : null;
      return `<div><dt>${priority} · ${{P1:'urgent',P2:'fix next',P3:'minor'}[priority]}</dt><dd>${countLabel}${occurrences != null ? `<small> · ${occurrences} occurrences</small>` : ''}</dd></div>`;
    }).join('');
    const field = (label, value) => value ? `<div><dt>${label}</dt><dd>${text(value)}</dd></div>` : '';
    const occurrenceCount=items=>items.every(issue=>issue.count!=null&&Number.isFinite(Number(issue.count)))?items.reduce((sum,issue)=>sum+Number(issue.count),0):null;
    const occurrenceLabel=total=>total==null?'Occurrences N/A':`${total} ${total===1?'occurrence':'occurrences'}`;
    const cards = [...groups.values()].map(items => {
      const first = items[0];
      return `<details class="author-finding-group"><summary><span class="author-priority" data-priority="${escape(first.priority || '')}">${escape(first.priority || 'Review')}</span><strong>${text(first.label || first.code)}</strong><span>${items.length} ${items.length === 1 ? 'check' : 'checks'} · ${occurrenceLabel(occurrenceCount(items))}</span></summary><div class="author-finding-body">${items.map(issue => {
        const evidence = issue.authorEvidence || {};
        const details = evidence.details || [];
        const targets = details.map(targetHtml).join('');
        const fallback=targets?'':`<div class="author-check-facts"><strong>${text(evidence.location||issue.section||'Location not supplied')}</strong><span>${occurrenceLabel(occurrenceCount([issue]))}</span>${button(evidence.locationUrl,evidence.locationAction||'Open reported page')}</div>${!evidence.location?'<p class="author-evidence-note">Exact lab or source line not supplied.</p>':''}`;
        const guidance=[field('What failed',evidence.problem||issue.message),field('How to reproduce',evidence.reproduction),field('Suggested action',evidence.action)].join('');
        return `<section class="author-check">${targets||fallback}${guidance?`<details class="author-check-guidance"><summary>Guidance</summary><dl class="author-instructions">${guidance}</dl></details>`:''}<details class="author-check-metadata"><summary>QA check details</summary><dl>${field('QA check source', `${issue.file || 'Not supplied'}${issue.line ? ':' + issue.line : ''}`)}${field('Reported occurrences', issue.count)}${field('Evidence status', issue.evidenceStatus)}</dl></details></section>`;
      }).join('')}</div></details>`;
    }).join('');
    return `<section class="search-detail-panel search-detail-panel-wide qa-report-overlay" data-qa-report-overlay><div class="author-report-heading"><h3>Errors to review</h3><p class="author-report-date">Report: ${reportDate(overlay.startedAt)}${overlay.itemStatus?` · ${text(overlay.itemStatus)}`:''}</p></div><dl class="author-signals">${signals}</dl>${cards || `<p class="note">${Number(overlay.findingRows || 0) > 0 || Object.values(overlay.priorityCounts || {}).some(value => Number(value) > 0) ? 'The report has finding counts but no detailed entries.' : 'No findings were reported for this item.'}</p>`}<details class="search-disclosure author-run"><summary>Report details</summary><dl><div><dt>Report date</dt><dd>${reportDate(overlay.startedAt)}</dd></div>${field('Run', overlay.runId)}${field('Checks reported', checkSummary)}${field('Finding entries', findings.length)}${field('Reported occurrences', overlay.findingOccurrences)}</dl></details></section>`;
  }
  window.LiveLabsAuthor = {safeUrl, text, liveButton, evidenceHtml, qaValidity, scoreHtml};
})();

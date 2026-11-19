(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const clean = value => String(value ?? '').trim();
  const fold = value => clean(value).toLocaleLowerCase();
  const displayDate = value => clean(value).match(/^(\d{4}-\d{2}-\d{2})(?:T|\s|$)/)?.[1] || clean(value) || 'N/A';
  const isMissing = value => ['', 'n/a', 'na', 'not reported', 'none', 'null', '—', '-'].includes(fold(value));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const collator = new Intl.Collator(undefined, {numeric:true, sensitivity:'base'});
  const pairsFor = record => [...(Array.isArray(record.values) ? record.values : []), ...(Array.isArray(record.details) ? record.details : [])]
    .filter(pair => Array.isArray(pair) && pair.length >= 2).map(([label, value]) => [clean(label), clean(value)]);
  const field = (record, labels) => {
    const wanted = new Set(labels.map(fold));
    const pairs = pairsFor(record);
    for (let index = pairs.length - 1; index >= 0; index--) {
      if (wanted.has(fold(pairs[index][0])) && !isMissing(pairs[index][1])) return pairs[index][1];
    }
    return '';
  };
  const aliases = {
    author:['Owner Email','Workshop Owner Email','Author Email'],
    supportContact:['Support Contact Email','Support Email'],
    techContact:['Tech Contact Email','Technical Contact Email'],
    ownerGroup:['Owner Group','Workshop Owner Group'],
    wmsUpdate:['WMS Last Update','Last Updated','Last Update'],
    githubUpdate:['Latest GitHub Update','Last Meaningful Workshop Update'],
    repository:['GitHub Repository'],
    repositoryStatus:['Repository Mapping Status']
  };
  const info = record => {
    const supportContact = field(record,aliases.supportContact), techContact = field(record,aliases.techContact);
    return {
      author:field(record,aliases.author), supportContact, techContact,
      hasAdditionalContact:Boolean(supportContact || techContact),
      ownerGroup:field(record,aliases.ownerGroup), wmsUpdate:field(record,aliases.wmsUpdate),
      githubUpdate:field(record,aliases.githubUpdate), repository:field(record,aliases.repository),
      repositoryStatus:field(record,aliases.repositoryStatus)
    };
  };
  const filterIds = ['gap-type','gap-category','gap-publish-type','gap-publish-status','gap-workflow','gap-owner-group','gap-repository'];
  const statusLabel = value => clean(value) || 'N/A';
  const recordInfo = new WeakMap(), searchIndex = new WeakMap();
  let records = [], filtered = [], page = 1, pageSize = 10, sortKey = 'title', sortDirection = 'asc';
  const options = (id, values, initial) => {
    const select = byId(id), current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(initial)}</option>` + [...new Set(values.map(clean).filter(Boolean))].sort(collator.compare).map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    select.value = current;
  };
  function matches(record) {
    const data = recordInfo.get(record), authorStatus = byId('author-status').value, contactStatus = byId('additional-contact-status').value;
    if (authorStatus === 'missing' && data.author || authorStatus === 'present' && !data.author) return false;
    if (contactStatus === 'missing' && data.hasAdditionalContact || contactStatus === 'present' && !data.hasAdditionalContact) return false;
    const search = fold(byId('gap-search').value);
    if (search && !searchIndex.get(record).includes(search)) return false;
    const selected = id => byId(id).value;
    return (!selected('gap-type') || record.type === selected('gap-type'))
      && (!selected('gap-category') || record.category === selected('gap-category'))
      && (!selected('gap-publish-type') || record.publishType === selected('gap-publish-type'))
      && (!selected('gap-publish-status') || record.publishStatus === selected('gap-publish-status'))
      && (!selected('gap-workflow') || record.status === selected('gap-workflow'))
      && (!selected('gap-owner-group') || data.ownerGroup === selected('gap-owner-group'))
      && (!selected('gap-repository') || (data.repositoryStatus || (data.repository ? 'Mapped' : 'Unmapped')) === selected('gap-repository'));
  }
  function valueFor(record, key) {
    const data = recordInfo.get(record);
    if (key === 'coverage') return `${data.author ? 'author present' : 'author missing'} ${data.hasAdditionalContact ? 'contact available' : 'contact missing'}`;
    if (key === 'livelabsId' || key === 'wmsId' || key === 'title' || key === 'type' || key === 'category' || key === 'publishType' || key === 'publishStatus') return record[key];
    if (key === 'additionalContact') return [data.supportContact,data.techContact].filter(Boolean).join(' ');
    return data[key];
  }
  function render() {
    filtered = records.filter(matches);
    filtered.sort((a,b) => {
      const result = collator.compare(clean(valueFor(a,sortKey)),clean(valueFor(b,sortKey)));
      return (sortDirection === 'desc' ? -1 : 1) * (result || collator.compare(clean(a.livelabsId || a.wmsId || a.title),clean(b.livelabsId || b.wmsId || b.title)));
    });
    const count = filtered.length, pages = Math.max(1,Math.ceil(count/pageSize));
    page = Math.min(Math.max(1,page),pages);
    const first = count ? (page-1)*pageSize : 0, visible = filtered.slice(first,first+pageSize);
    const rangeText = count ? `${(first+1).toLocaleString()}–${Math.min(first+pageSize,count).toLocaleString()} of ${count.toLocaleString()} records` : 'No matching records';
    byId('author-contributor-count').textContent = `${count.toLocaleString()} ${count === 1 ? 'record' : 'records'}`;
    byId('author-contributor-page-status').textContent = rangeText;
    byId('author-contributor-page-label').textContent = `Page ${page} of ${pages}`;
    byId('author-contributor-page-size').value = String(pageSize);
    document.querySelectorAll('[data-author-contributor-page="previous"]').forEach(button => button.disabled = page <= 1);
    document.querySelectorAll('[data-author-contributor-page="next"]').forEach(button => button.disabled = page >= pages);
    byId('author-contributor-table').querySelectorAll('[data-coverage-sort]').forEach(button => {
      const header = button.closest('th');
      header?.setAttribute('aria-sort', button.dataset.coverageSort === sortKey ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
    });
    const labels = ['#','LiveLabs ID','WMS ID','Title','Coverage','Main author email','Additional contact emails','Type','Category / council','WMS update'];
    byId('author-contributor-rows').innerHTML = visible.length ? visible.map((record,index) => {
      const data = recordInfo.get(record), detailHref = record.livelabsId ? `/search/?livelabs_id=${encodeURIComponent(record.livelabsId)}` : '';
      const title = detailHref ? `<a href="${escapeHtml(detailHref)}">${escapeHtml(record.title || 'Untitled record')}</a>` : escapeHtml(record.title || 'Untitled record');
      const coverage = `<span class="coverage-tag ${data.author ? 'is-present' : 'is-missing'}">Main author ${data.author ? 'present' : 'missing'}</span><span class="coverage-tag ${data.hasAdditionalContact ? 'is-present' : 'is-missing'}">Additional contact ${data.hasAdditionalContact ? 'available' : 'missing'}</span>`;
      const additional = [data.supportContact && `<span><b>Support</b> ${escapeHtml(data.supportContact)}</span>`,data.techContact && `<span><b>Technical</b> ${escapeHtml(data.techContact)}</span>`].filter(Boolean).join('') || '<span>N/A</span>';
      const cells = [first+index+1,statusLabel(record.livelabsId),statusLabel(record.wmsId),title,coverage,statusLabel(data.author),additional,statusLabel(record.type),statusLabel(record.category),displayDate(data.wmsUpdate)];
      return `<tr>${cells.map((value,cellIndex) => `<td data-column-label="${escapeHtml(labels[cellIndex])}">${cellIndex === 3 ? value : cellIndex === 4 || cellIndex === 6 ? value : escapeHtml(value)}</td>`).join('')}</tr>`;
    }).join('') : '<tr><td colspan="10" class="empty">No records match the selected filters.</td></tr>';
  }
  function exportRows(format) {
    const headers = ['LiveLabs ID','WMS ID','Title','Coverage','Main author email','Additional contact emails','Type','Category / council','WMS update'];
    const rows = [headers,...filtered.map(record => {
      const data = recordInfo.get(record);
      const coverage = `Main author ${data.author ? 'present' : 'missing'}; additional contact ${data.hasAdditionalContact ? 'available' : 'missing'}`;
      const additional = [data.supportContact && `Support: ${data.supportContact}`,data.techContact && `Technical: ${data.techContact}`].filter(Boolean).join(' · ') || 'N/A';
      return [statusLabel(record.livelabsId),statusLabel(record.wmsId),statusLabel(record.title),coverage,statusLabel(data.author),additional,statusLabel(record.type),statusLabel(record.category),statusLabel(data.wmsUpdate)];
    })];
    const filename = `missing-contact-${filtered.length}-rows`;
    if (format === 'csv') window.LiveLabsExport.csv(rows,filename+'.csv');
    else if (format === 'xlsx') window.LiveLabsExport.xlsx(rows,filename+'.xlsx');
    else window.LiveLabsExport.json(filtered.map(record => ({...record,authorContributorCoverage:recordInfo.get(record)})),filename+'.json');
    byId('author-contributor-export-status').textContent = `${filtered.length.toLocaleString()} filtered rows exported.`;
  }
  function clearFilters() {
    byId('gap-search').value = '';
    byId('author-status').value = 'missing';
    byId('additional-contact-status').value = 'any';
    filterIds.forEach(id => byId(id).value = '');
    page = 1;
    byId('author-contributor-export-status').textContent = '';
    render();
  }
  function bind() {
    ['gap-search',...filterIds,'author-status','additional-contact-status'].forEach(id => byId(id).addEventListener(id === 'gap-search' ? 'input' : 'change',() => {page=1;render();}));
    byId('author-contributor-page-size').addEventListener('change',event => {pageSize=Number(event.target.value)||10;page=1;render();});
    document.querySelectorAll('[data-author-contributor-page]').forEach(button => button.addEventListener('click',() => {page+=button.dataset.authorContributorPage==='next'?1:-1;render();}));
    byId('author-contributor-table').querySelector('thead').addEventListener('click',event => {
      const button = event.target.closest('[data-coverage-sort]');
      if (!button) return;
      const key = button.dataset.coverageSort;
      sortDirection = sortKey === key ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
      sortKey = key;
      page = 1;
      render();
    });
    document.querySelectorAll('[data-author-contributor-export]').forEach(button => button.addEventListener('click',() => {
      exportRows(button.dataset.authorContributorExport);
      const dropdown = button.closest('.table-export-dropdown');
      if (dropdown) dropdown.open = false;
    }));
    byId('author-contributor-clear').addEventListener('click',clearFilters);
  }
  async function load() {
    try {
      const response = await fetch('/api/admin/inventory',{credentials:'same-origin',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error(`Inventory request failed (${response.status}).`);
      const payload = await response.json();
      records = Array.isArray(payload.records) ? payload.records : [];
      records.forEach(record => {
        const data = info(record);
        recordInfo.set(record,data);
        searchIndex.set(record,fold([record.title,record.livelabsId,record.wmsId,record.owner,record.category,record.type,record.publishType,record.publishStatus,record.status,record.lifecycleState,record.searchable,data.author,data.supportContact,data.techContact,data.ownerGroup,data.wmsUpdate,data.githubUpdate,data.repository,data.repositoryStatus,pairsFor(record).flat().join(' ')].join(' ')));
      });
      options('gap-type',records.map(record => record.type),'All types');
      options('gap-category',records.map(record => record.category),'All categories');
      options('gap-publish-type',records.map(record => record.publishType),'All publish types');
      options('gap-publish-status',records.map(record => record.publishStatus),'All publish statuses');
      options('gap-workflow',records.map(record => record.status),'All workflow statuses');
      options('gap-owner-group',records.map(record => recordInfo.get(record).ownerGroup),'All owner groups');
      options('gap-repository',records.map(record => recordInfo.get(record).repositoryStatus || (recordInfo.get(record).repository ? 'Mapped' : 'Unmapped')),'All repository states');
      bind();
      render();
      window.LiveLabsLoading?.ready();
    } catch (error) {
      byId('author-contributor-rows').innerHTML = '<tr><td colspan="10" class="empty">Inventory could not be loaded.</td></tr>';
      window.LiveLabsLoading?.fail('The private inventory could not be loaded. Sign in again or retry the page.');
      console.error(error);
    }
  }
  void load();
})();

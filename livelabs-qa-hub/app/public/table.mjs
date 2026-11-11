export const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const viewStates = new Map()
const definitions = new Map()
const stateFor = id => {
  if (!viewStates.has(id)) viewStates.set(id, { query: '', filter: '', sort: '', direction: 1, page: 0 })
  return viewStates.get(id)
}

function selectedRows(id) {
  const { rows, columns, filterKey } = definitions.get(id)
  const state = stateFor(id)
  const query = state.query.trim().toLocaleLowerCase()
  const result = rows.filter(row => (!state.filter || String(row[filterKey]) === state.filter) && (!query || columns.some(column => String(row[column.key] ?? '').toLocaleLowerCase().includes(query))))
  if (state.sort) result.sort((a, b) => {
    const x = a[state.sort], y = b[state.sort]
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })) * state.direction
  })
  return result
}

function body(id) {
  const def = definitions.get(id), state = stateFor(id), rows = selectedRows(id)
  const size = 12, pages = Math.max(1, Math.ceil(rows.length / size))
  state.page = Math.min(state.page, pages - 1)
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(def.label)}"><table><caption class="sr-only">${esc(def.label)}</caption><thead><tr>${def.columns.map(col => `<th scope="col" aria-sort="${state.sort === col.key ? state.direction === 1 ? 'ascending' : 'descending' : 'none'}"><button type="button" data-sort="${esc(col.key)}">${esc(col.label)} <span aria-hidden="true">${state.sort === col.key ? state.direction === 1 ? '↑' : '↓' : '↕'}</span></button></th>`).join('')}</tr></thead><tbody>${rows.slice(state.page * size, (state.page + 1) * size).map(row => `<tr>${def.columns.map(col => `<td${col.numeric ? ' class="numeric"' : ''}>${col.render ? col.render(row) : esc(row[col.key] ?? '—')}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${def.columns.length}"><div class="empty-row">${esc(def.rows.length ? 'No matching records. Clear the filters to see all results.' : def.empty || 'No records available.')}</div></td></tr>`}</tbody></table></div><div class="table-footer"><span role="status">${rows.length ? state.page * size + 1 : 0}–${Math.min((state.page + 1) * size, rows.length)} of ${rows.length}${rows.length !== def.rows.length ? ' filtered / ' + def.rows.length + ' total' : ''}</span><div class="pager"><button type="button" data-page="-1" ${state.page === 0 ? 'disabled' : ''} aria-label="Previous page">Previous</button><span>${state.page + 1} / ${pages}</span><button type="button" data-page="1" ${state.page + 1 === pages ? 'disabled' : ''} aria-label="Next page">Next</button></div></div>`
}

export function table(id, { label, rows, columns, filterKey, filterLabel = 'Status', empty, defaultSort = '', descending = false }) {
  definitions.set(id, { label, rows, columns, filterKey, empty })
  const state = stateFor(id)
  if (!state.sort && defaultSort) { state.sort = defaultSort; state.direction = descending ? -1 : 1 }
  const options = filterKey ? [...new Set(rows.map(row => String(row[filterKey] ?? '')))].filter(Boolean).sort() : []
  return `<section class="data-section" data-table="${esc(id)}"><div class="section-heading"><h2>${esc(label)}</h2><span class="record-count">${rows.length} records</span></div><div class="table-toolbar"><label class="search-field"><span class="sr-only">Search ${esc(label)}</span><span aria-hidden="true">⌕</span><input type="search" aria-label="Search ${esc(label)}" data-query placeholder="Search ${esc(label.toLowerCase())}…" value="${esc(state.query)}"></label>${filterKey ? `<label class="filter-field"><span>${esc(filterLabel)}</span><select data-filter aria-label="Filter ${esc(label)} by ${esc(filterLabel.toLowerCase())}"><option value="">All</option>${options.map(option => `<option ${option === state.filter ? 'selected' : ''} value="${esc(option)}">${esc(option)}</option>`).join('')}</select></label>` : ''}<button type="button" class="text-button" data-clear>Clear filters</button></div><div data-table-body>${body(id)}</div></section>`
}

export function bindTables(root) {
  root.querySelectorAll('[data-table]').forEach(section => {
    const id = section.dataset.table, state = stateFor(id)
    const update = () => { section.querySelector('[data-table-body]').innerHTML = body(id) }
    section.querySelector('[data-query]').addEventListener('input', event => { state.query = event.target.value; state.page = 0; update() })
    section.querySelector('[data-filter]')?.addEventListener('change', event => { state.filter = event.target.value; state.page = 0; update() })
    section.addEventListener('click', event => {
      const sort = event.target.closest('[data-sort]')
      const page = event.target.closest('[data-page]')
      if (sort) { state.direction = state.sort === sort.dataset.sort ? -state.direction : 1; state.sort = sort.dataset.sort; state.page = 0; update(); section.querySelector('[data-sort="' + state.sort + '"]')?.focus() }
      if (page) { state.page += Number(page.dataset.page); update(); (section.querySelector('[data-page="' + page.dataset.page + '"]:not(:disabled)') || section.querySelector('[data-page]:not(:disabled)'))?.focus() }
      if (event.target.closest('[data-clear]')) { state.query = ''; state.filter = ''; state.page = 0; section.querySelector('[data-query]').value = ''; const filter = section.querySelector('[data-filter]'); if (filter) filter.value = ''; update() }
    })
  })
}

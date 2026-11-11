export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  roadmap: '<path d="M5 3v18M10 5h10v4H10zM7 11h9v4H7zM12 17h8v3h-8z"/>',
  tests: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9ZM9 12l2 2 4-4M9 18h6"/>',
  bugs: '<rect x="7" y="7" width="10" height="14" rx="5"/><path d="m8 7-2-3m10 3 2-3M3 11h4m10 0h4M2 16h5m10 0h5M5 22l3-3m8 0 3 3M12 10v11"/>',
  plans: '<path d="M4 5h16v16H4ZM8 3v4M16 3v4M4 11h16M8 15h3M8 18h6"/>',
  requirements: '<path d="M5 3h10l4 4v14H5ZM15 3v5h4M9 12h6M9 16h6"/>',
  runs: '<path d="m8 4 12 8-12 8Z"/><path d="M3 4v16"/>',
  'on-call': '<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7ZM20 13h2v7h-5v-7Z"/>',
  'par-links': '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/>',
  repositories: '<circle cx="6" cy="4" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12M18 7v3c0 4-12 3-12 6"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m6 12 4 4 8-8"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external: '<path d="M14 3h7v7m0-7-11 11M10 3H3v18h18v-7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  refresh: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
  filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  flag: '<path d="M5 21V3m0 1c4-4 9 4 14 0v9c-5 4-10-4-14 0"/>'
}
export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.tests}</svg>`
export const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'
export const stale = value => !Number.isFinite(Date.parse(value)) || Date.now() - Date.parse(value) > 86400000
export const opt = (items, value) => items.map(item => `<option value="${esc(item.id)}"${item.id === value ? ' selected' : ''}>${esc(item.name)}</option>`).join('')
export const pill = (label, tone = 'neutral') => `<span class="area-tag ${tone}">${esc(label)}</span>`
export function outcome(result) {
  if (!result) return pill('No recorded result')
  const label = result.status === 'timedOut' ? 'Timed out' : result.status[0].toUpperCase() + result.status.slice(1)
  return pill(label, result.status === 'passed' ? 'green' : result.status === 'skipped' ? 'neutral' : 'sienna')
}
export const empty = (title, text, button = '') => `<div class="empty-state">${icon('tests')}<h2>${esc(title)}</h2><p>${esc(text)}</p>${button}</div>`

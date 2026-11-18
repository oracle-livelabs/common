/* Analytics adapter for the pinned QA renderer; no Jenkins execution is configured. */
(() => {
  const key = typeof REVIEW_STORAGE_KEY !== 'undefined' ? REVIEW_STORAGE_KEY : 'livelabs-analytics-admin-qa-review:v1';
  let csrf = '', ready = false, queue = Promise.resolve(), failure;
  const pending = new Map();
  const notice = document.createElement('p'); notice.setAttribute('role', 'status'); notice.className = 'analytics-archive-notice';
  document.querySelector('main')?.prepend(notice);
  const controls = () => document.querySelectorAll('[data-review-action],[data-clear-list],[data-remove-id]');
  const lock = value => controls().forEach(button => {button.disabled = value;});
  const run = document.querySelector('[data-run-list]');
  if (run) {run.disabled = true; run.title = 'A live Jenkins connection has not been configured.';}
  const copy = document.querySelector('[data-copy-payload]'); if (copy) copy.hidden = false;
  const note = document.querySelector('#retest-queue-note');
  if (note) note.textContent = 'Selections are saved in Analytics Admin. Copy or download the payload to run through the QA scripts. Live Jenkins execution is not connected.';
  const download = document.createElement('button'); download.type = 'button'; download.className = 'button'; download.textContent = 'Download payload';
  if (copy) {copy.after(download); download.addEventListener('click', () => {
    if (typeof buildPayload !== 'function') return;
    const payload = buildPayload();
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2) + '\n'], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'retest-list-' + (payload.sourceExecutionId || 'selected') + '.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });}
  async function request(payload) {
    const response = await fetch('/api/admin/jenkins/list', payload === undefined ? {cache:'no-store'} : {method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(payload)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Review list unavailable.');
    return result;
  }
  function apply(state) {
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new StorageEvent('storage', {key}));
    if (typeof updateReviewCounts === 'function') updateReviewCounts();
  }
  window.qaHub = {
    sync(previous, next) {
      if (!ready) return;
      const operations = [];
      for (const id of new Set([...Object.keys(previous.retest || {}), ...Object.keys(next.retest || {})])) {
        if (JSON.stringify(previous.retest?.[id]) === JSON.stringify(next.retest?.[id])) continue;
        operations.push(next.retest?.[id] ? {id,entry:next.retest[id]} : {id,remove:true});
      }
      if (!operations.length) return;
      for (const operation of operations) pending.set(operation.id, operation);
      queue = queue.then(async () => {
        const batch = Array.from(pending.values());
        if (!batch.length) return;
        await request({operations: batch});
        for (const operation of batch) {
          if (pending.get(operation.id) === operation) pending.delete(operation.id);
        }
        failure = undefined; notice.textContent = 'Retest List saved.';
      }).catch(error => {failure = error;notice.textContent = 'List not saved: ' + error.message + ' Your pending changes will be retried with the next edit.';});
    },
    async flush() {await queue;if(failure)throw failure;if(!ready)throw new Error('Review list unavailable.');},
    async start() {throw new Error('Live Jenkins execution is not connected. Download the selected checks instead.');}
  };
  lock(true);
  fetch('/api/admin/session', {cache:'no-store'}).then(async response => {
    if (!response.ok) throw new Error('Sign in to Analytics Admin to use the Retest List.');
    csrf = (await response.json()).csrf; apply(await request());ready = true;lock(false);
  }).catch(error => {notice.textContent = error.message;});
  // The renderer's PAR resolver requires the live QA service; preserve source links and explain this limitation.
  document.querySelectorAll('[data-unified-par-copy],[data-unified-par-toggle]').forEach(button => {button.disabled = true;button.title = 'Protected-resource resolution requires the live QA service.';});
})();

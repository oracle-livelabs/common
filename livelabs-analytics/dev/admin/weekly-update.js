(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const select = byId('weekly-run-select');
  const stepRoot = byId('weekly-steps');
  const startButton = byId('weekly-start-run');
  const saveButton = byId('weekly-save');
  const statusNode = byId('weekly-run-status');
  const saveStatus = byId('weekly-save-status');
  const summary = byId('weekly-progress-summary');
  const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DEFERRED'];
  const statusLabels = {NOT_STARTED:'Not started', IN_PROGRESS:'In progress', BLOCKED:'Blocked', DEFERRED:'Deferred'};
  let definitions = [];
  let runs = [];
  let currentRun = null;
  let csrf = '';
  let dirty = false;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const prettyStatus = value => String(value || 'IN_PROGRESS').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  const markDirty = () => { dirty = true; saveButton.disabled = !currentRun; saveStatus.textContent = 'Unsaved changes'; };
  const statusOptions = value => statuses.map(status => `<option value="${status}"${value === status ? ' selected' : ''}>${statusLabels[status]}</option>`).join('');

  function stepsFromForm() {
    return definitions.map(step => {
      const row = stepRoot.querySelector(`[data-workflow-step="${step.key}"]`);
      const complete = row.querySelector('[data-step-complete]').checked;
      return {key:step.key, status:complete ? 'COMPLETE' : row.querySelector('[data-step-status]').value,
        evidence:row.querySelector('[data-step-evidence]').value.trim()};
    });
  }

  function updateProgress() {
    if (!currentRun) { summary.hidden = true; return; }
    const steps = stepsFromForm();
    const complete = steps.filter(step => step.status === 'COMPLETE').length;
    const blocked = steps.some(step => step.status === 'BLOCKED');
    const state = blocked ? 'Blocked' : complete === steps.length ? 'Ready for review' : 'In progress';
    byId('weekly-run-state').textContent = state;
    byId('weekly-run-date').textContent = `Week of ${currentRun.weekStart} · updated ${currentRun.updatedAt || currentRun.startedAt}`;
    byId('weekly-progress').value = Math.round(complete / Math.max(steps.length, 1) * 100);
    byId('weekly-progress-label').textContent = `${complete} of ${steps.length} steps complete`;
    summary.hidden = false;
  }

  function renderRun(run) {
    currentRun = run;
    dirty = false;
    saveStatus.textContent = '';
    if (!run) {
      summary.hidden = true;
      saveButton.disabled = true;
      stepRoot.innerHTML = '<div class="empty-state">Start this week’s update to create a dated checklist.</div>';
      statusNode.textContent = 'No weekly update run is selected.';
      return;
    }
    const byKey = new Map((run.steps || []).map(step => [step.key, step]));
    const groups = new Map();
    definitions.forEach(step => {
      if (!groups.has(step.group)) groups.set(step.group, []);
      groups.get(step.group).push(step);
    });
    stepRoot.innerHTML = [...groups.entries()].map(([group, steps]) => `<section class="weekly-stage"><h3>${escapeHtml(group)}</h3>${steps.map(step => {
      const saved = byKey.get(step.key) || {status:'NOT_STARTED', evidence:''};
      const complete = saved.status === 'COMPLETE';
      const selectValue = statuses.includes(saved.status) ? saved.status : 'NOT_STARTED';
      return `<article class="weekly-step" data-workflow-step="${escapeHtml(step.key)}">
        <div class="weekly-step-main"><input type="checkbox" data-step-complete aria-label="Mark ${escapeHtml(step.title)} complete"${complete ? ' checked' : ''}><div><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.description)}</small></div></div>
        <label class="weekly-step-status-label">Status<select class="weekly-step-status" data-step-status${complete ? ' disabled' : ''}>${statusOptions(selectValue)}</select></label>
        <label class="weekly-step-evidence-label">Evidence or source reference<input class="weekly-step-evidence" data-step-evidence maxlength="2000" value="${escapeHtml(saved.evidence || '')}" placeholder="Path, source date, hash, run ID, test result or artifact"></label>
      </article>`;
    }).join('')}</section>`).join('');
    stepRoot.querySelectorAll('[data-step-complete]').forEach(input => input.addEventListener('change', () => {
      const row = input.closest('[data-workflow-step]');
      const status = row.querySelector('[data-step-status]');
      status.disabled = input.checked;
      if (!input.checked && status.value === 'NOT_STARTED' && row.querySelector('[data-step-evidence]').value.trim()) status.value = 'IN_PROGRESS';
      markDirty(); updateProgress();
    }));
    stepRoot.querySelectorAll('[data-step-status], [data-step-evidence]').forEach(input => input.addEventListener('input', () => { markDirty(); updateProgress(); }));
    stepRoot.querySelectorAll('[data-step-status]').forEach(input => input.addEventListener('change', () => { markDirty(); updateProgress(); }));
    saveButton.disabled = false;
    statusNode.textContent = `${run.status === 'READY_FOR_REVIEW' ? 'Ready for review' : prettyStatus(run.status)} · ${run.runId}`;
    updateProgress();
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {credentials:'same-origin', cache:'no-store', ...options,
      headers:{'Content-Type':'application/json', ...(options.headers || {})}});
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { location.replace('/admin'); throw new Error('Sign in again to continue.'); }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  async function loadRuns(selectedId = '') {
    const payload = await requestJson('/api/admin/weekly-runs');
    definitions = Array.isArray(payload.steps) ? payload.steps : [];
    runs = Array.isArray(payload.runs) ? payload.runs : [];
    select.innerHTML = runs.map(run => `<option value="${escapeHtml(run.runId)}">${escapeHtml(run.weekStart)} · ${escapeHtml(prettyStatus(run.status))} · ${escapeHtml(run.runId)}</option>`).join('') || '<option value="">No saved runs</option>';
    select.disabled = runs.length === 0;
    const selected = runs.find(run => run.runId === selectedId) || runs.find(run => run.status !== 'READY_FOR_REVIEW') || runs[0] || null;
    if (selected) select.value = selected.runId;
    renderRun(selected);
  }

  select.addEventListener('change', () => {
    if (dirty && !window.confirm('Discard unsaved checklist changes?')) { select.value = currentRun?.runId || ''; return; }
    renderRun(runs.find(run => run.runId === select.value) || null);
  });
  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    statusNode.textContent = 'Starting or resuming this week’s run…';
    try {
      const data = await requestJson('/api/admin/weekly-runs', {method:'POST', headers:{'X-CSRF-Token':csrf}, body:JSON.stringify({action:'start'})});
      await loadRuns(data.run.runId);
      statusNode.textContent = `${data.resumed ? 'Resumed' : 'Started'} ${data.run.runId}`;
    } catch (error) { statusNode.textContent = error.message; }
    finally { startButton.disabled = false; }
  });
  saveButton.addEventListener('click', async () => {
    if (!currentRun) return;
    saveButton.disabled = true;
    saveStatus.textContent = 'Saving…';
    try {
      const data = await requestJson('/api/admin/weekly-runs', {method:'POST', headers:{'X-CSRF-Token':csrf},
        body:JSON.stringify({action:'save', runId:currentRun.runId, steps:stepsFromForm()})});
      await loadRuns(data.run.runId);
      dirty = false;
      saveStatus.textContent = 'Saved';
    } catch (error) { saveStatus.textContent = error.message; saveButton.disabled = false; }
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  requestJson('/api/admin/session').then(session => {
    csrf = session.csrf || '';
    return loadRuns();
  }).catch(error => { stepRoot.textContent = error.message; statusNode.textContent = error.message; startButton.disabled = true; });
})();

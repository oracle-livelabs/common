(() => {
  const select = document.querySelector('#report-version');
  const status = document.querySelector('#report-status');
  let reports = [];
  function show() {
    const report = reports.find(item => item.id === select.value);
    if (!report) return;
    const url = `/admin/jenkins/report/${report.id}/summary.html`;
    const link = document.querySelector('#open-report'); link.href = url; link.hidden = false;
    status.textContent = `${report.items.toLocaleString()} catalog entries · ${(report.counts.total || 0).toLocaleString()} checks · Saved run; no new checks executed.`;
    document.querySelector('#report-provenance').textContent = `${report.sourceFile} · Run ${report.runId} · Renderer ${report.renderer} · Source SHA-256 ${report.sourceSha256}. ${(report.groupedIdentities || []).length} entries group multiple LiveLabs IDs.`;
    history.replaceState(null, '', `/admin/jenkins/history?report=${report.id}`);
  }
  select.addEventListener('change', show);
  fetch('/api/admin/jenkins/reports', {cache: 'no-store'}).then(async response => {
    if (response.status === 401) { location.replace('/admin?next=/admin/jenkins'); return; }
    if (!response.ok) throw new Error('Saved reports could not be loaded.');
    reports = (await response.json()).reports;
    select.replaceChildren(...reports.map(report => new Option(`${report.startedAt.slice(0, 10)} · ${report.runType} · ${report.items} entries`, report.id)));
    if (!reports.length) { status.textContent = 'No saved reports are available. Build a report archive from a saved Jenkins JSON export.'; return; }
    select.disabled = false;
    const requested = new URLSearchParams(location.search).get('report');
    if (reports.some(report => report.id === requested)) select.value = requested;
    show();
  }).catch(error => {status.textContent = error.message;});
})();

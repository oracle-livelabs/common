const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const badge = (value, tone = 'warn') => `<span class="status-badge ${tone}">${esc(value)}</span>`
const details = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`

export function renderSyntheticReportHtml(markdown, { runId, sha256 }) {
  if (!/^synthetic-[a-f0-9]{20}$/.test(runId) || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Synthetic report identity/hash is invalid.')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Synthetic On-Call Report</title><style>body{font:16px/1.55 Arial,sans-serif;max-width:1100px;margin:40px auto;padding:0 24px;color:#242424}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f5f2;padding:24px;border:1px solid #dedbd4}code{overflow-wrap:anywhere}h1{font-size:28px}</style></head><body><h1>SYNTHETIC ONLY — On-Call Report</h1><p>This local HTML preview contains invented fixtures. It is not a protected live report, an approved support response or proof of scheduled source monitoring.</p><p>Run: <code>${esc(runId)}</code><br>Canonical artifact: <code>report.md</code><br>Completion manifest: <code>run-manifest.json</code><br>Canonical Markdown SHA-256: <code>${esc(sha256)}</code></p><p>The escaped Markdown below is the exact sealed source. This HTML wrapper is a separate local viewing aid.</p><article aria-label="Canonical synthetic report"><pre>${esc(markdown)}</pre></article></body></html>\n`
}

export function renderOnCallReview(snapshot, { selectedCaseId = '', reviewPreview = '', reviewError = '', loading = false } = {}) {
  const synthetic = snapshot.mode === 'synthetic'
  const available = snapshot.availability === 'AVAILABLE'
  const selected = snapshot.cases.find((item) => item.caseId === selectedCaseId) || snapshot.cases[0]
  const drafts = selected ? snapshot.drafts.filter((draft) => draft.caseId === selected.caseId).sort((a, b) => b.version - a.version) : []
  return `
    <section class="page-intro" data-on-call-mode="${esc(snapshot.mode)}">
      <p class="eyebrow">On-Call Review</p>
      <h3>Inbox, answer drafts and private report readiness.</h3>
      <p>${synthetic ? 'SYNTHETIC ONLY: fictional cases and drafts for local review. No email or Slack content was collected.' : available ? 'Private backend response. The server must enforce reviewer authorization and retention; this browser does not independently verify those controls.' : 'Private on-call review is unavailable. No live cases or drafts are displayed.'}</p>
      <div class="card-actions">
        <button class="small-button" type="button" data-on-call-load="synthetic">Load synthetic preview</button>
        <button class="small-button" type="button" data-on-call-load="live">Check private backend</button>
        <button class="small-button" type="button" data-on-call-load="none">Clear review data</button>
      </div>
      ${loading ? '<p role="status">Checking review source…</p>' : ''}
      ${!available ? `<p class="form-message" role="status">UNAVAILABLE: ${esc(snapshot.reason)}</p>` : ''}
      <p>Support data stays in memory. This page does not send responses, create mailbox drafts, change source messages or publish reports.</p>
    </section>
    <section class="content-band" aria-label="Private readiness">
      <h3>Private readiness ${badge(snapshot.readiness.liveStatus, snapshot.readiness.liveStatus === 'READY' ? 'good' : 'risk')}</h3>
      <p>Cadence: daily 09:00 Europe/Bucharest. The demo login grants no production source permissions.</p>
      ${details(snapshot.readiness.blockers)}
      ${snapshot.readiness.sourceReadiness.map((source) => `<p><strong>${esc(source.sourceId)}</strong></p>${details(source.blockers)}`).join('')}
    </section>
    ${available ? `
      <section class="operations-summary" aria-label="On-call review summary">
        <article class="ops-metric"><span>Cases</span><strong>${snapshot.cases.length}</strong><small>${synthetic ? 'Synthetic' : 'Private response'} scope</small></article>
        <article class="ops-metric"><span>Current drafts needing review</span><strong>${snapshot.drafts.filter((draft) => draft.needsReview).length}</strong><small>Exact reviewed metadata, superseded and incomplete versions excluded</small></article>
        <article class="ops-metric warn"><span>Source limitations</span><strong>${snapshot.sources.filter((source) => source.state !== 'COMPLETE' || source.warnings.length || source.errors.length || source.limitations.length).length}</strong><small>Bounded reads do not establish complete history</small></article>
      </section>
      <section class="content-band" aria-label="Source health">
        <h3>Source health and collection coverage</h3>
        <p>Source collection, support resolution, reported recovery and learner verification are independent.</p>
        <div class="table-wrap"><table><thead><tr><th>Source</th><th>Read state / coverage</th><th>Observed window</th><th>Warnings and errors</th></tr></thead><tbody>
          ${snapshot.sources.map((source) => `<tr><td><strong>${esc(source.sourceId)}</strong></td><td>${badge(source.state, source.state === 'COMPLETE' ? 'warn' : 'risk')}<small>${esc(source.coverageStatus)}</small><small>${source.noChangesObservedWithinCompletedRead ? 'No changes observed within this completed read' : 'No no-change conclusion'}</small></td><td><small>From ${esc(source.windowStart || 'Unknown')}</small><small>Observed ${esc(source.collectionObservedAt || 'Unknown')}</small><small>Last complete read ${esc(source.lastCompleteObservationAt || 'None')}</small></td><td>${details([...source.warnings, ...source.errors, ...source.limitations]) || ''}${source.warnings.length + source.errors.length + source.limitations.length === 0 ? 'No reported limitations; historical completeness remains unverified.' : ''}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <section class="dual-grid">
        <article class="content-band" aria-label="On-call inbox">
          <h3>On-Call Inbox</h3>
          <div class="focus-list">${snapshot.cases.map((item) => `<button class="focus-item action-link" type="button" data-on-call-case="${esc(item.caseId)}" aria-pressed="${item.caseId === selected?.caseId}"><strong>${esc(item.priority)} · ${esc(item.topic)}</strong><br><span>${esc(item.summary)}</span><small>${esc(item.sourceId)} · ${esc(item.caseId)} · Context ${item.contextComplete ? 'complete for this case' : 'INCOMPLETE'}</small></button>`).join('') || '<p>No cases in this response. Consult source health before concluding no work exists.</p>'}</div>
        </article>
        <article class="content-band" aria-label="Draft review">
          <h3>Draft Review</h3>
          ${selected ? `<p><strong>${esc(selected.caseId)}</strong> · ${esc(selected.state)}</p><p>${esc(selected.nextHumanAction)}</p><dl class="detail-list"><div><dt>Source revision</dt><dd>${esc(selected.sourceRevision)}</dd></div><div><dt>Source resolution</dt><dd>${esc(selected.sourceResolution)}</dd></div><div><dt>Reported recovery</dt><dd>${selected.reportedRecovery ? 'Reported; verification pending' : 'Not reported'}</dd></div><div><dt>Owner confirmed</dt><dd>${selected.ownerConfirmedResolved ? 'Yes' : 'No'}</dd></div><div><dt>Learner verification</dt><dd>Not verified by on-call processing</dd></div></dl>` : '<p>No case selected.</p>'}
          ${drafts.map((draft) => `<section class="on-call-draft"><h4>Version ${draft.version} ${badge(draft.status, draft.reviewable ? 'warn' : 'risk')}</h4><p><small>${esc(draft.draftId)} · ${esc(draft.kind)}</small></p><p><strong>Reported review state:</strong> ${esc(draft.reviewState)}<br><strong>Review metadata:</strong> ${esc(draft.reviewMetadataState)}</p><p>${draft.reviewMetadataState === 'EXACT_REVISION_MATCH' ? 'Supplied version and revisions match. Reviewer authority is not independently verified by this browser.' : 'No matching revision-bound review metadata is supplied.'}</p><textarea class="report-preview" readonly aria-label="Draft version ${draft.version}">${esc(draft.text)}</textarea><details><summary>Exact review basis and missing evidence</summary><dl class="detail-list"><div><dt>Source revision</dt><dd>${esc(draft.sourceRevision)}</dd></div><div><dt>Knowledge revision</dt><dd>${esc(draft.knowledgeRevision || 'Unbound')}</dd></div><div><dt>Context revision</dt><dd>${esc(draft.contextRevision || 'Unbound')}</dd></div><div><dt>Basis revision</dt><dd>${esc(draft.basisRevision || 'Unbound')}</dd></div><div><dt>Supersedes</dt><dd>${esc(draft.previousDraftId || 'None')}</dd></div><div><dt>Superseded by</dt><dd>${esc(draft.supersededBy || 'None')}</dd></div></dl>${details(draft.missingEvidence)}</details>${draft.reviewable ? `<form class="stacked-form" data-on-call-review="${esc(draft.draftId)}"><label>Reviewer reference<input name="reviewer" required maxlength="80" pattern="[a-zA-Z0-9_-]{1,80}" autocomplete="off" placeholder="Opaque reviewer token"></label><button class="small-button" type="submit">Preview review metadata</button></form>` : '<p>Review preview is unavailable for this version; inspect context and reported review metadata.</p>'}</section>`).join('') || '<p>No draft for this case.</p>'}
          <p>Preview metadata binds the exact version and revisions. It grants no approval and saves no decision.</p>
          ${reviewError ? `<p class="form-message" role="alert">${esc(reviewError)}</p>` : ''}
          ${reviewPreview ? `<textarea class="report-preview" readonly aria-label="Local review preview">${esc(reviewPreview)}</textarea>` : ''}
        </article>
      </section>
      <section class="content-band" aria-label="Private reports">
        <h3>Private reports</h3>
        <p>Report completion describes this on-call response. It does not establish learner health or report publication.</p>
        ${snapshot.reports.map((report) => `<article class="on-call-report"><h4>${esc(report.reportId || 'Unbound report')}</h4><p>${badge(report.artifactLabel)} ${badge(report.status)}</p><p>Profile: ${esc(report.profile)} · Generated: ${esc(report.generatedAt || 'Unknown')}</p><p><strong>Reference:</strong> <code>${esc(report.reference || 'Protected report reference not bound')}</code></p><p><strong>SHA-256:</strong> <code>${esc(report.sha256 || 'Not supplied')}</code></p>${synthetic && report.syntheticUrl ? `<a class="link-button" href="${esc(report.syntheticUrl)}" target="_blank" rel="noreferrer">Open local synthetic report</a><p>Hash verified against the synthetic completion manifest. This is a public local fixture, not a protected live report.</p>` : report.url ? `<a class="link-button" href="${esc(report.url)}" target="_blank" rel="noreferrer">Open protected report</a>` : '<p>Private report endpoint is not bound. No report link is published.</p>'}</article>`).join('') || '<p>No report reference in this response.</p>'}
        <p>Slack publishing is deferred. Support drafts and on-call reports are not health notifications.</p>
      </section>` : ''}
  `
}

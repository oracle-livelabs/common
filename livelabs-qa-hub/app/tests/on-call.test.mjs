import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createReviewPreview, loadOnCallSnapshot, normalizeOnCallSnapshot, privateReportUrl, syntheticOnCallSnapshot, SYNTHETIC_RUN, unavailableOnCall } from '../public/on-call-review.mjs'
import { renderOnCallReview, renderSyntheticReportHtml } from '../public/on-call-view.mjs'
import { createHash } from 'node:crypto'

const origin = 'https://hub.example'
const normalize = (payload = syntheticOnCallSnapshot()) => normalizeOnCallSnapshot(payload, { expectedMode: 'synthetic', origin })
const fixtureFetch = async (url) => {
  const name = new URL(url).pathname.split('/').at(-1)
  return new Response(await readFile(new URL(`../public/synthetic/${SYNTHETIC_RUN}/${name}`, import.meta.url), 'utf8'))
}

test('no selection performs no read and returns unavailable with no support records', async () => {
  let calls = 0
  const response = await loadOnCallSnapshot({ origin, fetchImpl: async () => { calls++ } })
  assert.equal(calls, 0)
  assert.equal(response.availability, 'UNAVAILABLE')
  assert.deepEqual(response.cases, [])
})

test('sealed synthetic core output is hash verified and retains exact report/case identities', async () => {
  const result = await loadOnCallSnapshot({ mode: 'synthetic', origin, assetBase: `${origin}/common/livelabs-qa-hub/app/dist/`, fetchImpl: fixtureFetch })
  assert.equal(result.mode, 'synthetic')
  assert.equal(result.cases.length, 4)
  assert.equal(result.cases[0].caseId, 'case-b852bd0e3afae53ae5a367fe')
  assert.equal(result.reports[0].reportId, 'report-a2d60b7f91d6b5423833f44a')
  assert.match(result.reports[0].sha256, /^[a-f0-9]{64}$/)
  assert.equal(result.reports[0].syntheticUrl, `${origin}/common/livelabs-qa-hub/app/dist/synthetic/${SYNTHETIC_RUN}/report.html`)
  assert.equal(result.reports[0].url, null)
})

test('tampered synthetic content does not become a review queue', async () => {
  const result = await loadOnCallSnapshot({ mode: 'synthetic', origin, fetchImpl: async (url) => url.endsWith('report.md') ? new Response('tampered') : fixtureFetch(url) })
  assert.equal(result.availability, 'UNAVAILABLE')
  assert.match(result.reason, /hash mismatch/)
  assert.deepEqual(result.drafts, [])
})

test('live failure never falls back to synthetic cases or sends data', async () => {
  let request
  const result = await loadOnCallSnapshot({ mode: 'live', endpoint: '/api/on-call/review', origin, fetchImpl: async (url, options) => { request = { url, options }; return new Response('', { status: 403 }) } })
  assert.equal(request.options.method, 'GET')
  assert.equal(request.options.cache, 'no-store')
  assert.equal(request.options.body, undefined)
  assert.equal(result.availability, 'UNAVAILABLE')
  assert.equal(result.mode, 'none')
  assert.deepEqual(result.cases, [])
})

test('external/credential/query endpoints are rejected before fetching', async () => {
  for (const endpoint of ['https://elsewhere.example/api/on-call/review', 'https://user:secret@hub.example/api/on-call/review', '/api/on-call/review?token=unsafe', '/unrelated']) {
    let called = false
    const result = await loadOnCallSnapshot({ mode: 'live', endpoint, origin, fetchImpl: async () => { called = true } })
    assert.equal(called, false)
    assert.equal(result.availability, 'UNAVAILABLE')
  }
})

test('synthetic/live mode mixing and missing private readiness fail closed', () => {
  const fixture = syntheticOnCallSnapshot()
  assert.throws(() => normalizeOnCallSnapshot(fixture, { expectedMode: 'live', origin }), /mode/)
  fixture.mode = 'live'
  fixture.readiness.mode = 'live'
  for (const key of ['cases', 'drafts', 'reports']) fixture[key].forEach((item) => { item.mode = 'live' })
  assert.throws(() => normalizeOnCallSnapshot(fixture, { expectedMode: 'live', origin }), /blocked/)
  fixture.readiness = { mode: 'live', liveStatus: 'READY', configuredForLive: true }
  assert.throws(() => normalizeOnCallSnapshot(fixture, { expectedMode: 'live', origin }), /blocked/)
})

test('required arrays and all four explicit source states cannot be omitted or mistyped', () => {
  for (const key of ['sources', 'cases', 'drafts', 'reports']) {
    for (const value of [undefined, null, {}, 'invalid']) {
      const fixture = syntheticOnCallSnapshot()
      fixture[key] = value
      assert.throws(() => normalize(fixture), /explicit array/)
    }
  }
  const fixture = syntheticOnCallSnapshot()
  fixture.sources.pop()
  assert.throws(() => normalize(fixture), /All four/)
  const unchecked = syntheticOnCallSnapshot()
  unchecked.sources[0].state = ''
  assert.throws(() => normalize(unchecked), /explicit read state/)
  unchecked.sources[0].state = 'UNAVAILABLE'
  assert.equal(normalize(unchecked).sources[0].state, 'UNAVAILABLE')
})

test('nested case/draft/report/readiness modes and report profile must match', () => {
  for (const key of ['cases', 'drafts', 'reports']) {
    for (const mode of [undefined, 'live']) {
      const fixture = syntheticOnCallSnapshot()
      fixture[key][0].mode = mode
      assert.throws(() => normalize(fixture), /mode/)
    }
  }
  const fixture = syntheticOnCallSnapshot()
  fixture.readiness.mode = 'live'
  assert.throws(() => normalize(fixture), /mode/)
  fixture.readiness.mode = 'synthetic'
  fixture.reports[0].profile = 'health-report'
  assert.throws(() => normalize(fixture), /profile/)
})

test('live report references cannot expose URLs, credentials or contacts as text', () => {
  const liveFixture = () => {
    const fixture = syntheticOnCallSnapshot()
    fixture.mode = 'live'
    for (const key of ['cases', 'drafts', 'reports']) fixture[key].forEach((item) => { item.mode = 'live' })
    fixture.readiness = { mode: 'live', liveStatus: 'READY', configuredForLive: true, independentLiveVerificationPerformed: true, backendAuthorizationVerified: true, privateAudienceVerified: true, retentionVerified: true, redactionVerified: true }
    return fixture
  }
  for (const reference of ['https://storage.example/object?token=unsafe', 'person@example.com', 'password=unsafe', 'protected-ref:secret_unsafe', { url: 'https://source.example' }]) {
    const fixture = liveFixture()
    fixture.reports[0].reference = reference
    assert.throws(() => normalizeOnCallSnapshot(fixture, { expectedMode: 'live', origin }), /reference/)
  }
  const fixture = liveFixture()
  fixture.reports[0].reference = 'protected-ref:report_123'
  assert.equal(normalizeOnCallSnapshot(fixture, { expectedMode: 'live', origin }).reports[0].reference, 'protected-ref:report_123')
})

test('synthetic HTML report is an escaped rendering of the exact sealed Markdown and hash', async () => {
  const base = new URL(`../public/synthetic/${SYNTHETIC_RUN}/`, import.meta.url)
  const markdown = await readFile(new URL('report.md', base), 'utf8')
  const manifest = JSON.parse(await readFile(new URL('run-manifest.json', base), 'utf8'))
  const sha256 = createHash('sha256').update(markdown).digest('hex')
  assert.equal(sha256, manifest.artifacts.find((item) => item.name === 'report.md').sha256)
  const html = await readFile(new URL('report.html', base), 'utf8')
  assert.equal(html, renderSyntheticReportHtml(markdown, { runId: SYNTHETIC_RUN, sha256 }))
  assert.match(html, /SYNTHETIC ONLY/)
  assert.match(html, /default-src 'none'/)
  assert.doesNotMatch(renderSyntheticReportHtml('</pre><script>unsafe()</script>', { runId: SYNTHETIC_RUN, sha256 }), /<script>/)
})

test('bounded coverage and structured source errors stay explicit', () => {
  const fixture = syntheticOnCallSnapshot()
  fixture.sources[0].errors = [{ code: 'THREAD_CONTEXT_INCOMPLETE', operation: 'readReplies', rawBody: 'must not display' }]
  const result = normalize(fixture)
  assert.equal(result.sources[0].coverageStatus, 'COMPLETE_BOUNDED_READ')
  assert.deepEqual(result.sources[0].errors, ['THREAD_CONTEXT_INCOMPLETE / readReplies'])
  assert.equal(result.sources[2].state, 'PARTIAL')
  assert.match(renderOnCallReview(result), /Bounded reads do not establish complete history/)
})

test('superseded and incomplete drafts cannot create review metadata', () => {
  const snapshot = normalize()
  assert.equal(snapshot.drafts.at(-1).status, 'SUPERSEDED')
  assert.throws(() => createReviewPreview(snapshot, snapshot.drafts.at(-1).draftId, 'reviewer_1'), /superseded/)
  assert.equal(snapshot.drafts[2].status, 'CONTEXT_INCOMPLETE')
  assert.throws(() => createReviewPreview(snapshot, snapshot.drafts[2].draftId, 'reviewer_1'), /incomplete/)
})

test('source revision change invalidates eligibility despite a claimed approval', () => {
  const fixture = syntheticOnCallSnapshot()
  fixture.cases[0].sourceRevision = 'changed-context'
  fixture.drafts[0].reviewState = 'APPROVED_FOR_HUMAN_USE'
  const snapshot = normalize(fixture)
  assert.equal(snapshot.drafts[0].status, 'STALE_CONTEXT')
  assert.equal(snapshot.drafts[0].reviewable, false)
  assert.throws(() => createReviewPreview(snapshot, snapshot.drafts[0].draftId, 'reviewer_1'), /stale/)
})

test('exact runtime-shaped approval metadata is displayed separately and leaves pending review', () => {
  const fixture = syntheticOnCallSnapshot()
  const draft = fixture.drafts[0]
  draft.reviewState = 'APPROVED_FOR_HUMAN_USE'
  draft.review = { reviewerReference: 'reviewer_1', reviewedAt: '2026-10-02T10:00:00Z', sourceRevision: draft.sourceRevision, knowledgeRevision: draft.knowledgeRevision, version: draft.version, decision: 'APPROVE', mode: 'synthetic' }
  const snapshot = normalize(fixture)
  assert.equal(snapshot.drafts[0].status, 'NEEDS_REVIEW')
  assert.equal(snapshot.drafts[0].reviewState, 'APPROVED_FOR_HUMAN_USE')
  assert.equal(snapshot.drafts[0].reviewMetadataState, 'EXACT_REVISION_MATCH')
  assert.equal(snapshot.drafts[0].needsReview, false)
  assert.equal(snapshot.drafts[0].reviewable, false)
  assert.equal(snapshot.drafts.filter((item) => item.needsReview).length, 2)
  assert.match(renderOnCallReview(snapshot), /Reported review state/)
  assert.match(renderOnCallReview(snapshot), /APPROVED_FOR_HUMAN_USE/)
  assert.match(renderOnCallReview(snapshot), /Supplied version and revisions match/)
})

test('exact request-changes metadata leaves pending review without claiming source resolution', () => {
  const fixture = syntheticOnCallSnapshot()
  const draft = fixture.drafts[0]
  draft.reviewState = 'CHANGES_REQUESTED'
  draft.review = { reviewerReference: 'reviewer_1', reviewedAt: '2026-10-02T10:00:00Z', sourceRevision: draft.sourceRevision, knowledgeRevision: draft.knowledgeRevision, version: draft.version, decision: 'REQUEST_CHANGES', mode: 'synthetic' }
  const snapshot = normalize(fixture)
  assert.equal(snapshot.drafts[0].reviewMetadataState, 'EXACT_REVISION_MATCH')
  assert.equal(snapshot.drafts[0].needsReview, false)
  assert.equal(snapshot.cases[0].sourceResolution, 'UNCONFIRMED')
  assert.equal(snapshot.cases[0].learnerPass, null)
})

test('bare or mismatched approval state does not establish an exact review record', () => {
  const fixture = syntheticOnCallSnapshot()
  const draft = fixture.drafts[0]
  draft.reviewState = 'APPROVED_FOR_HUMAN_USE'
  assert.equal(normalize(fixture).drafts[0].needsReview, true)
  assert.match(renderOnCallReview(normalize(fixture)), /No matching revision-bound review metadata is supplied/)
  assert.doesNotMatch(renderOnCallReview(normalize(fixture)), /Supplied version and revisions match/)
  draft.review = { reviewerReference: 'reviewer_1', reviewedAt: '2026-10-02T10:00:00Z', sourceRevision: draft.sourceRevision, knowledgeRevision: 'old-knowledge', version: draft.version, decision: 'APPROVE', mode: 'synthetic' }
  assert.equal(normalize(fixture).drafts[0].reviewMetadataState, 'UNVERIFIED')
  assert.equal(normalize(fixture).drafts[0].needsReview, true)
})

test('review preview binds exact revisions, requires opaque reference and changes no authoritative state', () => {
  const snapshot = normalize()
  const before = JSON.stringify(snapshot)
  assert.throws(() => createReviewPreview(snapshot, snapshot.drafts[0].draftId, 'Person Name'), /opaque/)
  const preview = createReviewPreview(snapshot, snapshot.drafts[0].draftId, 'reviewer_1')
  assert.equal(preview.version, 2)
  assert.equal(preview.sourceRevision, snapshot.drafts[0].sourceRevision)
  assert.equal(preview.knowledgeRevision, snapshot.drafts[0].knowledgeRevision)
  assert.equal(preview.decision, 'PREVIEW_ONLY')
  assert.equal(preview.authoritativeApproval, false)
  assert.equal(preview.privatePersistencePerformed, false)
  assert.equal(preview.sourceAnswerSentOrPosted, false)
  assert.equal(JSON.stringify(snapshot), before)
})

test('reported recovery never becomes support resolution or learner PASS', () => {
  const snapshot = normalize()
  assert.equal(snapshot.cases[3].reportedRecovery, true)
  assert.equal(snapshot.cases[3].sourceResolution, 'UNCONFIRMED')
  assert.equal(snapshot.cases[3].ownerConfirmedResolved, false)
  assert.equal(snapshot.cases[3].learnerPass, null)
})

test('source-write claims and unexpected source bindings are rejected', () => {
  const fixture = syntheticOnCallSnapshot()
  fixture.drafts[0].sourceAnswerSentOrPosted = true
  assert.throws(() => normalize(fixture), /source-write/)
  const other = syntheticOnCallSnapshot()
  other.sources[0].sourceId = 'UNRELATED'
  assert.throws(() => normalize(other), /Unexpected/)
})

test('protected report URL only accepts same-origin scoped paths without credentials or tokens', () => {
  assert.equal(privateReportUrl('/api/on-call/reports/run-123/report', origin), `${origin}/api/on-call/reports/run-123/report`)
  for (const path of ['javascript:alert(1)', 'https://elsewhere.example/api/on-call/reports/x', '/api/on-call/reports/x?token=unsafe', '/api/on-call/reports/../unrelated', '/local/report.md']) assert.equal(privateReportUrl(path, origin), null)
})

test('unavailable view contains no old records and synthetic view escapes draft/source text', () => {
  const empty = renderOnCallReview(unavailableOnCall('403'))
  assert.match(empty, /UNAVAILABLE/)
  assert.doesNotMatch(empty, /data-on-call-case=/)
  const fixture = syntheticOnCallSnapshot()
  fixture.drafts[0].draftTextSanitized = '</textarea><script>unsafe()</script>'
  const view = renderOnCallReview(normalize(fixture))
  assert.match(view, /SYNTHETIC ONLY/)
  assert.match(view, /&lt;script&gt;/)
  assert.doesNotMatch(view, /<script>/)
  assert.doesNotMatch(view, /type="submit">(?:Approve|Send|Publish)/)
})

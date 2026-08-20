# Object Storage tenancy readiness

This project is prepared as a static web payload. This document is the handoff checklist for moving the `new-author-guide` folder into an approved Object Storage tenancy. It does not upload objects, change buckets, configure a CDN, or publish a new URL.

## Current state

- The redesigned guide is served from `index.html` with clean client routes: `/home`, `/quickstart`, `/cheatsheet`, and `/nodoc`.
- Local compatibility routes remain under `workshops/`.
- The NoDoc documentation is present in the page and the Quickstart route now points to the same authoring flow.
- Video cards are wired with stable IDs, transcripts, captions paths, and capture requirements.
- The only local video is the silent preview asset. The final product recordings are not present yet, so the payload is not release-ready until the manifest entries are replaced with approved MP4 and VTT pairs.

## Migration checklist

1. Confirm the target tenancy, bucket, namespace, prefix, access policy, retention policy, and owner with the release owner.
2. Decide whether the payload is private/internal or public. Do not publish internal WMS, NoDoc, SSO, support, or employee-only content to a public bucket.
3. Review `index.html`, `content/author-guide/`, and all media for restricted URLs, credentials, bypass instructions, private screenshots, personal data, and unapproved recordings.
4. Replace every `recordings-pending` entry in `assets/media/guide/video-manifest.json` with an approved recording and matching captions file.
5. Upload the complete folder structure without flattening relative paths. Preserve `index.html`, `assets/`, `content/`, `workshops/`, `404.html`, and the manifest files.
6. Configure the Object Storage website or CDN origin so `/`, `/home`, `/quickstart`, `/cheatsheet`, and `/nodoc` resolve to the static shell or its documented fallback behavior.
7. Apply long-lived caching only to versioned immutable assets. Keep `index.html` and route fallbacks short-cache or purgeable during rollout.
8. Verify positive checks for the shell, styles, scripts, images, MP4 files, VTT files, and compatibility routes.
9. Verify negative checks: no admin, backend, database, health, API, source-map, or local-development endpoint is exposed by the static origin.
10. Test desktop and mobile navigation, NoDoc search and accordion behavior, video controls, captions, transcripts, external links, and direct-route refreshes.
11. Keep the existing hosted guide available until the Object Storage origin, CDN route, and rollback path are verified by the release owner.

## Video handoff contract

Use `assets/media/guide/video-manifest.json` as the capture and upload inventory. Each item needs:

- an approved MP4 under `assets/media/guide/`;
- a matching WebVTT captions file;
- a transcript or transcript review;
- a redacted recording showing only the approved environment;
- a local HTTP 200 check for both files; and
- release-owner approval before the object is copied to the tenancy.

Until that handoff is complete, the generic MP4 remains a clearly labelled preview-only asset and must not be represented as a final walkthrough.

# Command Center cross-application project library — SCC-003

All account, organization, project, artifact, provenance and revision handling is implemented once in the engine-owned ProjectPortal component, consumed through the pinned engine git submodule.

The professional app never imports Academy curricula, overlays, hints or tutors. It uses the same IDs and project schemas, with command-specific compact presentation and a URL link that sends the identical project to Academy without conversion.

Production requires NEXT_PUBLIC_ENGINE_ORIGIN and NEXT_PUBLIC_ACADEMY_ORIGIN on the same registered site as the Engine. Product-specific OIDC cookies remain HttpOnly and host-only; the engine enforces exact CORS and tenant membership. The URL identifiers confer no permissions. User-facing displays must be honest when the engine is unavailable.

Acceptance requires a real three-host deployment, representative test-account SSO, cross-product project ID/version agreement, membership revocation denial, and browser automation. Unit/CI checks alone do not certify real account availability.

## Dense explorer state — SCC-004

Project title and workspace-type edits carry the exact selected revision. A stale write is rejected by the Engine and the current tenant-scoped list is reloaded before another save.

Pinned project views are stored only in same-origin browser storage, under a tenant-specific key. They contain bounded project identifiers, never project content, titles, credentials or authorization decisions. Pins organize projects that the authenticated Engine response already exposed; they cannot reveal a hidden project. Bulk selection likewise operates only on IDs in the current tenant-scoped result set and does not perform a server mutation.

Portable tests cover persistence parsing, deterministic pin order and visible-result selection. Live multi-organization browser acceptance, keyboard and screen-reader review, large-project performance measurements and deployment evidence remain required before SCC-004 can be called complete.

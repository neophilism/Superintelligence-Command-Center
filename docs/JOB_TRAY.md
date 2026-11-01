# SCC-007 — Engine-backed job tray contract (integration pending)

The `JobTray` is a professional, accessible, source-authoritative
component for current runs and reattachment. A trusted, authenticated
SIE-017 adapter must supply `listRuns({limit})`,
`cancelRun(runId,{expectedRevision})` and
`retryRun(runId,{expectedRevision})`. The transport, cookie,
tenant authorization and server-side durable event journal remain owned
by the pinned Superintelligence Engine. Command Center does not create
another job database, fake provider execution, or invent a public API path.

The adapter's list results are allowlisted to run ID, project ID,
revision, status, elapsed duration, provider identity, boolean action
capabilities and *reconciled* cost in integer USD cents. The browser
never estimates missing charges. Unknown run states, invalid revisions,
malformed costs or duplicate IDs are rejected. Cancelling/retrying
sends the expected revision and then independently re-reads the engine
state: the UI never optimistically marks success. Refresh and remount
reattach through server listRuns; no browser-local job history is trusted.

The app shows an explicit 'unconfigured' state until the real SIE-017
adapter and authenticated session contract are verified. Unit tests with
synthetic fixtures check normalization and fail-closed behavior but
cannot prove actual background reattachment, live cancellation, saved
events, billing reconciliation or production readiness.

Remaining: integrate the actual SIE-017 adapter after its signed API
contract is source-verified, run cross-tenant permission/revocation tests,
test a real long-running worker across tab closure and app relaunch,
verify approved cost policy and CI, then evaluate merge gates.

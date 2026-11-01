# SCC-011 — Artifact comparison and non-destructive restore contract

`ArtifactCompare` displays immutable revision metadata side by side for
supported artifact revisions. It compares checksums, parent revision,
model, tool, source, license and prompt **digest**, not raw prompts,
private content or signed media bytes. Missing provenance is shown as
"not supplied", never guessed. This is a metadata comparison and is not
a complete text/audio/image binary diff or independent rights audit.

`restoreAsNewRevision` is an endpoint-adapter contract, not an invented
API call. It independently reads the head, rejects stale/unauthorized
source revision and asks a trusted SIE-007 client to create a new revision.
Only after independently reloading and confirming the new head and every
previous revision's checksum does it report verified success. It does not
overwrite or delete any earlier history. The UI disables restore without
a verified authenticated engine adapter.

SIE-007 is external to this assigned repository, so live restore endpoint
binding, authorization revocation, media-specific content diff and audit
ledger evidence remain unimplemented. Browser tests and cross-product
lineage review are also required for production acceptance.

The restore adapter must return a `newRevision` receipt, and the
independent server read must show that exact revision with parent
`expectedHeadRevision`, explicit `restoredFromRevision`, and every
previous revision/checksum intact. An unrelated concurrent revision is not
proof of a restore. The exact server-owned SIE-007 response remains to be
verified before wiring any real endpoint.

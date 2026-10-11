# Superintelligence Command Center

This is an independently deployed application using the version-pinned **shared** Superintelligence Engine workspace/UI package through a Git submodule and local package link. The UI source is never copied into this repository. Its canonical roadmap is [registry/roadmap.json](registry/roadmap.json); detailed work packages are in [docs/PR_SPECIFICATIONS.md](docs/PR_SPECIFICATIONS.md).

## Development

Clone recursively to obtain the pinned engine source: `git clone --recursive ...`. Use Node 22+, `npm install`, `npm test`, `npm run build`, `npm run dev`. Configure server-only `ENGINE_API_URL` to query the shared engine's real health contract. No AI provider, lesson or billable generation is enabled in this foundation. It displays an explicit unconfigured status instead of pretending the AI works.

To update the shared engine pin, commit the submodule revision and pass package compatibility checks. Production deployment, authentication, courses and provider integration are separate approved work units. No credentials are stored here.

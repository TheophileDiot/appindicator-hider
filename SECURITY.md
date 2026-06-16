# Security Policy

## Scope

AppIndicator Hider is a local GNOME Shell extension. It should not require network access, analytics, telemetry, cloud services, or repository secrets for normal development, validation, packaging, or release.

No project can make supply-chain compromise impossible. This repository keeps the release path small and auditable so a maintainer can detect and block risky changes before upload.

## Reporting Vulnerabilities

Use GitHub private vulnerability reporting if it is enabled for the repository. If it is not enabled, contact the maintainer privately before publishing details.

Do not open public issues containing exploit details, credentials, tokens, private logs, or unreleased vulnerability details.

## Secret Handling

- Do not commit credentials, tokens, cookies, private keys, API keys, or copied private logs.
- Do not configure repository or organization secrets for this project unless a future release process absolutely requires them.
- If a secret is committed or printed in logs, revoke and rotate it before continuing.
- `make release-check` runs a lightweight secret pattern scan before packaging. Treat it as a guardrail, not a replacement for GitHub Secret Protection and maintainer review.

## Supply-Chain Controls

- GitHub Actions default to read-only repository contents.
- The release workflow grants `contents: write` only to the tag-only GitHub Release job.
- External GitHub Actions must be pinned to full 40-character commit SHAs with a version comment.
- Workflow changes are checked as source: high-risk triggers, workflow secrets, broad write permissions, and shell-download pipes are rejected by `make release-check`.
- The release workflow uses GitHub-owned Actions and the GitHub CLI, not third-party release actions.
- Dependabot tracks GitHub Actions updates on the `dev` branch.
- The release ZIP is checked against an exact allowlist of runtime files.
- Generated files such as `schemas/gschemas.compiled`, `dist/`, and extension ZIPs must not be committed.

## Maintainer Repository Settings

Enable these GitHub repository protections before accepting outside contributions:

- Secret scanning and push protection.
- Dependabot alerts and Dependabot security updates.
- Branch protection for `dev` and `main`, including required pull request review.
- Code owner review for workflow, packaging, metadata, schema, and runtime changes.
- Required status checks from the protected base branch before merging PRs.
- Restricted tag creation for release tags such as `v*`, if available for the repository.
- Read-only default workflow token permissions.

## Release Safety Checklist

Before tagging a release:

1. Review the full diff, including workflow, packaging, schema, and metadata changes.
2. Run `make release-check`.
3. Confirm the ZIP contains only `metadata.json`, `extension.js`, `prefs.js`, and the schema XML.
4. Confirm no repository or organization secrets are needed for the workflow.
5. Tag only the reviewed `main` commit.
6. Upload to `extensions.gnome.org` manually from the reviewed release artifact.

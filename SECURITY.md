# Security Policy

## Scope

AppIndicator Hider is a local GNOME Shell extension. It should not require network access, analytics, telemetry, cloud services, or repository secrets for normal development, validation, packaging, or release.

No project can make supply-chain compromise impossible. This repository keeps the release path small and auditable so a maintainer can detect and block risky changes before upload.

## Reporting Vulnerabilities

Use GitHub private vulnerability reporting if it is enabled for the repository. If it is not enabled, contact the maintainer privately before publishing details.

Do not open public issues containing exploit details, credentials, tokens, private logs, or unreleased vulnerability details.

## Secret Handling

- Do not commit credentials, tokens, cookies, private keys, API keys, or copied private logs.
- Do not configure repository or organization secrets for this project.
- If GNOME upload automation is enabled, store `GNOME_EXTENSIONS_TOKEN` as an environment secret on the protected `gnome-extensions` environment, not as a broad repository or organization secret.
- Do not store a GNOME account password in GitHub. Use a short-lived GNOME Extensions API token and rotate it after release use or failed upload attempts.
- If a secret is committed or printed in logs, revoke and rotate it before continuing.
- Secret scanning is handled by the GitGuardian GitHub App and GitHub Secret Protection in the repository settings.

## Supply-Chain Controls

- GitHub Actions default to read-only repository contents.
- The release workflow grants `contents: write` only to the tag-only GitHub Release job.
- External GitHub Actions must be pinned to full 40-character commit SHAs with a version comment.
- Secret scanning does not use a workflow secret. Use the GitGuardian GitHub App integration instead of a repository secret.
- Automation changes from fork pull requests are rejected in CI. A maintainer should recreate reviewed workflow, Dependabot, or `Makefile` changes from a trusted branch.
- The release workflow uses GitHub-owned Actions, the GitHub CLI, and direct `curl` calls for GNOME upload; it does not use third-party release or GNOME upload Actions.
- GNOME upload is opt-in with `GNOME_EXTENSIONS_UPLOAD_ENABLED=true` and must be approved through the protected `gnome-extensions` environment.
- Dependabot tracks GitHub Actions updates on the `dev` branch.
- The release ZIP is checked against an exact allowlist of runtime files.
- Generated files such as `schemas/gschemas.compiled`, `dist/`, and extension ZIPs must not be committed.

## Maintainer Repository Settings

Enable these GitHub repository protections before accepting outside contributions:

- Secret scanning and push protection.
- GitGuardian GitHub App checks, if enabled, without repository secrets.
- Protected environment `gnome-extensions` with required reviewer approval before adding `GNOME_EXTENSIONS_TOKEN` or setting `GNOME_EXTENSIONS_UPLOAD_ENABLED=true`.
- Dependabot alerts and Dependabot security updates.
- Branch protection for `dev` and `main`, including required pull request review.
- Code owner review for workflow, packaging, metadata, schema, and runtime changes.
- Required status checks from the protected base branch before merging PRs.
- Restricted tag creation for release tags such as `v*`, if available for the repository.
- Read-only default workflow token permissions.

## Release Safety Checklist

Before tagging a release:

1. Review the full diff, including workflow, packaging, schema, and metadata changes.
2. Treat green CI as insufficient if the PR changes automation files; review those files manually.
3. Run `make release-check`.
4. Confirm the ZIP contains only `metadata.json`, `extension.js`, `prefs.js`, and the schema XML.
5. Confirm the release workflow does not need repository or organization secrets.
6. Tag only the reviewed `main` commit.
7. If GNOME upload automation is enabled, approve the protected `gnome-extensions` environment only after reviewing the GitHub Release artifact.
8. If GNOME upload automation is disabled, upload to `extensions.gnome.org` manually from the reviewed release artifact.

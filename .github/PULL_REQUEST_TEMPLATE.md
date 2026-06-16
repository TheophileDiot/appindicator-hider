## Summary

- 

## Type

- [ ] Bug fix
- [ ] Feature
- [ ] Preferences UI
- [ ] Metadata or GNOME compatibility
- [ ] Release or packaging
- [ ] Documentation

## Validation

- [ ] `make release-check`
- [ ] Installed locally and tested in GNOME Shell
- [ ] Preferences opened successfully
- [ ] Not applicable

## Security and Supply Chain

- [ ] No credentials, tokens, cookies, private keys, or private logs are included
- [ ] No new repository or organization secrets are required; release secrets are environment-scoped and documented in `SECURITY.md`
- [ ] New or changed GitHub Actions are pinned to full commit SHAs
- [ ] Workflow permissions are least-privilege
- [ ] Workflow changes do not add high-risk triggers or unapproved secret usage
- [ ] Fork PRs do not change workflow, Dependabot, or `Makefile` automation directly
- [ ] No generated, vendored, minified, or binary blobs are committed

## GNOME Extension Checklist

- [ ] `metadata.json` has no manual `version` key
- [ ] `shell-version` contains only stable GNOME Shell releases
- [ ] Shell-side state created in `enable()` is cleaned up in `disable()`
- [ ] `extension.js` does not import GTK, Gdk, or Adwaita
- [ ] `prefs.js` does not import Shell, St, Clutter, or Meta
- [ ] Generated artifacts are not committed

## Linked Issues

Closes #

# First Project Bootstrap & Lifecycle Manager

## Role

You are responsible for establishing the complete engineering lifecycle immediately after creating a new software project.

The project must leave bootstrap in a state where it has:

```text
Source
Git
GitHub
Codeberg
.gitignore
Security scanning
README
CHANGELOG
Versioning
Release strategy
Remote synchronization
```

The Agent must use external security tooling rather than trusting its own judgment alone.

---

# 1. Trigger

Use this Skill when:

- you have just created a new project
- the project has no Git repository
- the user explicitly asks to initialize project lifecycle infrastructure

---

# 2. Bootstrap Sequence

Execute in this order:

```text
1. Understand project
2. Detect technology
3. Generate .gitignore
4. Establish security scanner
5. Scan project
6. Initialize Git
7. Create initial files
8. Commit
9. Create GitHub repository
10. Create/configure Codeberg repository
11. Push both remotes
12. Configure metadata
13. Establish version
14. Establish changelog
15. Configure CI/security
16. Verify everything
```

Do not skip the security stage because the project is new.

---

# 3. Project Identity

Determine:

```text
name
description
language
framework
platform
license
package manager
build system
```

Use the actual project.

---

# 4. Repository Architecture

Default:

```text
Local Git
   │
   ├── origin → GitHub
   │
   └── codeberg → Codeberg
```

GitHub:

```text
primary remote
release host
GitHub Actions
GitHub security
```

Codeberg:

```text
secondary source mirror
independent hosting location
```

---

# 5. Repository Visibility

Default:

```text
PUBLIC
```

Only use private repositories when explicitly requested.

Never interpret silence as a request for private.

However, security scanning must happen before publication.

---

# 6. Gitleaks Installation

Check:

```bash
command -v gitleaks
```

If unavailable:

- use the appropriate system package manager when possible
- otherwise ask the user to install it
- never download an untrusted binary

Do not continue to public repository creation if the security gate cannot reasonably be established.

---

# 7. Initial Secret Scan

Before:

```text
git init
git add
git commit
GitHub creation
Codeberg publication
```

scan the project.

Preferred:

```bash
gitleaks detect --source . --redact
```

Use the current Gitleaks syntax supported by the installed version.

---

# 8. Security Failure

If secrets are detected:

STOP.

Never:

```text
commit
push
publish
print secret
copy secret into chat
```

Report only redacted information.

The user must remove/rotate the credential.

---

# 9. .gitignore Generation

Analyze the project stack.

Generate `.gitignore` for actual technologies.

Cover:

```text
dependencies
build artifacts
compiled output
cache
logs
coverage
IDE metadata
OS metadata
temporary files
environment variables
credentials
private keys
generated files
local state
```

Typical security entries:

```text
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
credentials.json
secrets/
```

Only include relevant patterns.

---

# 10. .env.example

If environment variables are required:

create:

```text
.env.example
```

It must contain placeholders only.

Example:

```text
DATABASE_URL=
API_BASE_URL=
API_KEY=
```

Never put actual credentials into it.

---

# 11. Git Initialization

After security validation:

```bash
git init
git branch -M main
```

Create appropriate repository files.

---

# 12. Initial Repository Structure

Create as appropriate:

```text
README.md
CHANGELOG.md
LICENSE
.gitignore
```

Potentially:

```text
.editorconfig
.gitattributes
.github/
.github/workflows/
```

Do not generate unnecessary boilerplate.

---

# 13. Initial README

README should contain:

```text
Project description
Features
Requirements
Installation
Development
Configuration
Usage
Build
Testing
Releases
License
```

Only document functionality that actually exists.

---

# 14. Initial CHANGELOG

Create:

```markdown
# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

### Added

- Initial project structure.
```

---

# 15. Version

If no version exists:

prefer:

```text
0.1.0
```

for an actively developed pre-1.0 project.

Follow ecosystem conventions when appropriate.

Do not create a release automatically merely because version `0.1.0` exists.

---

# 16. Initial Commit

Stage intentionally.

Before commit:

```bash
git status
git diff
git diff --cached
```

Run Gitleaks again if appropriate.

Then create a meaningful initial commit:

```text
feat(init): bootstrap project
```

or:

```text
chore(init): initialize project structure
```

Choose based on actual content.

---

# 17. GitHub Creation

Verify:

```bash
gh auth status
```

Then:

```bash
gh repo create <name> --public --source=. --remote=origin
```

If private was explicitly requested:

```bash
gh repo create <name> --private --source=. --remote=origin
```

Do not publish if the security gate failed.

---

# 18. Codeberg Creation

Create the Codeberg repository with the authenticated Codeberg tooling available in the environment.

Preferred workflow:

```text
create Codeberg repository
add Codeberg as remote
push existing Git history
```

Preferred remote:

```text
codeberg
```

Do not initialize a second independent Git history.

Codeberg must contain the same Git history.

---

# 19. Codeberg Remote

Configure:

```bash
git remote add codeberg <codeberg-repository-url>
```

If already present:

```bash
git remote get-url codeberg
```

Never silently replace an existing Codeberg remote.

---

# 20. First Push

After both remotes exist:

```bash
git push -u origin main
git push -u codeberg main
```

Do not use force push.

---

# 21. Verify First Push

Verify:

```bash
git ls-remote origin
git ls-remote codeberg
```

The `main` branch on both providers must point to the same commit.

---

# 22. Repository Metadata

Configure GitHub:

```text
description
topics
license
homepage when applicable
```

Configure Codeberg similarly.

Metadata must describe the actual project.

---

# 23. Topics

Topics should reflect:

```text
language
framework
platform
domain
important technologies
```

Do not add irrelevant popularity-driven topics.

---

# 24. Security Infrastructure

Recommended:

```text
Gitleaks
Git pre-commit integration
GitHub Push Protection
GitHub secret scanning
dependency scanning
CI security checks
```

The Agent is not allowed to bypass these automatically.

---

# 25. Defense-in-Depth

Security architecture:

```text
             Agent
               │
               ▼
        Gitleaks local scan
               │
               ▼
            Commit
               │
        ┌──────┴──────┐
        ▼             ▼
     GitHub        Codeberg
        │
        ▼
GitHub Push Protection
        │
        ▼
     GitHub
```

Codeberg receives the same source history but relies primarily on local/pre-push security controls rather than assuming GitHub's security layer exists there.

---

# 26. Commit Lifecycle

After bootstrap:

```text
change
 ↓
inspect
 ↓
stage
 ↓
Gitleaks
 ↓
test/lint/build
 ↓
commit
 ↓
push GitHub
 ↓
push Codeberg
 ↓
verify synchronization
```

---

# 27. Commit Frequency

Commit logical units of work.

Do not create a commit for every tiny edit.

Examples:

```text
feat(player): add playback history
fix(player): preserve position after crash
refactor(ui): extract media controls
docs(readme): document installation
ci(security): add secret scanning
```

---

# 28. Automatic Change Classification

When a change introduces something genuinely new:

classify as:

```text
feat
```

Bug:

```text
fix
```

Performance:

```text
perf
```

Refactor:

```text
refactor
```

Documentation:

```text
docs
```

Tests:

```text
test
```

Build/repository infrastructure:

```text
build
chore
ci
```

---

# 29. Version Bumping

Use:

```text
BREAKING CHANGE → major
feature → minor
bug fix → patch
```

Examples:

```text
0.1.0 → 0.2.0
0.2.0 → 0.2.1
0.9.0 → 1.0.0
```

Do not bump versions for every documentation or formatting change.

---

# 30. Tagging

When a release is appropriate:

```bash
git tag -a v<version> -m "Release v<version>"
git push origin v<version>
git push codeberg v<version>
```

Verify both remotes.

---

# 31. Changelog Automation

Update:

```text
CHANGELOG.md
```

based on user-facing changes.

Use:

```text
Added
Changed
Fixed
Removed
Security
```

Do not blindly copy technical commit messages.

---

# 32. Build Detection

Detect project build system.

Examples:

```text
npm
pnpm
cargo
go
cmake
gradle
flutter
dotnet
maven
```

Prefer project-defined scripts over invented commands.

---

# 33. Build Validation

When preparing a release:

```text
lint
test
build
security scan
```

as appropriate.

A failed build must block release unless the user explicitly overrides it.

---

# 34. Compiled Artifacts

Compiled artifacts normally do NOT belong in source Git history.

Examples:

```text
binary
installer
AppImage
.deb
.rpm
.zst
.apk
.exe
.dmg
tar.gz
zip
wasm
```

Prefer GitHub Releases.

---

# 35. Release Artifact Approval

When compiled artifacts are generated:

ask:

> Build completed successfully and produced release artifacts. Should I attach these artifacts to the GitHub Release?

Do not publish them without approval.

---

# 36. Release Assets

If approved:

1. scan
2. inspect
3. verify architecture
4. verify platform
5. verify filenames
6. generate checksums where useful
7. upload to GitHub Release

Never include secrets.

---

# 37. Release Notes

Generate:

```text
Highlights
Added
Changed
Fixed
Performance
Security
Breaking Changes
Known Issues
```

Release notes should be understandable to project users.

---

# 38. Codeberg Release Policy

By default:

```text
Codeberg source mirror: YES
Codeberg tags: YES
Codeberg release binaries: NO
```

If the user asks for Codeberg releases too, support them without changing GitHub's release policy.

---

# 39. Remote Failure Policy

If:

```text
GitHub succeeds
Codeberg fails
```

do not create another commit.

Retry the same commit.

Report:

```text
GitHub: OK
Codeberg: FAILED
Commit: <hash>
```

If:

```text
Codeberg succeeds
GitHub fails
```

same principle.

Never create duplicate commits merely to synchronize remotes.

---

# 40. Security Failure Policy

If Gitleaks fails:

```text
STOP
```

If GitHub Push Protection fails:

```text
STOP
```

If dependency scanning finds critical vulnerabilities:

```text
BLOCK RELEASE
```

unless the user explicitly acknowledges and overrides the release decision.

Never bypass automatically.

---

# 41. Human Approval

Required for:

```text
public/private visibility changes
force push
history rewrite
security bypass
breaking release
release artifact publication
remote deletion
credential publication
potentially sensitive data publication
```

---

# 42. Final Verification

Run:

```bash
git status
git remote -v
git branch --show-current
git log --oneline --decorate -5
git tag --sort=-version:refname | head
git ls-remote origin
git ls-remote codeberg
gh repo view
```

Final state must clearly report:

```text
Git: initialized
GitHub: connected
Codeberg: connected
GitHub push: successful/failed
Codeberg push: successful/failed
Security scan: passed/failed
.gitignore: configured
README: configured
CHANGELOG: configured
Version: <version>
Latest tag: <tag>
Build: passed/failed/not run
Release: created/not created
Artifacts: published/not published
```

Never claim complete bootstrap if either remote is not synchronized.

# End Skill
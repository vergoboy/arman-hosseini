# README Generation Extension

## Purpose

The Codebase GraphML Skill must be able to generate a complete, accurate, useful, and maintainable `README.md` for the project.

The README must not be a superficial description generated only from filenames or function names.

It must be generated from a combination of:

1. `project.graphml`
2. actual source code
3. project configuration files
4. dependency manifests
5. existing documentation
6. build scripts
7. test configuration
8. runtime configuration
9. CLI/API entry points
10. AI-generated semantic metadata already stored in GraphML

The GraphML provides the architectural and functional map.

The source code remains authoritative.

---

# README Command

Provide a command equivalent to:

```bash
codegraph readme
```

This command generates or updates:

```text
README.md
```

The command must analyze the project before writing the README.

It must not blindly overwrite a useful existing README.

---

# README Generation Pipeline

The workflow must be:

```text
Project
   │
   ├── Source Code
   ├── project.graphml
   ├── package manifests
   ├── configuration
   ├── tests
   ├── scripts
   └── existing documentation
            │
            ▼
       Project Analysis
            │
            ▼
      Architecture Model
            │
            ▼
       README Planner
            │
            ▼
       README Generator
            │
            ▼
         README.md
```

The GraphML should be read first because it provides the project's functional structure.

---

# Step 1 — Read the Graph

Load:

```text
.codegraph/project.graphml
```

Analyze:

- major modules
- important files
- classes
- interfaces
- functions
- methods
- function call relationships
- dependency relationships
- entry points
- public APIs
- important execution paths
- semantic titles
- semantic summaries

Identify highly connected and architecturally important nodes.

Do not simply list every node.

The README should describe the architecture at an appropriate abstraction level.

---

# Step 2 — Identify Project Identity

Determine:

- project name
- purpose
- problem being solved
- project type
- primary language
- framework
- runtime
- package manager
- major dependencies
- supported platforms
- license
- repository information if available

Prefer authoritative sources such as:

```text
package.json
Cargo.toml
pyproject.toml
go.mod
composer.json
pom.xml
build.gradle
CMakeLists.txt
README files
LICENSE
project configuration
```

Do not invent information that cannot be verified.

---

# Step 3 — Identify Entry Points

Determine how users or other systems interact with the project.

Possible entry points include:

```text
CLI commands
HTTP endpoints
REST APIs
GraphQL APIs
WebSocket endpoints
GUI application entry points
desktop entry points
mobile entry points
library exports
main()
server startup
workers
background jobs
event handlers
plugins
```

Document the important public entry points.

---

# Step 4 — Understand the Architecture

Use the GraphML to identify major architectural areas.

For example:

```text
UI
 ↓
Application Layer
 ↓
Domain Layer
 ↓
Services
 ↓
Persistence
```

or:

```text
Client
 ↓
API
 ↓
Authentication
 ↓
Business Logic
 ↓
Database
```

Do not impose a generic architecture template on the project.

Derive the architecture from the actual source code.

---

# Step 5 — Identify Important Functional Flows

Use `calls` edges in GraphML to identify important execution paths.

For example:

```text
Application startup
    ↓
initialize()
    ↓
loadConfig()
    ↓
connectDatabase()
    ↓
startServer()
```

or:

```text
User request
    ↓
routeRequest()
    ↓
authenticate()
    ↓
processRequest()
    ↓
saveResult()
```

Document the most important flows.

Do not document every function.

Prefer the flows that explain how the system actually works.

---

# Step 6 — Identify Public API

Determine which functions/classes/modules are intended for external use.

Consider:

- exported functions
- public classes
- exported modules
- CLI commands
- API endpoints
- configuration interfaces
- plugin interfaces

Document public interfaces more prominently than internal helpers.

---

# Step 7 — Analyze Dependencies

Inspect the project's dependency manifest and GraphML.

Separate:

```text
runtime dependencies
development dependencies
optional dependencies
peer dependencies
system dependencies
external services
```

Do not dump the entire dependency tree into the README.

Document only important dependencies when they help explain:

- architecture
- installation
- runtime requirements
- major capabilities
- integrations

---

# Step 8 — Installation

Generate a practical installation section.

Determine the actual installation procedure from project files.

Examples may include:

```bash
git clone ...
cd project
npm install
npm run build
```

or:

```bash
cargo build --release
```

or:

```bash
uv sync
```

Never invent commands.

Verify commands against:

- package scripts
- build configuration
- Makefiles
- task runners
- CI configuration
- documentation
- container configuration

If multiple installation methods exist, document the supported ones.

---

# Step 9 — Quick Start

Provide a minimal path from:

```text
clone
 ↓
install
 ↓
configure
 ↓
run
```

The Quick Start must allow a new developer/user to understand how to get the project running with minimal effort.

Use real commands from the project.

---

# Step 10 — Configuration

Inspect configuration files and environment variable usage.

Document important configuration such as:

```text
environment variables
configuration files
ports
URLs
API keys
database configuration
feature flags
runtime options
CLI flags
```

For secrets:

Never include actual credentials.

Use:

```text
API_KEY=your_api_key_here
```

rather than real values.

---

# Step 11 — Usage

Document practical usage.

Depending on the project, this may include:

```text
CLI usage
API usage
library usage
GUI usage
configuration
common workflows
examples
```

Examples must be based on actual project behavior.

Do not create fictional APIs.

---

# Step 12 — Architecture Section

The README should contain a concise architecture section.

Example:

```markdown
## Architecture

The application is divided into four main layers:

- **Presentation** — handles user interaction and API requests.
- **Application** — coordinates application workflows.
- **Domain** — contains core business logic.
- **Persistence** — manages database access.

The main execution flow is:

`Request → Authentication → Application Service → Domain Logic → Persistence`
```

This section should be generated from GraphML relationships and source-code analysis.

---

# Step 13 — Functional Overview

Provide a high-level explanation of the project's important functional areas.

For example:

```markdown
## Core Components

### Authentication

Responsible for user authentication and session management.

### Room Management

Creates rooms, manages participants, and handles room state.

### Playback Synchronization

Coordinates playback state between connected clients.
```

Use the `title` and `summary` information from GraphML when available.

---

# Step 14 — Project Structure

Include a useful project tree.

Do not blindly dump every file.

Prefer:

```text
src/
├── auth/
│   ├── login.ts
│   └── session.ts
├── api/
├── database/
├── player/
└── main.ts
```

The tree should emphasize meaningful architectural boundaries.

Avoid huge trees that contain generated files, caches, dependencies, build artifacts, or thousands of implementation files.

---

# Step 15 — Development

Document how developers work on the project.

Determine:

- development server
- development build
- formatting
- linting
- type checking
- tests
- coverage
- debugging
- code generation
- local services

Use actual project commands.

---

# Step 16 — Testing

Inspect the test structure and configuration.

Document:

```text
test framework
unit tests
integration tests
end-to-end tests
test commands
coverage commands
test layout
```

If possible, connect the testing section to the GraphML architecture.

Explain which major areas are tested.

Do not claim coverage that cannot be verified.

---

# Step 17 — Build and Release

If applicable, document:

- production build
- packaging
- binaries
- Docker images
- deployment
- release process
- supported artifacts

Only document mechanisms actually present in the project.

---

# Step 18 — API Documentation

If the project exposes an API, include a concise API overview.

For REST:

```text
GET    /...
POST   /...
PUT    /...
DELETE /...
```

For CLI:

```text
project start
project build
project config
```

For libraries:

```text
import { ... } from "..."
```

Do not document every internal function.

Focus on public interfaces.

---

# Step 19 — Examples

Provide realistic examples where useful.

Examples should be derived from actual APIs and behavior.

Avoid invented examples.

A good example should answer:

> "What can I actually do with this project?"

---

# Step 20 — Troubleshooting

Generate troubleshooting only when there is evidence of common failure modes from:

- documentation
- issue-related project files
- configuration
- build scripts
- runtime checks
- source error handling
- CI configuration

Do not invent generic troubleshooting sections merely to make the README longer.

---

# Step 21 — Security

If relevant, document:

- authentication
- authorization
- secrets
- security-sensitive configuration
- required environment variables
- exposed services
- security considerations

Never expose real credentials.

---

# Step 22 — Performance

Only document performance characteristics that are supported by:

- benchmarks
- explicit project documentation
- implementation characteristics that can be confidently established

Do not invent benchmark numbers.

---

# Step 23 — Limitations

Document known limitations when they are verifiable.

Examples:

```text
Currently supports Linux only.
Requires PostgreSQL.
Feature X is experimental.
```

Never turn assumptions into limitations.

---

# Step 24 — Roadmap

Only include a roadmap if an authoritative roadmap exists in:

- project documentation
- TODO files
- issue tracking metadata
- project planning files

Otherwise omit it.

Do not invent future features.

---

# Step 25 — License

Determine the license from:

```text
LICENSE
package metadata
Cargo.toml
pyproject.toml
go.mod
repository metadata
```

Do not guess the license.

---

# README Structure

The generated README should generally follow this structure:

```markdown
# Project Name

Short, accurate description.

## Features

## Requirements

## Installation

## Quick Start

## Usage

## Configuration

## Architecture

## Core Components

## Project Structure

## API / CLI

## Development

## Testing

## Build / Release

## Troubleshooting

## Security

## Limitations

## License
```

Do not force every section into every project.

Only include sections that provide real value.

---

# README Quality Rules

The README must be:

- accurate
- practical
- maintainable
- concise where possible
- comprehensive where necessary
- newcomer-friendly
- developer-friendly
- based on verified project behavior

Do not optimize for maximum length.

Optimize for maximum useful information.

---

# Avoiding Hallucinations

The README generator must never invent:

- commands
- APIs
- environment variables
- features
- dependencies
- architecture
- supported platforms
- configuration options
- benchmark numbers
- licenses
- deployment methods

When information cannot be verified:

- omit it, or
- explicitly mark it as unknown.

---

# Existing README Handling

If `README.md` already exists:

1. Read it.
2. Identify useful information.
3. Preserve accurate information that is not discoverable from source.
4. Compare it with the current project.
5. Remove stale information.
6. Add missing information.
7. Preserve useful human-written explanations where possible.
8. Do not blindly replace the entire document.

The existing README is a source of information, but source code remains authoritative for implementation details.

---

# README Update Strategy

Support two modes.

## Generate

```bash
codegraph readme --generate
```

Generate a complete README from the current project.

## Update

```bash
codegraph readme --update
```

Update an existing README while preserving useful human-written content.

The default should preferably be:

```bash
codegraph readme
```

which behaves as an intelligent update when `README.md` exists and generation when it does not.

---

# Graph-Aware README Generation

The generator must use GraphML as an architectural index.

For example:

```text
GraphML:

login()
 ├── validateCredentials()
 ├── findUser()
 └── createSession()
```

The README should be able to derive:

```markdown
### Authentication

Authentication is handled by the login workflow, which validates
credentials, resolves the user, and creates a session.
```

It should not expose the entire call graph unless that information is useful to the reader.

---

# README and GraphML Consistency

After generating the README, verify that:

- documented modules exist
- documented functions exist
- documented commands exist
- documented dependencies exist
- documented configuration exists
- documented paths exist
- documented API endpoints exist

If a README statement conflicts with source code:

source code wins.

---

# Final Validation

Before writing `README.md`, perform a final validation pass.

Check:

```text
Project identity
Installation
Quick start
Commands
Configuration
Architecture
Core components
Project structure
Testing
Build
API
License
```

For each claim ask:

> Is this supported by the project?

If not:

- remove it,
- correct it,
- or explicitly mark it as uncertain.

---

# Recommended Complete Workflow

For a new or significantly changed project:

```bash
codegraph graph-functions
codegraph summarize
codegraph readme
```

Or use the complete pipeline:

```bash
codegraph build
codegraph readme
```

The resulting project knowledge artifacts are:

```text
.codegraph/
└── project.graphml

README.md
```

The relationship is:

```text
                    SOURCE CODE
                        │
                        ▼
                 Structural Parser
                        │
                        ▼
                 project.graphml
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        AI Enrichment         Graph Viewer
             │
             ▼
     title / summary
             │
             ▼
       README Generator
             │
             ▼
          README.md
```

---

# Agent Instruction

When asked to create or update the README:

1. Read `.codegraph/project.graphml`.
2. Read the existing `README.md` if present.
3. Inspect project metadata and configuration.
4. Inspect relevant source files.
5. Understand major functional flows from the function-call graph.
6. Generate the README.
7. Verify every important claim against the repository.
8. Never invent undocumented behavior.
9. Preserve useful existing documentation.
10. Write the final result to `README.md`.

The README should explain the project to a developer who has never seen the repository before.

It should answer:

- What is this?
- Why does it exist?
- What does it do?
- How is it structured?
- How does the important functionality work?
- How do I install it?
- How do I run it?
- How do I configure it?
- How do I use it?
- How do I test it?
- How do I develop it?
- What are its important components?
- What are its limitations?
- What license does it use?

The final README must be useful without requiring the reader to open the source code first.
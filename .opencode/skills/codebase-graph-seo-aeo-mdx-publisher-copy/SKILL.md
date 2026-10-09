# Codegraph MDX Publisher

## Purpose

This skill runs after the project has been analyzed and documented by the Codegraph pipeline.

It transforms:

- source code
- `project.graphml`
- AI-generated code summaries
- generated `README.md`
- project metadata
- configuration
- dependencies
- existing documentation
- screenshots
- videos
- external references
- repository metadata

into a **production-ready MDX content page** designed for:

1. Human readability
2. Traditional SEO
3. Answer Engine Optimization (AEO)
4. AI citation and retrieval
5. Semantic search
6. Accurate technical documentation
7. Long-term maintainability
8. Strong internal linking
9. High-quality media integration
10. Clear project understanding

The generated MDX must be factually grounded in the actual project.

Never invent project capabilities, commands, APIs, screenshots, benchmarks, compatibility, integrations, or claims.

---

# Command

The canonical command is:

```bash
codegraph mdx
```

Supported modes:

```bash
codegraph mdx --generate
codegraph mdx --update
codegraph mdx --audit
codegraph mdx --media-plan
codegraph mdx --references
```

Full pipeline:

```bash
codegraph graph-functions
codegraph summarize
codegraph readme
codegraph mdx
```

Or:

```bash
codegraph build
codegraph readme
codegraph mdx
```

---

# 1. Source-of-Truth Hierarchy

The agent MUST use this priority order when deciding whether a statement is true:

1. Actual source code
2. Project configuration
3. Dependency manifests
4. Generated Codegraph GraphML
5. Existing project documentation
6. README
7. Existing website content
8. External authoritative references
9. Agent inference

If two sources conflict, prefer the higher-ranked source.

The GraphML is an architectural index.

The source code is the final authority.

Never treat an old README as more authoritative than the source code.

---

# 2. Required Inputs

Before generating the MDX, inspect:

```text
.codegraph/project.graphml
README.md
package.json
Cargo.toml
pyproject.toml
go.mod
composer.json
requirements.txt
Dockerfile
docker-compose.yml
.env.example
LICENSE
CONTRIBUTING.md
CHANGELOG.md
```

Only files that actually exist should be inspected.

Also inspect:

```text
src/
app/
apps/
packages/
lib/
components/
docs/
public/
static/
```

according to the project's structure.

---

# 3. Website Discovery

Before writing the MDX, determine how the website expects content.

Inspect:

```text
content/
src/content/
src/content/blog/
src/content/docs/
pages/
app/
routes/
```

and determine:

- MDX location
- frontmatter schema
- slug convention
- URL convention
- category convention
- tag convention
- author fields
- date fields
- image fields
- canonical URL fields
- SEO fields
- OpenGraph fields
- schema fields
- existing MDX components
- image components
- video components
- callout components
- code block components
- FAQ components
- table-of-contents components

Do not invent frontmatter fields.

Reuse the project's existing schema.

If the site has an existing MDX page with the same content type, inspect it and follow its structure.

---

# 4. Output Contract

The generated page must be a real `.mdx` file.

Example:

```text
src/content/blog/project-name.mdx
```

The exact destination must be determined from the website's existing content architecture.

The final file must contain:

```text
frontmatter
H1
intro
direct answer
core sections
technical explanation
examples
media
references
FAQ
conclusion
```

only where appropriate.

Do not force sections that do not make sense.

---

# 5. SEO Metadata

The frontmatter must contain every SEO field supported by the website.

Typical fields may include:

```yaml
---
title: "..."
description: "..."
slug: "..."
tags:
  - "..."
  - "..."
category: "..."
author: "..."
publishedAt: "..."
updatedAt: "..."
canonical: "..."
image: "..."
ogImage: "..."
---
```

Only include fields actually supported by the website.

## Title Rules

The title must:

- describe the actual topic
- contain the primary topic naturally
- be understandable without context
- avoid clickbait
- avoid keyword stuffing
- be distinct from existing pages
- accurately represent the content

Do not write titles like:

```text
The BEST Ultimate Amazing Complete Guide!!!
```

Prefer:

```text
How BidandoonVPN Routes VPN Traffic on Linux
```

when that is genuinely what the page explains.

---

# 6. Meta Description

The description must summarize the actual page.

It should:

- explain what the reader will learn
- contain the primary topic naturally
- be concise
- avoid repetition
- avoid fake promises
- not simply repeat the title

Bad:

```text
BidandoonVPN is a VPN. Learn about BidandoonVPN.
```

Good:

```text
Learn how BidandoonVPN routes VPN traffic on Linux, how its components interact, and how to configure and troubleshoot the client.
```

Do not blindly enforce an arbitrary character count if the site's SEO system has its own rules, but keep descriptions concise and search-result appropriate.

---

# 7. Search Intent

Before writing, determine the primary search intent.

Possible intents:

- informational
- navigational
- commercial investigation
- transactional
- technical documentation
- tutorial
- troubleshooting
- comparison
- reference

Identify:

```text
Primary intent
Secondary intents
Primary query
Related queries
Entities
User questions
```

The page must satisfy the dominant intent.

Do not turn a technical tutorial into a generic marketing article.

---

# 8. Query and Topic Research

Identify:

```text
Primary topic
Primary keyword
Secondary keywords
Related entities
Synonyms
Long-tail queries
Common questions
Technical terminology
```

Keywords must be used naturally.

Never:

- repeat keywords unnaturally
- create keyword-only paragraphs
- hide keywords
- create fake sections solely for ranking
- stuff keywords into alt text
- stuff keywords into tags

Semantic coverage is more important than keyword density.

---

# 9. H1 Rules

Exactly one visible H1.

The H1 should clearly communicate the page's main topic.

Example:

```md
# How BidandoonVPN Works on Linux
```

Do not create multiple H1 headings.

---

# 10. H2 Strategy

H2 headings are extremely important.

Whenever a section naturally answers a real user question, prefer a question-based H2.

Examples:

```md
## What is BidandoonVPN?

## How does BidandoonVPN work?

## How does BidandoonVPN route traffic on Linux?

## What components does BidandoonVPN use?

## How do you install BidandoonVPN?

## How do you configure BidandoonVPN?

## How do you troubleshoot BidandoonVPN?

## What are the limitations of BidandoonVPN?
```

Do not convert every heading into a question.

Use question-based H2s when they correspond to:

- real search queries
- user intent
- important conceptual questions
- troubleshooting questions
- implementation questions
- comparison questions

Use normal descriptive headings when a question would be unnatural.

---

# 11. Direct Answer Rule

Every major question section should begin with a concise answer.

Example:

```md
## How does the routing system work?

BidandoonVPN routes application traffic through the configured VPN tunnel by...
```

Then provide:

1. Direct answer
2. Explanation
3. Evidence
4. Example
5. Technical details

Do not make users read five paragraphs before answering the question.

This makes content easier to extract by search engines and answer engines.

---

# 12. Definition Blocks

Important concepts should have explicit definitions.

Example:

```md
## What is the BidandoonVPN routing layer?

The routing layer is the component responsible for...
```

Definitions must be factual and source-grounded.

---

# 13. Step-by-Step Instructions

For procedures, use ordered lists.

Example:

```md
## How do you install the project?

1. Install the required dependencies.
2. Clone the repository.
3. Configure the environment.
4. Start the application.
5. Verify the connection.
```

Every command must be verified against the repository.

Never invent commands.

---

# 14. Code Examples

Code examples must come from:

- actual source
- actual configuration
- actual CLI output
- verified project commands

Prefer minimal examples.

Every code block must specify a language when possible:

```md
```bash
...
```
```

```md
```typescript
...
```
```

Do not fabricate APIs.

---

# 15. Architecture Explanation

Use the Codegraph graph to explain architecture.

Identify:

- major modules
- important classes
- important functions
- entry points
- data flow
- dependency relationships
- call relationships
- external integrations
- important execution paths

Explain the architecture in human terms.

Example:

```md
## How is the project structured?

The application is divided into three major layers:

1. ...
2. ...
3. ...
```

Do not dump the entire GraphML graph into the article.

Use the graph as an analysis tool.

---

# 16. Functional Flows

Use `calls` relationships from GraphML to discover important functional flows.

Prioritize:

- application startup
- authentication
- main user actions
- API requests
- database operations
- network operations
- rendering
- background jobs
- CLI commands
- major workflows

For each important flow, explain:

```text
Entry point
↓
Important functions
↓
Important modules
↓
External systems
↓
Result
```

Do not list every function.

Only document functions that help the reader understand the feature.

---

# 17. API Documentation

If the project exposes an API, identify it from the source.

Document:

- endpoints
- HTTP methods
- parameters
- authentication
- request bodies
- responses
- errors
- examples

Never invent an endpoint.

Only document verified APIs.

---

# 18. CLI Documentation

If the project has a CLI, document:

- command
- subcommand
- flags
- arguments
- examples
- expected output

Verify every command.

---

# 19. Configuration

Identify configuration from:

```text
.env.example
config files
CLI arguments
environment variables
source code
documentation
```

Document:

```text
Variable
Purpose
Required/optional
Default
Example
```

Never expose secrets.

Never copy:

- API keys
- tokens
- passwords
- private URLs
- private credentials

---

# 20. Dependencies

Only mention dependencies that materially affect understanding or usage.

Explain:

```text
Dependency
Purpose
Why it matters
```

Do not generate a meaningless dependency dump.

---

# 21. Screenshots

Screenshots are strongly encouraged when they materially improve understanding.

The agent should determine whether screenshots can be captured automatically.

Preferred tools:

1. Playwright
2. Browser automation
3. Existing project screenshot tooling
4. Desktop screenshot tools
5. Manual capture plan

If the project can be launched locally and a UI exists, attempt to capture useful states.

Examples:

```text
Login screen
Dashboard
Main application
Configuration page
Important workflow
Error state
CLI output
```

Do not capture random screenshots.

---

# 22. Screenshot Verification

Every screenshot must have:

```text
purpose
filename
location
alt text
caption
where it appears in MDX
what state must be visible
```

Example:

```text
Media asset:

public/images/bidandoonvpn-dashboard.webp

Purpose:
Show the main dashboard after a successful connection.

MDX placement:
After "How does the dashboard work?"

Alt:
"BidandoonVPN dashboard showing an active VPN connection"

Caption:
"BidandoonVPN dashboard with an active VPN connection."
```

The MDX should already contain the correct reference:

```md
![BidandoonVPN dashboard showing an active VPN connection](/images/bidandoonvpn-dashboard.webp)
```

If the screenshot cannot be automatically captured, do not invent one.

Create a media requirement instead.

---

# 23. Media Capture Plan

When media cannot be automatically generated, create:

```text
.codegraph/mdx-media-plan.md
```

The file must contain:

```md
# Media Capture Plan

## 1. Screenshot

File:
`public/images/...`

Capture:
...

Location in article:
...

UI state:
...

Required visible elements:
...

Alt text:
...

Caption:
...

## 2. Video

Suggested filename:
`public/videos/...`

Record:
...

Duration:
...

Steps:
...

Location in article:
...

Poster:
...
```

The agent must also insert a placeholder into the MDX.

Example:

```md
{/* MEDIA REQUIRED: capture dashboard after successful connection.
File: /images/bidandoonvpn-dashboard.webp
Alt: "BidandoonVPN dashboard showing an active VPN connection"
Placement: after this paragraph.
*/}
```

This guarantees that the media task and article remain synchronized.

---

# 24. Video Requirements

If a workflow is significantly easier to understand visually, recommend a video.

Examples:

- installation
- first configuration
- login
- connecting to a VPN
- using the main workflow
- debugging
- advanced configuration

If automatic recording is available, use it.

Otherwise generate a recording plan.

The plan must specify:

```text
filename
duration
resolution
workflow
starting state
ending state
chapters
poster image
MDX insertion point
```

---

# 25. Image Alt Text

Every meaningful image must have descriptive alt text.

Alt text should describe what is actually visible.

Bad:

```text
VPN screenshot
```

Good:

```text
BidandoonVPN Linux client showing an active connection and selected server
```

Do not use alt text as keyword stuffing.

Decorative images should use the site's appropriate decorative-image mechanism.

---

# 26. Captions

Use captions when they add useful context.

A caption should explain:

- what is shown
- why it matters
- what the reader should notice

Do not duplicate alt text unnecessarily.

---

# 27. References

Important technical claims should be traceable.

Use authoritative references when appropriate:

- official documentation
- standards
- specifications
- official repositories
- official API documentation
- upstream documentation
- academic papers
- authoritative technical sources

Prefer primary sources.

Avoid low-quality SEO blogs when an authoritative source exists.

---

# 28. Citation Rules

Every externally sourced factual claim must have a reference.

Examples:

```md
According to the official documentation, ...
```

or a normal link/reference supported by the site's MDX conventions.

Do not cite:

- random scraped pages
- AI-generated pages
- SEO spam
- sources that do not actually support the claim

Never invent references.

Never fabricate URLs.

---

# 29. Internal Links

Search the project website/content tree for related pages.

Add internal links when they genuinely help.

Examples:

```md
See [the installation guide](/docs/installation) for setup instructions.
```

Prioritize:

- related documentation
- architecture pages
- API references
- tutorials
- troubleshooting pages
- project overview

Avoid excessive internal linking.

---

# 30. External Links

External links should generally point to:

- official project
- official documentation
- official repository
- standards
- authoritative technical references

Use descriptive anchor text.

Avoid:

```md
click here
```

Prefer:

```md
Read the official Rust documentation
```

---

# 31. FAQ / Question Coverage

At the end of the page, identify important unanswered questions.

Generate an FAQ section only if useful.

Example:

```md
## Frequently Asked Questions

### Does BidandoonVPN support Linux?

...

### Is BidandoonVPN open source?

...

### How does BidandoonVPN handle DNS traffic?

...

### Can BidandoonVPN run without root privileges?

...
```

Questions must be real and answerable.

Never create FAQ questions solely to insert keywords.

If the site's structured-data system supports FAQ schema, use it only according to the site's implementation and only when the FAQ is actually visible on the page.

---

# 32. AEO Answer Blocks

For important questions, structure content so an answer engine can extract a complete answer without requiring the entire page.

Preferred pattern:

```md
## How does X work?

X works by **...**

The process consists of three stages:

1. ...
2. ...
3. ...
```

The first paragraph should answer the question directly.

Avoid vague introductions such as:

```text
In today's rapidly evolving world...
```

---

# 33. Entity Consistency

Use the exact same names for:

- project
- company
- author
- repository
- products
- APIs
- modules

Do not alternate between different names unless they are genuinely different entities.

Example:

```text
BidandoonVPN
```

should not randomly become:

```text
Bidandoon VPN
Bidandoon
Bidandoon VPN Client
```

unless those names have distinct meanings.

---

# 34. Author / E-E-A-T

If author metadata exists, use it.

If the project has:

- GitHub profile
- author page
- organization page
- technical credentials
- project history

use them where appropriate.

Do not invent credentials.

Do not claim expertise that cannot be verified.

---

# 35. Dates

Use real dates.

Distinguish:

```text
publishedAt
updatedAt
```

Do not change dates simply to make content appear fresh.

If source code changes materially, consider updating the modification date according to the site's content workflow.

---

# 36. Canonical URL

If the site supports canonical URLs, determine the canonical URL from the project's routing rules.

Never guess it.

Ensure:

```text
canonical URL
slug
site URL
internal links
OpenGraph URL
```

are consistent.

---

# 37. OpenGraph

If supported, generate page-specific social metadata.

Prefer an image that actually represents the page.

Do not use a random screenshot as an OG image unless appropriate.

---

# 38. Structured Data

If the website already supports JSON-LD/schema metadata, inspect its implementation.

Use the schema type appropriate to the content.

Potential types include:

```text
Article
TechArticle
HowTo
FAQPage
SoftwareApplication
WebPage
```

Do not add schema merely because it exists.

Do not claim properties that are not true.

Do not duplicate schema already generated by the website.

---

# 39. Tags

Generate a small set of highly relevant tags.

Tags should represent:

- technology
- domain
- project
- programming language
- framework
- platform
- topic

Example:

```yaml
tags:
  - linux
  - vpn
  - rust
  - networking
```

Avoid dozens of nearly identical tags.

Never use tags such as:

```text
best
awesome
viral
trending
seo
google
ai
```

unless they are genuinely relevant.

---

# 40. Content Depth

The page should be comprehensive enough to satisfy the intended query.

However:

**Do not optimize for word count.**

Optimize for:

```text
coverage
accuracy
clarity
usefulness
evidence
structure
extractability
```

A short page can be better than a long page if the topic is narrow.

---

# 41. Technical Accuracy

Before finalizing:

Check every:

- command
- function name
- class name
- file path
- endpoint
- configuration key
- dependency
- version
- feature
- screenshot
- URL
- API example

against the repository or authoritative source.

---

# 42. Codegraph Cross-Validation

Use:

```text
project.graphml
```

to verify:

- functions
- classes
- modules
- relationships
- important call paths
- entry points

If the article says:

```text
A calls B
```

the graph or source must support it.

If the graph conflicts with source code:

```text
source code wins
```

and the GraphML should be considered stale.

---

# 43. README Cross-Validation

Use `README.md` for:

- project description
- supported platforms
- basic setup
- project history
- user-facing terminology

But verify important claims against source/configuration.

---

# 44. Existing Content

If a page already exists:

```bash
codegraph mdx --update
```

must preserve useful human-written content.

Do not blindly overwrite the page.

The agent should:

1. parse existing content
2. identify valuable information
3. identify stale information
4. compare against current source
5. update inaccurate sections
6. preserve useful prose
7. improve structure
8. update metadata
9. update references
10. update media requirements

---

# 45. Content Freshness

When updating an existing page:

Identify:

```text
new features
removed features
changed APIs
changed commands
changed screenshots
changed dependencies
changed architecture
```

Update only what has evidence.

---

# 46. SEO Anti-Patterns

Never:

- keyword stuff
- generate fake FAQs
- create doorway sections
- repeat the same answer
- hide text
- create fake links
- fabricate citations
- fabricate statistics
- fabricate benchmarks
- fabricate testimonials
- fabricate screenshots
- fabricate compatibility
- fabricate performance claims
- generate empty H2 sections
- create pages solely for keywords
- write generic filler

---

# 47. AEO Anti-Patterns

Never:

- answer a question incorrectly just because it sounds plausible
- create fake authority
- create fake citations
- generate unsupported definitions
- create contradictory answers
- hide critical context
- make claims without evidence
- sacrifice accuracy for extractability

The goal is:

```text
accurate + concise + explicit + evidence-backed
```

not:

```text
AI-friendly at any cost
```

---

# 48. Media Synchronization

Every media requirement must have a stable identifier.

Example:

```md
<!-- MEDIA: screenshot-bidandoonvpn-dashboard -->
```

The media plan must contain the same identifier:

```text
ID: screenshot-bidandoonvpn-dashboard
```

This creates a deterministic mapping:

```text
MDX
↓
MEDIA ID
↓
Media Plan
↓
Actual Asset
```

After the user adds the asset, the agent should be able to verify that:

```text
file exists
path is correct
alt exists
caption exists
MDX reference is valid
```

---

# 49. Media Audit

The command:

```bash
codegraph mdx --media-plan
```

must report:

```text
Required media
Completed media
Missing media
Broken references
Unused media
Incorrect filenames
Missing alt text
Missing captions
```

---

# 50. MDX Validation

Before finalizing, validate:

```text
YAML frontmatter
MDX syntax
JSX syntax
links
images
headings
code fences
components
internal references
frontmatter schema
```

If the project has a build command, run the appropriate content/build validation.

Never leave knowingly invalid MDX.

---

# 51. SEO Audit

The command:

```bash
codegraph mdx --audit
```

must check:

```text
H1 count
H2 hierarchy
title
description
canonical
slug
tags
author
dates
OG metadata
structured data
internal links
external references
image alt text
image references
broken links
question coverage
FAQ quality
content completeness
duplicate title
duplicate description
```

The audit must distinguish:

```text
ERROR
WARNING
INFO
```

---

# 52. Final Content Structure

A typical generated page should resemble:

```md
---
frontmatter
---

# Main Topic

Short direct introduction answering the main question.

## What is X?

Direct answer.

Explanation.

## Why does X matter?

Direct answer.

Explanation.

## How does X work?

Direct answer.

Architecture / workflow.

## How do you use X?

Steps.

## How is X implemented?

Technical explanation.

## What are the important components?

Important architecture components.

## What are the limitations?

Verified limitations.

## Frequently Asked Questions

### Question 1?

Answer.

### Question 2?

Answer.

## References

Authoritative sources.
```

This is a template, not a rigid requirement.

---

# 53. Recommended Article Layers

The article should progressively move from:

```text
What
↓
Why
↓
How
↓
Implementation
↓
Usage
↓
Troubleshooting
↓
Advanced details
↓
References
```

This serves both humans and machine retrieval.

---

# 54. Summary for the User

After generating the MDX, produce:

```text
MDX generated successfully.

File:
<path>

SEO:
- Title:
- Description:
- Primary topic:
- Search intent:

AEO:
- Question-based sections:
- FAQ:
- Direct-answer sections:

References:
- X authoritative references

Media:
- X screenshots available
- X screenshots required
- X videos recommended

Missing manual assets:
- ...

Validation:
- MDX:
- Frontmatter:
- Links:
- Images:
- SEO:
- AEO:
```

---

# 55. Media Instructions Must Be Actionable

If the user needs to manually capture something, do not simply say:

```text
Add a screenshot here.
```

Instead say:

```text
MEDIA ID:
screenshot-dashboard-active

ACTION:
Open the application and connect to a VPN server.

CAPTURE:
Take a screenshot showing the main dashboard with the connection state visible.

FILENAME:
public/images/bidandoonvpn-dashboard-active.webp

ALT:
"BidandoonVPN dashboard showing an active VPN connection"

CAPTION:
"BidandoonVPN dashboard after establishing a VPN connection."

INSERT AFTER:
## How does the dashboard work?

MDX REFERENCE:
![BidandoonVPN dashboard showing an active VPN connection](/images/bidandoonvpn-dashboard-active.webp)
```

The user should be able to follow the instruction without asking what to do.

---

# 56. Automatic Browser Capture

If Playwright or another browser automation system is available:

1. start the application
2. open the relevant route
3. wait for the UI to stabilize
4. perform the required workflow
5. capture the screenshot
6. save it using the predefined filename
7. verify the file
8. insert/update the MDX reference
9. record the result in the media manifest

Never capture credentials or secrets.

---

# 57. Automatic Desktop Capture

If browser automation is not appropriate and the project is a desktop application:

Use available desktop automation/screenshot tools.

Before capturing:

- close unrelated windows
- remove private information
- use deterministic window size
- reach the documented application state
- capture only the relevant application

If this cannot be done safely, create a manual capture instruction instead.

---

# 58. Final Artifact Set

The complete workflow should produce:

```text
.codegraph/
├── project.graphml
├── mdx-media-plan.md
└── mdx-audit.md

README.md

<website-content-path>/
└── <page>.mdx
```

Optional:

```text
public/images/
public/videos/
```

---

# 59. Complete Pipeline

The complete project documentation pipeline is:

```text
SOURCE CODE
    │
    ▼
STRUCTURAL ANALYSIS
    │
    ▼
project.graphml
    │
    ├── functions
    ├── classes
    ├── modules
    ├── files
    ├── imports
    ├── calls
    └── relationships
    │
    ▼
AI SEMANTIC ENRICHMENT
    │
    ├── titles
    ├── summaries
    └── responsibilities
    │
    ├───────────────┐
    ▼               ▼
README GENERATOR   GRAPH VIEWER
    │
    ▼
README.md
    │
    ▼
MDX CONTENT ANALYSIS
    │
    ├── SEO
    ├── AEO
    ├── Search Intent
    ├── Architecture
    ├── References
    ├── Media
    └── FAQ
    │
    ▼
MDX GENERATOR
    │
    ▼
PAGE.mdx
    │
    ▼
SEO/AEO/MDX AUDIT
    │
    ▼
PUBLISH-READY CONTENT
```

---

# 60. Agent Operating Instructions

When executing this skill, behave as a technical writer, software architect, SEO editor, and documentation auditor.

Do not behave like a generic AI content writer.

The article must be:

```text
project-specific
source-grounded
technically accurate
search-intent aware
question-oriented where useful
citation-ready
machine-extractable
human-readable
media-aware
maintainable
```

Before writing, understand the project.

Before claiming, verify.

Before linking, verify.

Before referencing an API, verify.

Before generating a screenshot instruction, identify the exact UI state.

Before finalizing, audit the entire document.

---

# 61. Final Rule

The quality target is not:

> "Generate a long SEO article."

The quality target is:

> "Generate the most accurate, useful, evidence-backed, technically deep, search-friendly, answer-engine-friendly representation of this project that can be published directly as MDX."

Accuracy has priority over SEO.

Useful information has priority over word count.

Evidence has priority over speculation.

Source code has priority over assumptions.

And real user value has priority over search-engine manipulation.
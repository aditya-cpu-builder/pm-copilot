---
name: generate-prd
description: PRD generation skill for Payments Subdomains
context: fork
allowed_tools:
  - coda_grep
  - coda_fetch
  - figma_fetch
  - write_file
---
# PRD Generation Guide
1. Identify missing context using `coda_grep`.
2. Fetch relevant docs.
3. Generate adaptive form for missing details.
4. Output outline for approval.
5. Write and save to `/workspace/prds/`.

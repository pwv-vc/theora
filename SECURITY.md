# Security Policy

## Scope

Theora is a local knowledge base tool. It is designed to run on your own machine and is not intended to be exposed to the public internet. The security model assumes you control what you ingest.

## Known Risks

### Prompt Injection

Theora passes document content directly to an LLM. A malicious document could contain text designed to manipulate the LLM's output — for example, instructions to generate misleading wiki articles or harmful chart code. This is mitigated by wrapping source content in XML-style delimiters (`<source_content>`, `<wiki_articles>`) and instructing the model to treat that content as data, not commands. However, prompt injection cannot be fully prevented at the prompt level.

**Mitigation:** Only ingest content from sources you trust.

### Chart Code Execution

`theora ask --output chart` generates Python code using the LLM and executes it on your machine with your full user privileges. The generated code is validated against an import allowlist (matplotlib, numpy, standard library) and scanned for disallowed patterns (subprocess, os.system, eval, etc.) before execution. A 30-second timeout is enforced.

**Mitigation:** Only use `--output chart` with trusted knowledge bases. Review the generated `.py` file in `output/` before re-running it manually.

### URL Ingestion (SSRF)

`theora ingest <url>` fetches the URL server-side. Private IP ranges, localhost, and cloud metadata endpoints (e.g., `169.254.169.254`) are blocked before fetching. Response size is capped at 50 MB.

**Mitigation:** Only ingest URLs from sources you trust.

### Web Server Authentication

The `theora web` server has no authentication. Anyone who can reach the server port can read your wiki, trigger LLM calls (at your API cost), and upload files. The server is intended for local use only.

**Mitigation:** Do not expose the web server port to untrusted networks. Bind to `localhost` only (the default).

## Mitigations Implemented

| Risk | Mitigation |
|------|-----------|
| Path traversal via file upload | `basename()` strips directory components; `safeJoin()` enforces containment |
| Path traversal via `--tag` | Tag validated against `^[a-z0-9][a-z0-9-]*$` before use as directory name |
| LLM concept slug path traversal | `slugify()` applied to all LLM-generated slugs before file write |
| Web route path traversal | Slug validated against `^[a-z0-9][a-z0-9-]*$` before `path.join()` |
| XSS in rendered wiki | `sanitize-html` applied to all `marked.parse()` output server-side |
| XSS in mermaid diagrams | `token.text` HTML-escaped; mermaid `securityLevel: 'strict'` |
| XSS in ask answer (client) | `DOMPurify.sanitize()` wraps `marked.parse()` output before `innerHTML` |
| XSS in stats live tailer | `textContent` per cell instead of `row.innerHTML` |
| Shell injection in slides | `execFileSync` with argument array instead of `execSync` with shell string |
| Chart code execution | Import allowlist + disallowed pattern check + 30s timeout |
| SSRF via URL fetch | Private IP range check before fetch; 50 MB response size cap |
| Prompt injection | XML delimiters around source content; explicit instruction to treat as data |
| YAML frontmatter injection | Quotes and newlines escaped in user question before YAML embedding |
| Filesystem path disclosure to LLM | Only filename (not full path) sent to chart prompt |
| Missing HTTP security headers | Hono `secureHeaders()` middleware: CSP, X-Frame-Options, X-Content-Type-Options |
| CDN supply chain | SRI `integrity` hashes on all CDN `<script>` tags |

## Reporting

This is an open-source local tool. If you find a security issue, please open a GitHub issue or contact the maintainers directly.

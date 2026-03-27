# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x (main branch) | Yes |

## Reporting a vulnerability

Please **do not** report security-sensitive issues in public GitHub issues.

1. In this GitHub repository: **Security** tab → **Report a vulnerability** (private advisory), **or**
2. Contact repository maintainers privately (e.g. email on their GitHub profile) with subject: `SECURITY: market-intelligence-dashboard`.

Include steps to reproduce, affected versions, and impact if known.

## Scope and expectations

- This app makes **outbound HTTPS** requests to FRED, Yahoo Finance (via `yahoo-finance2`), Polygon.io, and Anthropic when configured.
- It does **not** implement user accounts or store end-user credentials.
- The main deployment risks are **exposed API keys** in environment variables and **misconfigured** public deployments.

We will treat valid reports seriously and coordinate disclosure.

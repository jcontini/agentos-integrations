# Security Policy

## Supported Versions

We actively support security updates for the current version of the AgentOS community integrations.

## Reporting a Vulnerability

**Do not open a public issue** for security vulnerabilities.

Instead, please email security concerns to: **agentos@contini.co**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours and work with you to address the issue before public disclosure.

## Security Considerations

### Plugin Credentials

Plugins handle API credentials through AgentOS's credential management system. **Never**:

- Hardcode credentials in plugin YAML
- Use `$AUTH_TOKEN` or `${AUTH_TOKEN}` patterns
- Include `curl`/`wget` commands with authorization headers
- Interpolate Bearer tokens directly (`Bearer $token`)

**Pre-commit hooks automatically block** these patterns. Use AgentOS executors (`rest:`, `graphql:`, `sql:`) which handle auth automatically.

### Plugin Validation

All plugins are validated before commit:
- Schema validation prevents malformed YAML
- Security checks block credential exposure patterns
- Test coverage ensures operations work as expected

### Best Practices

When contributing plugins:

1. **Use AgentOS auth system** — credentials are stored securely, not in plugin files
2. **Validate inputs** — use schema validation for parameters
3. **Handle errors gracefully** — don't expose sensitive info in error messages
4. **Test securely** — use test credentials, never production keys
5. **Review before commit** — pre-commit hooks catch common issues

## Scope

**In scope:**
- Vulnerabilities in plugin YAML configurations
- Credential exposure in plugin files
- Security issues in test files
- Schema validation bypasses
- Vulnerabilities in AgentOS core (we'll route internally)

**Out of scope:**
- Vulnerabilities in third-party services (report to service provider)
- Feature requests or general questions (use regular issues)

## Disclosure Policy

We follow responsible disclosure:
1. Report privately via email
2. We'll acknowledge within 48 hours
3. We'll work together to fix the issue
4. Public disclosure after fix is released (with your permission)

Thank you for helping keep the AgentOS community secure.

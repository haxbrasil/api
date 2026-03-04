# Contribution Guide

Pull requests, issues, and suggestions are welcome. This document defines the expected contribution flow.

## Development Workflow

### 1. Start with a task

- Start from an issue or a maintainer-aligned proposal.
- For non-trivial work, align with maintainers before implementation.

### 2. Define scope and features

- Define what is in scope and out of scope.
- Keep each pull request focused on a single scope.

### 3. Define the API contract in issue comments

- The implementor usually writes the Swagger YAML contract in issue comments.
- Maintainers must review and approve the contract.
- If the contract is not approved, implementation is not considered final.
- `docs/api/swagger.yaml` is automated and is not the contract-definition step.

### 4. Implement

- Keep your branch updated with `main`.
- Follow project conventions (formatting, naming, organization, tests).
- Avoid out-of-scope refactors.
- Update documentation when behavior changes.

### 5. Open a pull request

- Target `main`.
- Use a clear title and description.
- Explain what changed, why, and how to test.
- Reference the related issue (for example, `#123`).

### 6. Review and iterate

- Address maintainer feedback with clear revisions.
- Keep discussion technical and respectful.
- Fix all CI failures before requesting final approval.

### 7. Merge

- Merge only after maintainer approval and green CI.

## Issues

### Bug reports

Include:

- problem description
- reproduction steps
- expected and current behavior
- version and operating system

### Feature requests

Include:

- clear problem statement
- proposed behavior
- why it aligns with project goals
- implementation notes when available

For non-trivial features, discuss with maintainers before starting.

## Pull Request Rules

- One pull request must cover one coherent scope.
- Large pull requests are acceptable when scope is coherent and reviewable.
- If you discover extra work outside scope, open a separate issue.
- For non-trivial performance changes, provide profiling/data.

## Review Conduct

- Review code, not authors.
- Be specific, constructive, and respectful.
- Maintainers make final merge decisions.

## License

By submitting code, documentation, or other contributions to this project, you agree that your contribution is licensed under the Creator Commercial License (CCL) v1.0 and that the creator receives the commercial rights described in the license.

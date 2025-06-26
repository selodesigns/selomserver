# Contributing to SELO Media Server

Thank you for your interest in contributing to SELO Media Server! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Pull Requests](#pull-requests)
- [Development Environment](#development-environment)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Review Process](#review-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/selomserver.git
   cd selomserver
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/selodesigns/selomserver.git
   ```
3. **Set up the development environment** by following the instructions in the [Development Guide](docs/DEVELOPMENT.md)
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## How to Contribute

### Reporting Bugs

Before reporting a bug, please check the existing issues to avoid duplicates. When reporting a bug, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Your environment details (OS, browser, etc.)
- Any relevant logs or error messages

Use the bug report template when creating a new issue.

### Suggesting Features

We welcome feature suggestions! When suggesting a feature:

- Use a clear, descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful to most users
- Consider including mockups or examples

Use the feature request template when creating a new issue.

### Pull Requests

1. Ensure your code follows our coding standards
2. Update documentation as needed
3. Include tests for new features or bug fixes
4. Ensure all tests pass
5. Make atomic commits with clear messages
6. Link any relevant issues in your PR description

Pull request template will guide you through the necessary information to include.

## Development Environment

See the [Development Guide](docs/DEVELOPMENT.md) for detailed instructions on setting up your development environment.

## Coding Standards

We follow specific coding standards to maintain consistency:

- **JavaScript/TypeScript**: We follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- **React**: Follow the [React best practices](https://reactjs.org/docs/thinking-in-react.html)
- **CSS**: Follow BEM naming convention for custom CSS
- **Linting**: Use ESLint and Prettier configurations provided in the repository

Run linting checks before submitting your contributions:
```bash
npm run lint
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types include:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to build process or tools

Example:
```
feat(streaming): add support for subtitle selection

- Added dropdown menu for subtitle selection
- Implemented subtitle switch without interrupting playback
- Updated tests

Closes #123
```

## Testing

All contributions should include appropriate tests:

- **Unit tests** for individual components and functions
- **Integration tests** for API endpoints and services
- **End-to-end tests** for critical user flows

Run tests before submitting:
```bash
npm test
```

## Documentation

Update documentation when making changes:

- Update API documentation for backend changes
- Update component documentation for frontend changes
- Add JSDoc comments to functions and methods
- Update relevant sections in the documentation files

## Review Process

Once you submit a pull request:

1. Maintainers will review your code
2. Automated tests will run
3. Changes may be requested
4. Once approved, your PR will be merged

Please be patient during the review process and be open to feedback.

## Community

Join our community:

- **GitHub Discussions**: For questions and discussions
- **Issue Tracker**: For bugs and feature requests
- **Discord**: For real-time communication

Thank you for contributing to SELO Media Server!

# SELO Media Server Development Guide

This document provides guidelines and information for developers contributing to the SELO Media Server project.

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Continuous Integration](#continuous-integration)
- [Documentation](#documentation)
- [Common Development Tasks](#common-development-tasks)

## Development Environment Setup

### Prerequisites

- Node.js v18.0.0 or higher
- npm v8.0.0 or higher
- Git
- FFmpeg v4.0 or higher
- A code editor (VS Code recommended)

### Setting Up the Development Environment

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/SELOMServer.git
   cd SELOMServer
   ```

2. Install dependencies
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. Create environment file
   ```bash
   cp config/example.env server/.env
   ```

4. Start the development server
   ```bash
   # In one terminal, start the backend
   cd server
   npm run dev
   
   # In another terminal, start the frontend
   cd web-client
   npm start
   ```

5. Access the development server at http://localhost:3000

### VS Code Configuration

We recommend using Visual Studio Code with these extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- React Developer Tools

For consistent formatting, use our VSCode settings:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Project Structure

```
SELOMServer/
├── server/             # Backend Node.js server
│   ├── api/            # API endpoints
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── db/             # Database models and migrations
│   ├── middleware/     # Express middleware
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   ├── web-client/     # Frontend React application
│   │   ├── public/     # Static files
│   │   ├── src/        # React source code
│   │   │   ├── components/  # React components
│   │   │   ├── contexts/    # React contexts
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── pages/       # Page components
│   │   │   ├── services/    # API services
│   │   │   └── utils/       # Utility functions
│   │   └── package.json     # Frontend dependencies
│   └── package.json    # Backend dependencies
├── scripts/            # Utility scripts
├── docs/               # Documentation
└── package.json        # Root dependencies
```

## Architecture Overview

SELO Media Server follows a client-server architecture:

### Backend

- **Framework**: Express.js
- **Language**: Node.js with JavaScript/TypeScript
- **Database**: SQLite (default), PostgreSQL/MySQL (optional)
- **Authentication**: JWT-based authentication
- **Media Processing**: FFmpeg for transcoding and thumbnail generation

### Frontend

- **Framework**: React
- **UI Library**: Material-UI
- **State Management**: React Context API
- **Routing**: React Router
- **API Communication**: Axios

### Data Flow

1. Client sends requests to the backend API
2. Express routes direct to appropriate controllers
3. Controllers use services to implement business logic
4. Services interact with database models and external services
5. Results are sent back to the client as JSON responses
6. React components render the UI based on the data

## Development Workflow

### Branching Strategy

We follow the Git Flow branching model:

- `main`: Production-ready code
- `develop`: Development branch for integrating features
- `feature/*`: Feature branches for new features
- `fix/*`: Bugfix branches
- `release/*`: Release preparation branches
- `hotfix/*`: Emergency fixes for production

### Development Process

1. Create a new branch from `develop` for your feature or fix
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit frequently
   ```bash
   git add .
   git commit -m "feat: descriptive message"
   ```

3. Keep your branch updated with `develop`
   ```bash
   git fetch
   git rebase origin/develop
   ```

4. Push your changes
   ```bash
   git push -u origin feature/your-feature-name
   ```

5. Create a pull request to the `develop` branch

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Changes to the build process or tools

## Coding Standards

### JavaScript/TypeScript

- We use ESLint with Airbnb preset for code linting
- TypeScript is preferred for new code
- Use async/await instead of raw promises
- Write JSDoc comments for all functions
- Follow the single responsibility principle

### React

- Use functional components with hooks
- Use React Context API for state management
- Follow the container/presentational component pattern
- Use React Router for navigation
- Keep components small and focused

### CSS

- Use Material-UI's styling system for components
- Follow BEM naming convention for custom CSS
- Use responsive design principles

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=UserService

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

- Unit tests: `*.test.js` files next to the code they test
- Integration tests: in the `tests/integration` directory
- End-to-end tests: in the `tests/e2e` directory

### Testing Libraries

- Jest for test running and assertions
- React Testing Library for component tests
- Supertest for API testing

## Building for Production

### Backend

```bash
cd server
npm run build
```

### Frontend

```bash
cd web-client
npm run build
```

### Full Build

```bash
npm run build
```

This will:
1. Build the frontend
2. Copy frontend build to server's public directory
3. Build the backend

## Continuous Integration

We use GitHub Actions for CI/CD:

- Code linting
- Running tests
- Building the application
- Deploying to staging/production environments

CI workflow is defined in `.github/workflows/ci.yml`.

## Documentation

### API Documentation

We use JSDoc for code documentation and OpenAPI (Swagger) for API documentation.

To generate API documentation:
```bash
npm run docs:api
```

This will create API documentation in the `docs/api` directory.

### Component Documentation

We use Storybook for documenting React components:

```bash
cd web-client
npm run storybook
```

Access Storybook at http://localhost:6006

## Common Development Tasks

### Adding a New API Endpoint

1. Create a new controller in `server/controllers`
2. Create corresponding service methods in `server/services`
3. Add routes in `server/api/routes`
4. Add validation middleware if needed
5. Update OpenAPI documentation
6. Add tests

### Creating a New React Component

1. Create a new component in `web-client/src/components`
2. Create a test file next to it
3. Create a Storybook story to showcase the component
4. Import and use the component where needed

### Adding a New Database Model

1. Create a model file in `server/db/models`
2. Create a migration if using a relational database
3. Add relationships to other models if needed
4. Create repository/service methods to interact with the model
5. Add tests for the model and services

### Updating Configuration Options

1. Add the new option to `server/config/default.js`
2. Update the environment variable handling in `server/config/index.js`
3. Update the `.env.example` file
4. Update the configuration documentation in `docs/CONFIGURATION.md`

### Debugging

#### Backend

For server debugging, use:
```bash
# For Windows
set DEBUG=selo:* & npm run dev

# For Linux/macOS
DEBUG=selo:* npm run dev
```

Or use the debugger in VS Code:
1. Set breakpoints in your code
2. Press F5 to start debugging
3. Select "Node.js" as the environment

#### Frontend

1. Use React Developer Tools browser extension
2. Use browser's built-in developer tools (F12)
3. Use `console.log` or `debugger` statements where needed

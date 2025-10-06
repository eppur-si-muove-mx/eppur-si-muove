# Shared Packages

This directory is reserved for shared code, utilities, and libraries that can be used across multiple services in the monorepo.

## Purpose

The `packages/` directory allows you to:

- **Share common utilities** between frontend and backend
- **Centralize type definitions** (TypeScript interfaces, Pydantic models)
- **Create reusable components** that work across services
- **Maintain DRY principles** (Don't Repeat Yourself)

## Potential Packages

### Future Additions

- **`@eppur/types`** - Shared TypeScript type definitions
- **`@eppur/ui-components`** - Reusable React components
- **`@eppur/utils`** - Common utility functions
- **`@eppur/constants`** - Shared constants and configurations
- **`@eppur/validators`** - Data validation schemas

## Structure Example

```
packages/
├── types/
│   ├── package.json
│   └── src/
│       └── exoplanet.ts
├── ui-components/
│   ├── package.json
│   └── src/
│       └── Button.tsx
└── utils/
    ├── package.json
    └── src/
        └── formatters.ts
```

## Usage

Once created, packages can be referenced in `package.json`:

```json
{
  "dependencies": {
    "@eppur/types": "workspace:*",
    "@eppur/ui-components": "workspace:*"
  }
}
```

## Notes

- Currently empty - add packages as needed
- Consider using a package manager that supports workspaces (npm, yarn, pnpm)
- Keep packages focused and single-purpose

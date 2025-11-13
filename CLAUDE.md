# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 project using React 19, TypeScript, and Tailwind CSS v4. The project integrates shadcn/ui components with the "new-york" style variant and uses Lucide React for icons.

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

## Architecture

### Framework & Routing
- **Next.js App Router**: Uses the `app/` directory structure (not pages router)
- **React Server Components (RSC)**: Enabled by default (rsc: true in components.json)
- Hot module replacement works automatically in dev mode

### Styling
- **Tailwind CSS v4**: Using PostCSS plugin (@tailwindcss/postcss)
- **CSS Variables**: Enabled for theming (cssVariables: true)
- **Base Color**: Slate
- Global styles: `app/globals.css`

### shadcn/ui Integration
- **Style variant**: "new-york"
- **Path aliases** (defined in components.json and tsconfig.json):
  - `@/components` → components directory
  - `@/components/ui` → UI components from shadcn
  - `@/lib/utils` → utility functions
  - `@/hooks` → custom hooks
- **Utility function**: `cn()` in `lib/utils.ts` for conditional className merging (clsx + tailwind-merge)
- Add new components using shadcn CLI or MCP tools

### TypeScript Configuration
- **Path mapping**: `@/*` maps to project root
- **Strict mode**: Enabled
- **Target**: ES2017
- **JSX**: react-jsx (not preserve)

## Important Notes

### MCP Configuration
- `.mcp.json` is gitignored for local development
- This file contains MCP server configurations for Claude Code
- Each developer should maintain their own local MCP setup

### Git Workflow
- Remote: https://github.com/kimdobinn/TASK
- Main branch: `main`
- Commit messages: Use clean, descriptive messages without tool attributions

### Dependencies
- Core: next@16.0.1, react@19.2.0, react-dom@19.2.0
- UI: class-variance-authority, clsx, lucide-react, tailwind-merge
- Dev: TypeScript 5, ESLint 9, Tailwind CSS 4

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

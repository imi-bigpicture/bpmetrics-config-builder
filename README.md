# bpmetrics Config Builder

A standalone explorer for Bigpicture MSMdad and XSD schemas — browse entities and attributes and export your selection as JSON. Originally developed as a byproduct of the bpmetrics task; it is not functionally tied to it.

## Features

- Parse and visualize MSMdad XML schemas
- Parse and visualize XSD schema definitions
- Select entities and attributes for metadata extraction
- Export your selection as JSON
- Interactive reference graph visualization

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
npm test
```

Runs the Vitest suite (also run in CI on every push/PR to `main`, alongside lint and build).

## Deployment

This is a fully static, client-side-only application — there is no backend, database, or authentication, and no environment variables to configure. `npm run build` produces static assets in `dist/`, which can be served from any static host (e.g. GitHub Pages, Netlify, Vercel, S3/CloudFront, nginx).

One requirement: the app uses client-side routing (`react-router-dom`'s `BrowserRouter`), so the host must rewrite all unmatched paths to `index.html` (an SPA fallback rule). Without this, refreshing or deep-linking to a non-root route will 404.

Note: how the previous live deployment was actually built and shipped isn't captured anywhere in this repository (no `vercel.json`, `netlify.toml`, or deploy-step GitHub Action) — CI here runs lint/typecheck/test/build, not deploy. Whoever hosts this next will need to set up their own deploy step.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — how schema fetching, parsing, and config generation actually work.
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) — documented technical debt and gaps, and why each was left as-is rather than guessed at.

## Project Structure

```
src/
├── components/     # React components
├── pages/          # Page components
├── services/       # Data fetching and parsing services
├── types/          # TypeScript type definitions
├── hooks/          # Custom React hooks
└── lib/            # Utility functions
```

## Author

Originally created and authored by Emre Balsever. Contributed to the imi-bigpicture organization as an open-source project ([imi-bigpicture/bpmetrics-config-builder](https://github.com/imi-bigpicture/bpmetrics-config-builder)); see [LICENSE](LICENSE) for the copyright notice.

## License

Apache License 2.0 — see [LICENSE](LICENSE).

## Note

This codebase was developed with the assistance of AI coding tools.

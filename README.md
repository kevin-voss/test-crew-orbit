# Simple Bun React App

A simple React application built with Bun, a fast all-in-one JavaScript runtime and package manager.

## Project Structure

- `package.json` - Project dependencies and scripts
- `bunfig.toml` - Bun configuration file
- `index.tsx` - Main React component entry point
- `index.html` - HTML template file
- `dist/` - Build output directory (generated)

## Dependencies

- **react** (^18.2.0) - React library for building user interfaces
- **react-dom** (^18.2.0) - React DOM bindings for the browser

## Development

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

```bash
bun install
```

### Build

```bash
bun run build
```

This will compile the TypeScript/JSX code and bundle it into `dist/index.js`.

### Development

```bash
bun run dev
```

This will run the application in development mode.

## Features

- Built with React 18
- TypeScript support via Bun
- Fast bundling with Bun
- Simple and clean component structure
- Responsive styling

## How It Works

1. Bun reads the configuration from `bunfig.toml`
2. The entry point is `index.tsx`, which imports React and ReactDOM
3. The React app renders to the element with id `app` in `index.html`
4. The bundled output is generated in `dist/index.js`
5. The HTML file references the bundled JavaScript

## Notes

- The build target is set to "browser" in `bunfig.toml`
- TypeScript is automatically supported by Bun
- No additional build tools or configuration needed

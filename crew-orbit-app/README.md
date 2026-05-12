# Crew Orbit App

Pure frontend React application scaffold with Bun, Vite, and React.

## Overview

This is a minimal, clean React application foundation built with modern tools:
- **React** 18+ for UI
- **Vite** for build tooling and dev server
- **Bun** for dependency management and running scripts

The app is ready for adding advanced features in later iterations:
- Zustand for state management
- shadcn for component library
- Tailwind CSS for styling
- Chart libraries for data visualization

## Prerequisites

- [Bun](https://bun.sh) (v1.0.0 or higher)
  - [Install Bun](https://bun.sh/docs/installation)

## Setup

1. **Navigate to the app directory:**
   ```bash
   cd crew-orbit-app
   ```

2. **Install dependencies with Bun:**
   ```bash
   bun install
   ```

## Running the App

### Development Server

Start the local development server:

```bash
bun run dev
```

The app will open at `http://localhost:5173` (or another port if 5173 is in use). The browser will automatically reload when you make changes.

### Production Build

Create an optimized production build:

```bash
bun run build
```

Output is in the `dist/` directory.

### Preview Build

Preview the production build locally:

```bash
bun run preview
```

## Project Structure

```
crew-orbit-app/
├── src/
│   ├── App.jsx        # Main application component
│   └── main.jsx       # React entry point
├── index.html         # HTML template
├── vite.config.js     # Vite configuration
├── package.json       # Dependencies and scripts
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## Next Steps

Once the baseline is verified, you can enhance the app by:
1. Adding Zustand for state management
2. Integrating Tailwind CSS for styling
3. Setting up shadcn for pre-built UI components
4. Adding chart libraries for data visualization
5. Building feature components and views

## Troubleshooting

**Port already in use:**
If port 5173 is already in use, Vite will automatically try the next available port.

**Bun not recognized:**
Make sure Bun is properly installed and in your PATH:
```bash
bun --version
```

**Dependency issues:**
Clear the node_modules and lockfile, then reinstall:
```bash
rm -rf node_modules bun.lockb
bun install
```

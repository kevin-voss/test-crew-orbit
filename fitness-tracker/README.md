# Fitness Tracker

A frontend-only React fitness tracking application built with Bun, Vite, Zustand, Tailwind CSS, and shadcn/ui components.

## Project Structure

```
fitness-tracker/
├── src/
│   ├── components/        # Reusable UI components
│   ├── store/            # Zustand store for state management
│   ├── views/            # Page components (Week View, Analytics)
│   ├── layout/           # Layout shell (Header, Sidebar)
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles with Tailwind
├── public/               # Static assets
├── index.html           # HTML template
├── vite.config.js       # Vite build configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── package.json         # Project dependencies
└── README.md           # This file
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0.0 or higher)
- A modern web browser

### Installation

1. Navigate to the project directory:
   ```bash
   cd fitness-tracker
   ```

2. Install dependencies using Bun:
   ```bash
   bun install
   ```

### Running the App Locally

Start the development server:
```bash
bun run dev
```

The app will automatically open in your default browser at `http://localhost:5173`. The page will reload when you make changes to the code.

### Building for Production

Create a production build:
```bash
bun run build
```

The built files will be output to the `dist/` directory.

### Previewing the Production Build

Preview the production build locally:
```bash
bun run preview
```

## Architecture & Features

### State Management (Zustand)

The app uses Zustand for global state management. The main store is located in `src/store/appStore.js`:

```javascript
const { workouts, addWorkout, preferences } = useAppStore()
```

**Slices available:**
- **Workouts**: Add, update, and remove workout entries
- **Analytics**: Store computed analytics data
- **Preferences**: User settings (theme, units, etc.)

### Styling (Tailwind CSS)

The project includes a pre-configured Tailwind CSS setup with custom color schemes that support light and dark modes. Component shadcn/ui can be installed when needed.

### Layout

- **Header**: Top navigation bar with app title and settings
- **Sidebar**: Main navigation with links to Week View and Analytics
- **Main Content Area**: Where views will be rendered

## Future Tasks

### Week View
Implement a weekly workout display showing:
- Daily workout entries
- Exercise details (name, duration, calories, etc.)
- Add/edit/delete functionality

### Analytics
Build analytics dashboard featuring:
- Weekly activity charts (using shadcn charts)
- Progress metrics
- Workout summary statistics

### shadcn/ui Components

To add shadcn/ui components, you can customize and add them to `src/components/ui/`. Components should be configured based on the design system.

## Development Tips

### Adding a New Component

1. Create a component file in `src/components/`:
   ```jsx
   // src/components/WorkoutCard.jsx
   export default function WorkoutCard({ workout }) {
     return <div className="...">...</div>
   }
   ```

2. Import and use in your views

### Adding a New Store Slice

Extend the Zustand store in `src/store/appStore.js`:

```javascript
export const useAppStore = create((set) => ({
  // existing slices...
  newFeature: [],
  addToNewFeature: (item) => set((state) => ({
    newFeature: [...state.newFeature, item]
  })),
}))
```

### Using Tailwind CSS

All styles use utility classes:

```jsx
<div className="flex items-center justify-center h-screen bg-background text-foreground">
  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
    Click me
  </button>
</div>
```

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically use the next available port. Check the terminal output for the actual URL.

### Dependencies Not Installing

Ensure you're using Bun v1.0.0 or higher:
```bash
bun --version
```

To reinstall dependencies, remove and reinstall:
```bash
rm -rf node_modules
bun install
```

### Tailwind Styles Not Applied

Ensure the CSS file is imported in `src/main.jsx` and that the Tailwind content paths in `tailwind.config.js` match your file structure.

## Technologies

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Bun**: JavaScript runtime and package manager
- **Zustand**: State management
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible component library (ready for integration)

## License

Private project for internal use.

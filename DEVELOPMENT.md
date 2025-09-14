# Development Guide

This guide explains how to develop and test the React WebRTC Viewer component.

## Development Setup

### Quick Start

```bash
# Start the development server
npm run dev
```

This will start a Vite development server at `http://localhost:5173/` with a comprehensive demo application.

### What's Included

The development environment includes:

1. **Interactive Demo App** - A full-featured testing interface with:
   - Stream URL input and preset test URLs
   - Zoom/pan configuration controls
   - Real-time event logging
   - Responsive layout

2. **Hot Module Replacement (HMR)** - Changes to your component will be reflected instantly

3. **Local Component Development** - The demo directly uses your source code from `src/`, not the built version

## Directory Structure

```
react-webrtc-viewer/
├── src/                    # Your component source code
│   ├── WhepPlayer.jsx     # Main component
│   ├── index.js           # Export file
│   └── index.d.ts         # TypeScript definitions
├── example/               # Development demo app
│   ├── src/
│   │   ├── App.jsx        # Demo application
│   │   └── App.css        # Demo styles
│   └── vite.config.js     # Vite configuration with local alias
└── package.json           # Build scripts and dev shortcuts
```

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Make Changes to Your Component
Edit files in `src/` and see changes instantly in the demo app.

### 3. Test Different Scenarios
The demo app provides:
- Multiple test stream URLs
- Zoom/pan controls
- Event callback logging
- Error state testing

### 4. Build for Production
```bash
npm run build
```

## Demo App Features

### Configuration Panel
- **Stream URL**: Test with different WHEP stream endpoints
- **Zoom/Pan Toggle**: Enable/disable zoom and pan functionality
- **Max Zoom Slider**: Adjust maximum zoom level
- **Preset URLs**: Quick-test with predefined stream URLs

### Player Container
- Displays your WebRTC component
- Black background to highlight video content
- Responsive sizing

### Event Logs Panel
- Real-time logging of all component events
- Timestamps for debugging
- Clear logs functionality
- Shows connection status, errors, and state changes

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build library for production
npm run dev:setup    # Install example app dependencies
```

## Testing Different States

### Connection States
- **Valid Stream**: Use a real WHEP endpoint URL
- **Invalid URL**: Test error handling with `https://invalid-url`
- **Network Issues**: Test reconnection logic

### UI States
- **Loading**: Component shows loading spinner initially
- **Error**: Custom error display when stream fails
- **Zoom/Pan**: Interactive video controls when enabled

### Event Callbacks
Monitor these events in the logs panel:
- `onReady`: Player initialization complete
- `onStreamConnected`: WebRTC connection established
- `onStreamDisconnected`: Connection lost
- `onError`: General error handling
- `onStreamNotFound`: 404 stream not found
- `onStreamRecovered`: Reconnection successful

## Tips for Development

1. **Use Real Streams**: For best testing, use actual WHEP stream URLs
2. **Check Console**: Browser dev tools show additional debugging info
3. **Test Responsive**: Resize window to test mobile layouts
4. **Error Scenarios**: Use invalid URLs to test error states
5. **Network Simulation**: Use browser dev tools to simulate slow/offline conditions

## Hot Reloading

Changes to these files trigger instant updates:
- `src/WhepPlayer.jsx` - Your main component
- `src/index.js` - Component exports
- `example/src/App.jsx` - Demo application
- `example/src/App.css` - Demo styles

TypeScript definition changes in `src/index.d.ts` require a manual browser refresh.
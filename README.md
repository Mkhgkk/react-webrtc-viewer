# React WebRTC Viewer

[![CI](https://github.com/Mkhgkk/react-webrtc-viewer/workflows/CI/badge.svg)](https://github.com/Mkhgkk/react-webrtc-viewer/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/react-webrtc-viewer.svg)](https://badge.fury.io/js/react-webrtc-viewer)
[![npm downloads](https://img.shields.io/npm/dm/react-webrtc-viewer.svg)](https://www.npmjs.com/package/react-webrtc-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A React component for WebRTC live streaming with WHEP (WebRTC-HTTP Egress Protocol) support, featuring built-in zoom/pan functionality and customizable UI components.

## Installation

```bash
npm install react-webrtc-viewer
```

## Dependencies

This package requires the following peer dependencies:

```bash
npm install react react-dom video.js whip-whep
```

## Basic Usage

```jsx
import WhepPlayer from "react-webrtc-viewer";

function App() {
  return (
    <WhepPlayer
      url="https://example.com/live/stream/whep"
      onReady={(player) => console.log("Player ready:", player)}
      onError={(error) => console.error("Stream error:", error)}
    />
  );
}
```

## Features

- **WebRTC WHEP streaming** with automatic error handling and reconnection
- **Zoom and Pan** functionality for interactive video viewing
- **Customizable UI** components for loading, error, and reconnecting states
- **Event callbacks** for stream lifecycle management
- **TypeScript support** with full type definitions

## Props

### Basic Props

| Prop        | Type     | Default      | Description               |
| ----------- | -------- | ------------ | ------------------------- |
| `url`       | `string` | **required** | WHEP stream URL           |
| `options`   | `object` | `{}`         | Video.js player options   |
| `className` | `string` | `""`         | Additional CSS class name |

### Event Callbacks

| Prop                   | Type               | Description                    |
| ---------------------- | ------------------ | ------------------------------ |
| `onReady`              | `(player) => void` | Called when player is ready    |
| `onError`              | `(error) => void`  | Called on general errors       |
| `onStreamNotFound`     | `(event) => void`  | Called when stream returns 404 |
| `onStreamRecovered`    | `(event) => void`  | Called when stream recovers    |
| `onStreamConnected`    | `(event) => void`  | Called when stream connects    |
| `onStreamDisconnected` | `(event) => void`  | Called when stream disconnects |
| `onForbidden`          | `(event) => void`  | Called on 403 errors           |
| `onServerError`        | `(event) => void`  | Called on 500 errors           |

### Zoom/Pan Props

| Prop            | Type      | Default | Description                       |
| --------------- | --------- | ------- | --------------------------------- |
| `enableZoomPan` | `boolean` | `false` | Enable zoom and pan functionality |
| `maxZoom`       | `number`  | `10`    | Maximum zoom level                |
| `zoomStep`      | `number`  | `0.05`  | Zoom step per scroll              |

### Custom UI Props

| Prop                 | Type                                | Description                              |
| -------------------- | ----------------------------------- | ---------------------------------------- |
| `renderLoading`      | `() => ReactNode`                   | Custom loading spinner component         |
| `renderError`        | `({ error, onRetry }) => ReactNode` | Custom error display component           |
| `renderReconnecting` | `() => ReactNode`                   | Custom reconnecting display component    |
| `customSpinnerCSS`   | `string`                            | Custom CSS for Video.js internal spinner |
| `messages`           | `object`                            | Custom messages for internationalization |

## Advanced Usage

### With Zoom/Pan

```jsx
<WhepPlayer
  url="https://example.com/live/stream/whep"
  enableZoomPan={true}
  maxZoom={5}
  zoomStep={0.1}
  onReady={(player) => console.log("Player ready")}
/>
```

### With Custom UI Components

```jsx
<WhepPlayer
  url="https://example.com/live/stream/whep"
  renderLoading={() => <div>Custom loading...</div>}
  renderError={({ error, onRetry }) => (
    <div>
      <h3>Oops! {error}</h3>
      <button onClick={onRetry}>Try Again</button>
    </div>
  )}
  renderReconnecting={() => <div>Reconnecting to stream...</div>}
/>
```

### With Custom Video.js Spinner

Customize the internal Video.js loading spinner:

```jsx
<WhepPlayer
  url="https://example.com/live/stream/whep"
  customSpinnerCSS={`
    .video-js .vjs-custom-spinner::after {
      border: 6px solid #f3f3f3;
      border-top: 6px solid #ff6b6b;
      width: 60px;
      height: 60px;
      animation: vjs-spin 1s linear infinite;
    }
    
    .video-js .vjs-custom-spinner {
      width: 60px;
      height: 60px;
    }
    
    @keyframes vjs-pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    /* Add pulsing effect */
    .video-js .vjs-custom-spinner::before {
      content: '📺';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      animation: vjs-pulse 1.5s ease-in-out infinite;
    }
  `}
/>
```

### With Internationalization (i18n)

Customize all text messages for different languages:

```jsx
// English (default)
const englishMessages = {
  loading: "Loading stream...",
  reconnecting: "Reconnecting...",
  streamError: "Stream Error",
  retry: "Retry",
  accessForbidden: "Stream access forbidden (403)",
  serverError: "Server error (500)",
  whepUrlRequired: "WHEP URL is required",
  failedToInitialize: "Failed to initialize WHEP stream",
};

// Spanish
const spanishMessages = {
  loading: "Cargando transmisión...",
  reconnecting: "Reconectando...",
  streamError: "Error de Transmisión",
  retry: "Reintentar",
  accessForbidden: "Acceso a la transmisión prohibido (403)",
  serverError: "Error del servidor (500)",
  whepUrlRequired: "Se requiere URL WHEP",
  failedToInitialize: "Error al inicializar transmisión WHEP",
};

// French
const frenchMessages = {
  loading: "Chargement du flux...",
  reconnecting: "Reconnexion...",
  streamError: "Erreur de Flux",
  retry: "Réessayer",
  accessForbidden: "Accès au flux interdit (403)",
  serverError: "Erreur du serveur (500)",
  whepUrlRequired: "URL WHEP requise",
  failedToInitialize: "Échec de l'initialisation du flux WHEP",
};

function App() {
  return (
    <WhepPlayer
      url="https://example.com/live/stream/whep"
      messages={spanishMessages}
    />
  );
}
```

### Integration with i18n Libraries

```jsx
import { useTranslation } from "react-i18next";
import WhepPlayer from "react-webrtc-viewer";

function I18nPlayer() {
  const { t } = useTranslation();

  const messages = {
    loading: t("player.loading"),
    reconnecting: t("player.reconnecting"),
    streamError: t("player.streamError"),
    retry: t("player.retry"),
    accessForbidden: t("player.accessForbidden"),
    serverError: t("player.serverError"),
  };

  return (
    <WhepPlayer url="http://localhost/live/stream1/whep" messages={messages} />
  );
}
```

### Dynamic Language Switching

```jsx
import { useState } from "react";
import WhepPlayer from "react-webrtc-viewer";

const translations = {
  en: {
    loading: "Loading stream...",
    reconnecting: "Reconnecting...",
    streamError: "Stream Error",
    retry: "Retry",
  },
  es: {
    loading: "Cargando transmisión...",
    reconnecting: "Reconectando...",
    streamError: "Error de Transmisión",
    retry: "Reintentar",
  },
  fr: {
    loading: "Chargement du flux...",
    reconnecting: "Reconnexion...",
    streamError: "Erreur de Flux",
    retry: "Réessayer",
  },
};

function MultiLanguagePlayer() {
  const [language, setLanguage] = useState("en");

  return (
    <div>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{ marginBottom: "10px" }}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
      </select>

      <WhepPlayer
        url="https://example.com/live/stream/whep"
        messages={translations[language]}
      />
    </div>
  );
}
```

### RTL Language Support

```jsx
const arabicMessages = {
  loading: "جاري تحميل البث...",
  reconnecting: "إعادة الاتصال...",
  streamError: "خطأ في البث",
  retry: "إعادة المحاولة",
  accessForbidden: "الوصول للبث محظور (403)",
  serverError: "خطأ في الخادم (500)",
};

function ArabicPlayer() {
  return (
    <div dir="rtl">
      <WhepPlayer
        url="http://localhost/live/stream1/whep"
        messages={arabicMessages}
        className="rtl-player"
      />
    </div>
  );
}
```

### Full Event Handling

```jsx
<WhepPlayer
  url="https://example.com/live/stream/whep"
  onStreamConnected={() => console.log("Stream started")}
  onStreamNotFound={() => console.log("Stream not available")}
  onStreamRecovered={() => console.log("Stream is back online")}
  onStreamDisconnected={() => console.log("Stream disconnected")}
  onForbidden={() => console.log("Access denied")}
  onServerError={() => console.log("Server error")}
/>
```

## Available Message Keys

For internationalization, you can customize the following message keys:

| Key                  | Default Value                      | Description                |
| -------------------- | ---------------------------------- | -------------------------- |
| `loading`            | "Loading stream..."                | Loading spinner text       |
| `reconnecting`       | "Reconnecting..."                  | Reconnecting state text    |
| `streamError`        | "Stream Error"                     | Error dialog title         |
| `retry`              | "Retry"                            | Retry button text          |
| `accessForbidden`    | "Stream access forbidden (403)"    | 403 error message          |
| `serverError`        | "Server error (500)"               | 500 error message          |
| `whepUrlRequired`    | "WHEP URL is required"             | Missing URL error          |
| `failedToInitialize` | "Failed to initialize WHEP stream" | Initialization error       |
| `videoPlayerError`   | "Video player error"               | General player error       |
| `connectionLost`     | "Connection lost"                  | Connection failure message |

## Default Components

The library exports default components that you can use independently:

```jsx
import { DefaultLoadingSpinner, DefaultErrorDisplay } from 'react-webrtc-viewer';

// Use the default components in your own layouts
<DefaultLoadingSpinner message="Please wait..." />
<DefaultErrorDisplay
  error="Connection failed"
  onRetry={() => window.location.reload()}
/>
```

## License

MIT

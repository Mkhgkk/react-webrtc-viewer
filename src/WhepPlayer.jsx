import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import { WHEPClient } from "whip-whep/whep.js";
import "./index.css";

const Plugin = videojs.getPlugin("plugin");
const ModalDialog = videojs.getComponent("ModalDialog");

const bitsUnitsStorage = ["bps", "kbps", "mbps", "gbps"];
const labelsByNumLayers = {
  2: ["High", "Low"],
  3: ["High", "Medium", "Low"],
  4: (activeLayers) =>
    activeLayers.map((layer) => {
      return formatBitsRecursive(layer.bitrate);
    }),
};

const formatBitsRecursive = (value, unitsStoragePosition = 0) => {
  const newValue = value / 1000;
  if (
    newValue < 1 ||
    (newValue > 1 && unitsStoragePosition + 1 > bitsUnitsStorage.length)
  ) {
    return `${Math.round(value * 100) / 100} ${
      bitsUnitsStorage[unitsStoragePosition]
    }`;
  } else if (newValue > 1) {
    return formatBitsRecursive(newValue, unitsStoragePosition + 1);
  }
};

// Create default Video.js spinner CSS
const getVjsSpinnerCSS = (customSpinnerCSS) => `
  /* Hide default Video.js loading spinner */
  .video-js .vjs-loading-spinner {
    display: none !important;
  }

  /* Custom loading spinner for Video.js */
  .video-js .vjs-custom-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    z-index: 1000;
  }

  .video-js .vjs-custom-spinner::after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #ffffff;
    border-radius: 50%;
    animation: vjs-spin 0.7s linear infinite;
  }

  @keyframes vjs-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Show spinner when Video.js is loading */
  .video-js.vjs-waiting .vjs-custom-spinner,
  .video-js.vjs-seeking .vjs-custom-spinner {
    display: block;
  }

  .video-js .vjs-custom-spinner {
    display: none;
  }

  /* Custom user styles */
  ${customSpinnerCSS || ""}
`;

// Function to inject or update spinner CSS
const injectSpinnerCSS = (customSpinnerCSS = "") => {
  if (typeof document === "undefined") return;

  let style = document.getElementById("vjs-custom-spinner-css");

  if (!style) {
    style = document.createElement("style");
    style.id = "vjs-custom-spinner-css";
    document.head.appendChild(style);
  }

  style.textContent = getVjsSpinnerCSS(customSpinnerCSS);
};

// Initialize with default CSS
injectSpinnerCSS();

// Default messages for i18n
const defaultMessages = {
  loading: "Loading stream...",
  reconnecting: "Reconnecting...",
  streamError: "Stream Error",
  retry: "Retry",
  connectionFailed: "Connection failed",
  streamNotFound: "Stream not found",
  accessForbidden: "Stream access forbidden (403)",
  serverError: "Server error (500)",
  whepUrlRequired: "WHEP URL is required",
  failedToInitialize: "Failed to initialize WHEP stream",
  videoPlayerError: "Video player error",
  connectionLost: "Connection lost",
};

class MillicastWhepPlugin extends Plugin {
  constructor(player, options) {
    super(player, options);

    // Work around to avoid using src method instead of srcObject
    player.src = () => {};

    this.url = options.url;
    this.wasConnected = false;
    this.retryTimeout = null;
    this.pc = null;
    this.whep = null;
    this.sessionUrl = "";

    this.modal = new ModalDialog(player, {
      temporary: false,
      label: "Offline",
      uncloseable: true,
    });

    player.addChild(this.modal);

    if (!this.url) {
      return;
    }

    this.vid = player.tech().el();
    player.play = () => {
      this.vid.play();
    };
    this.pause = () => {
      this.vid.pause();
    };

    // videojs.log("Before WHEP connection");
    this.millicastView();

    if (player.videoJsResolutionSwitcher) {
      player.videoJsResolutionSwitcher({
        ui: true,
        default: "auto",
        customSourcePicker: (p) => {
          return p;
        },
        dynamicLabel: true,
      });
    }

    this.auto = {
      src: this.url,
      type: "video/mp4",
      label: "Auto",
      res: "auto",
    };

    player.on("resolutionchange", () => {
      const encodingId = player.currentResolution().sources[0].res;
      this.selectLayer(encodingId);
    });
  }

  onError = (err) => {
    if (this.retryTimeout !== null) {
      return; // Already retrying
    }

    console.log("WHEP connection error:", err);
    if (this.player && typeof this.player.pause === "function") {
      this.player.pause();
    }

    // Check if error is HTTP-related (404, etc.)
    if (this.player) {
      if (err.includes("404") || err.includes("Not Found")) {
        this.player.trigger("whep:notfound", { error: err, url: this.url });
      } else if (err.includes("403")) {
        this.player.trigger("whep:forbidden", { error: err, url: this.url });
      } else if (err.includes("500")) {
        this.player.trigger("whep:servererror", { error: err, url: this.url });
      } else {
        this.player.trigger("whep:error", { error: err, url: this.url });
      }
    }

    // Clean up connection
    if (this.pc !== null) {
      this.pc.close();
      this.pc = null;
    }

    if (this.whep && typeof this.whep.stop === "function") {
      try {
        this.whep.stop();
      } catch (_e) {
        // Ignore cleanup errors
      }
    }

    // Schedule retry
    console.log("Retrying connection in 2 seconds...");
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      console.log("Attempting reconnection...");
      this.millicastView();
    }, 2000);
  };

  onConnectionState = () => {
    if (this.retryTimeout !== null) {
      return; // Already retrying
    }

    const state = this.pc.iceConnectionState;
    // console.log("ICE connection state:", state);

    if (state === "disconnected" || state === "failed") {
      if (this.player) {
        this.player.trigger("whep:disconnected", { state, url: this.url });
      }
      this.onError("Connection lost");
    }
  };

  onTrack = (evt) => {
    // console.log("Track received:", evt.track.kind);
    if (evt.streams && evt.streams[0]) {
      // console.log("Setting video srcObject:", evt.streams[0]);
      this.vid.srcObject = evt.streams[0];
      // console.log("Video element srcObject set:", this.vid.srcObject);
    }
  };

  millicastView = async () => {
    this.whep = new WHEPClient();

    try {
      this.pc = new RTCPeerConnection();
      this.pc.addTransceiver("video", {
        direction: "recvonly",
      });
      this.pc.addTransceiver("audio", {
        direction: "recvonly",
      });

      this.pc.oniceconnectionstatechange = this.onConnectionState;
      this.pc.ontrack = this.onTrack;

      await this.whep.view(this.pc, this.url);

      // console.log("WHEP connection successful");
      this.modal.close();

      if (this.player) {
        if (this.wasConnected) {
          // console.log("Reconnection - triggering whep:recovered");
          this.player.trigger("whep:recovered");
        } else {
          this.wasConnected = true;
          // console.log("First connection - triggering whep:connected");
          this.player.trigger("whep:connected");
        }

        // console.log("Attempting to play video...");
        try {
          await this.player.play();
          // console.log("Video play() successful");
        } catch (e) {
          console.log("Video play() failed:", e);
        }
      }

      try {
        const eventSource = await this.waitForEventSource();
        eventSource.addEventListener("layers", (event) => {
          const layerEvent = JSON.parse(event.data).medias[0];
          const currentActiveLayers = layerEvent.active;
          this.layers = layerEvent.layers;
          if (this.player.videoJsResolutionSwitcher) {
            this.updateQualityMenu(currentActiveLayers);
          }
        });
      } catch (e) {
        console.log("EventSource not available:", e);
      }
    } catch (error) {
      this.onError(error.toString());
    }
  };

  updateQualityMenu(activeLayers) {
    const qualityMenu = document.querySelector('[aria-label="Quality"] button');
    const length = activeLayers.length;

    if (length <= 1) {
      qualityMenu.disabled = true;
      qualityMenu.style.opacity = 0.5;
      qualityMenu.title = "Quality disabled";
    } else {
      qualityMenu.disabled = false;
      qualityMenu.style.opacity = 1;
      qualityMenu.title = "Quality";

      const labels =
        length > 3
          ? labelsByNumLayers[4](activeLayers)
          : labelsByNumLayers[length];
      const sources = [
        this.auto,
        ...activeLayers.map(({ id }, index) => ({
          src: this.url,
          type: "video/mp4",
          label: labels[index],
          res: id,
        })),
      ];
      if (this.player.videoJsResolutionSwitcher) {
        this.player.updateSrc(sources);
      }
    }
  }

  selectLayer = async (encodingId) => {
    const layerSelected =
      encodingId === "auto"
        ? {}
        : this.layers.filter((l) => l.encodingId === encodingId)[0];
    await this.whep.selectLayer(layerSelected);
  };

  waitForEventSource = async () => {
    return new Promise((resolve) => {
      if (this.whep.eventSource) {
        resolve(this.whep.eventSource);
      } else {
        setTimeout(() => {
          resolve(this.waitForEventSource());
        }, 1000);
      }
    });
  };
}

// Register the plugin globally
videojs.registerPlugin("MillicastWhepPlugin", MillicastWhepPlugin);

const WebRTCViewer = ({
  url,
  options = {},
  className = "",
  style = {},
  objectFit = "contain",
  onReady,
  onError,
  onStreamNotFound,
  onStreamRecovered,
  onStreamConnected,
  onStreamDisconnected,
  onForbidden,
  onServerError,
  enableZoomPan = false,
  maxZoom = 10,
  zoomStep = 0.05,
  renderLoading,
  renderError,
  renderReconnecting,
  customSpinnerCSS = "",
  messages = {},
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [transformOrigin, setTransformOrigin] = useState("0 0");

  // Merge default messages with user messages
  const finalMessages = { ...defaultMessages, ...messages };

  // Helper function to get message
  const getMessage = (key) => finalMessages[key] || defaultMessages[key];

  // Inject custom spinner CSS
  useEffect(() => {
    injectSpinnerCSS(customSpinnerCSS);
  }, [customSpinnerCSS]);

  // Handle wheel zoom
  useEffect(() => {
    if (!enableZoomPan) return;

    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 1 - zoomStep : 1 + zoomStep;
      const newZoom = Math.max(1, Math.min(maxZoom, zoom * zoomFactor));

      if (newZoom !== zoom) {
        if (newZoom === 1) {
          setZoom(1);
          setPanX(0);
          setPanY(0);
          setTransformOrigin("0 0");
        } else {
          // Set transform origin to mouse position for zooming at cursor
          setTransformOrigin(`${mouseX}px ${mouseY}px`);
          setZoom(newZoom);
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [enableZoomPan, zoom, panX, panY, maxZoom, zoomStep]);

  // Handle drag to pan
  useEffect(() => {
    if (!enableZoomPan) return;

    const container = containerRef.current;
    if (!container || zoom <= 1) return;

    const videoContainer = container.querySelector("[data-vjs-player]");
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startPanX = panX;
    let startPanY = panY;

    const handleMouseDown = (e) => {
      isDragging = true;
      isDraggingRef.current = true;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = panX;
      startPanY = panY;
      container.style.cursor = "grabbing";

      // Reset transform origin to 0,0 for smooth panning
      setTransformOrigin("0 0");
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const newPanX = startPanX + deltaX;
      const newPanY = startPanY + deltaY;

      if (videoContainer) {
        videoContainer.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${zoom})`;
        videoContainer.style.transition = "none";
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const finalPanX = startPanX + deltaX;
        const finalPanY = startPanY + deltaY;

        setPanX(finalPanX);
        setPanY(finalPanY);
      }

      isDragging = false;
      isDraggingRef.current = false;
      container.style.cursor = zoom > 1 ? "grab" : "default";
    };

    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    container.style.cursor = zoom > 1 ? "grab" : "default";

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [enableZoomPan, zoom, panX, panY]);

  // Initialize Video.js player only when URL changes
  useEffect(() => {
    if (!url) {
      setError(getMessage("whepUrlRequired"));
      setIsLoading(false);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Prevent double initialization by checking if Video.js is already on this element
    if (playerRef.current || videoElement.player) {
      return;
    }

    // Wait for the element to be in the DOM
    const initializePlayer = () => {
      if (!document.contains(videoElement)) {
        setTimeout(initializePlayer, 50);
        return;
      }

      const defaultOptions = {
        muted: true,
        controls: true,
        responsive: true,
        width: "100%",
        height: "100%",
        ...options,
        fluid: false,
      };

      const player = videojs(videoElement, defaultOptions);

      player.ready(() => {
        playerRef.current = player;
        setIsLoading(false);

        // Add custom spinner element
        const spinnerEl = document.createElement("div");
        spinnerEl.className = "vjs-custom-spinner";
        player.el().appendChild(spinnerEl);

        try {
          player.MillicastWhepPlugin({ url });
          onReady?.(player);
        } catch (err) {
          setError(err.message || getMessage("failedToInitialize"));
          onError?.(err);
        }
      });

      // Set up all the event listeners...
      player.on("error", () => {
        const playerError = player.error();
        const errorMessage = playerError
          ? playerError.message
          : getMessage("videoPlayerError");
        setError(errorMessage);
        onError?.(playerError);
      });

      // Listen for WHEP-specific events
      player.on("whep:notfound", (event) => {
        setError(null);
        setIsReconnecting(true);
        setIsLoading(false);
        onStreamNotFound?.(event);
      });

      player.on("whep:recovered", (event) => {
        setError(null);
        setIsLoading(false);
        setIsReconnecting(false);
        onStreamRecovered?.(event);
      });

      player.on("whep:connected", (event) => {
        setError(null);
        setIsLoading(false);
        setIsReconnecting(false);
        onStreamConnected?.(event);
      });

      player.on("whep:forbidden", (event) => {
        setError(getMessage("accessForbidden"));
        setIsReconnecting(false);
        setIsLoading(false);
        onForbidden?.(event);
      });

      player.on("whep:servererror", (event) => {
        setError(getMessage("serverError"));
        setIsReconnecting(false);
        setIsLoading(false);
        onServerError?.(event);
      });

      player.on("whep:error", (event) => {
        setError(null);
        setIsReconnecting(true);
        setIsLoading(false);
        onError?.(event);
      });

      player.on("whep:disconnected", (event) => {
        setError(null);
        setIsReconnecting(true);
        setIsLoading(false);
        onStreamDisconnected?.(event);
      });
    };

    initializePlayer();

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
      }
      playerRef.current = null;

      // Also clear any Video.js reference on the element
      const videoElement = videoRef.current;
      if (videoElement && videoElement.player) {
        delete videoElement.player;
      }
    };
  }, [url]); // Only depend on URL - this is the only prop that should recreate the player

  // Handle options changes without recreating the player
  useEffect(() => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      // Update player options if needed
      // Note: Video.js doesn't have a direct way to update options after initialization
      // So we'll only recreate if critical options change
    }
  }, [options]);

  // Handle callback changes without recreating the player
  useEffect(() => {
    if (!playerRef.current || playerRef.current.isDisposed()) return;

    const player = playerRef.current;

    // Remove existing listeners to avoid duplicates
    player.off("error");
    player.off("whep:notfound");
    player.off("whep:recovered");
    player.off("whep:connected");
    player.off("whep:forbidden");
    player.off("whep:servererror");
    player.off("whep:error");
    player.off("whep:disconnected");

    // Re-add event listeners with current callbacks
    player.on("error", () => {
      const playerError = player.error();
      const errorMessage = playerError
        ? playerError.message
        : getMessage("videoPlayerError");
      setError(errorMessage);
      onError?.(playerError);
    });

    player.on("whep:notfound", (event) => {
      setError(null);
      setIsReconnecting(true);
      setIsLoading(false);
      onStreamNotFound?.(event);
    });

    player.on("whep:recovered", (event) => {
      setError(null);
      setIsLoading(false);
      setIsReconnecting(false);
      onStreamRecovered?.(event);
    });

    player.on("whep:connected", (event) => {
      setError(null);
      setIsLoading(false);
      setIsReconnecting(false);
      onStreamConnected?.(event);
    });

    player.on("whep:forbidden", (event) => {
      setError(getMessage("accessForbidden"));
      setIsReconnecting(false);
      setIsLoading(false);
      onForbidden?.(event);
    });

    player.on("whep:servererror", (event) => {
      setError(getMessage("serverError"));
      setIsReconnecting(false);
      setIsLoading(false);
      onServerError?.(event);
    });

    player.on("whep:error", (event) => {
      setError(null);
      setIsReconnecting(true);
      setIsLoading(false);
      onError?.(event);
    });

    player.on("whep:disconnected", (event) => {
      setError(null);
      setIsReconnecting(true);
      setIsLoading(false);
      onStreamDisconnected?.(event);
    });
  }, [
    onReady,
    onError,
    onStreamNotFound,
    onStreamRecovered,
    onStreamConnected,
    onStreamDisconnected,
    onForbidden,
    onServerError,
  ]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
  };

  if (error) {
    return renderError ? (
      renderError({ error, onRetry: handleRetry })
    ) : (
      <div className={`whep-player-error ${className}`}>
        <DefaultErrorDisplay
          error={error}
          onRetry={handleRetry}
          messages={finalMessages}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`whep-player-container ${className}`}
      style={{
        overflow: "hidden",
        display: "flex",
        userSelect: enableZoomPan ? "none" : "auto",
        ...style,
      }}
    >
      {isLoading &&
        !isReconnecting &&
        (renderLoading ? (
          renderLoading()
        ) : (
          <DefaultLoadingSpinner message={getMessage("loading")} />
        ))}

      {isReconnecting &&
        (renderReconnecting ? (
          renderReconnecting()
        ) : (
          <DefaultLoadingSpinner message={getMessage("reconnecting")} />
        ))}

      <div
        data-vjs-player
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: transformOrigin,
          transition:
            enableZoomPan && !isDraggingRef.current
              ? "transform 0.15s ease-out"
              : "none",
        }}
      >
        <video
          ref={videoRef}
          className="video-js vjs-default-skin"
          playsInline
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit,
          }}
          key={`video-${url}`}
        />
      </div>

      {/* Zoom indicator */}
      {enableZoomPan && zoom !== 1 && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "5px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 20,
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
};

export const DefaultLoadingSpinner = ({ message = "Loading stream..." }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "#fff",
      zIndex: 10,
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "30px",
          height: "30px",
          border: "4px solid #333",
          borderTop: "4px solid #fff",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
          // marginBottom: "10px",
          // margin: "0 auto 10px",
          margin: "0 auto",
        }}
      />
      <div>{message}</div>
    </div>
  </div>
);

export const DefaultErrorDisplay = ({ error, onRetry, messages = {} }) => {
  const finalMessages = { ...defaultMessages, ...messages };
  const getMessage = (key) => finalMessages[key] || defaultMessages[key];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "200px",
        backgroundColor: "#000",
        color: "#fff",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 10px 0", color: "#ff6b6b" }}>
          {getMessage("streamError")}
        </h3>
        <p style={{ margin: "0 0 15px 0", opacity: 0.8 }}>{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: "#ff6b6b",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {getMessage("retry")}
          </button>
        )}
      </div>
    </div>
  );
};

// Backward compatibility alias
export const WhepPlayer = WebRTCViewer;

export default WebRTCViewer;

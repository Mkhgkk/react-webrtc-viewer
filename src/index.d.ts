import React from "react";

export interface WebRTCViewerProps {
  /** WHEP stream URL */
  url: string;
  /** Video.js player options */
  options: any;
  /** Additional CSS class name */
  className?: string;
  /** Callback when player is ready */
  onReady?: (player: any) => void;
  /** Callback when error occurs */
  onError?: (error: any) => void;
  /** Callback when stream is not found (404) */
  onStreamNotFound?: (event: any) => void;
  /** Callback when stream recovers from error */
  onStreamRecovered?: (event: any) => void;
  /** Callback when stream connects successfully */
  onStreamConnected?: (event: any) => void;
  /** Callback when stream disconnects */
  onStreamDisconnected?: (event: any) => void;
  /** Callback when access is forbidden (403) */
  onForbidden?: (event: any) => void;
  /** Callback when server error occurs (500) */
  onServerError?: (event: any) => void;
  /** Enable zoom and pan functionality */
  enableZoomPan?: boolean;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Zoom step increment */
  zoomStep?: number;
  /** Custom loading spinner component */
  renderLoading?: () => React.ReactNode;
  /** Custom error display component */
  renderError?: (props: {
    error: string;
    onRetry: () => void;
  }) => React.ReactNode;
  /** Custom reconnecting display component */
  renderReconnecting?: () => React.ReactNode;
  /** Custom CSS for Video.js spinner styling */
  customSpinnerCSS?: string;
  /** Custom messages for internationalization */
  messages?: {
    loading?: string;
    reconnecting?: string;
    streamError?: string;
    retry?: string;
    connectionFailed?: string;
    streamNotFound?: string;
    accessForbidden?: string;
    serverError?: string;
    whepUrlRequired?: string;
    failedToInitialize?: string;
    videoPlayerError?: string;
    connectionLost?: string;
  };
  /** Object fit for the video */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

export interface DefaultLoadingSpinnerProps {
  message?: string;
}

export interface DefaultErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  messages?: {
    streamError?: string;
    retry?: string;
  };
}

export declare const WebRTCViewer: React.FC<WebRTCViewerProps>;
export declare const WhepPlayer: React.FC<WebRTCViewerProps>; // Legacy alias
export declare const DefaultLoadingSpinner: React.FC<DefaultLoadingSpinnerProps>;
export declare const DefaultErrorDisplay: React.FC<DefaultErrorDisplayProps>;

export default WebRTCViewer;

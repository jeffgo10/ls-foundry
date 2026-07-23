export type MarkerKind = "navigation" | "info" | "label";

export type MarkerContent =
  | { type: "text"; body: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "html"; html: string }
  | {
      type: "rich";
      title?: string;
      body?: string;
      imageUrl?: string;
      blocks?: Array<
        | { type: "text"; text: string }
        | { type: "image"; src: string; alt?: string }
        | { type: "link"; href: string; label: string }
      >;
    };

export type PanoramaMarker = {
  id: string;
  yaw: number;
  pitch: number;
  kind: MarkerKind;
  /** Short tooltip / aria / default chip text */
  title?: string;
  /** Visual for the pin itself */
  pin?: {
    cssClass?: string;
    /** Optional custom pin image URL */
    iconUrl?: string;
  };
  /**
   * Rich content attached to the marker (info / label).
   * Rendered by the package (popover, billboard, or expandable panel on the sphere).
   */
  content?: MarkerContent;
  /** Consumer metadata (e.g. targetSceneId) — opaque; package does not interpret */
  data?: Record<string, unknown>;
};

export type PanoramaViewerProps = {
  imageUrl: string;
  className?: string;
  /** Initial camera (degrees) */
  initialYaw?: number;
  initialPitch?: number;
  initialHfov?: number;
  /** Markers + content overlays on the sphere */
  markers?: PanoramaMarker[];
  /** Viewer vs editor behavior */
  mode?: "view" | "edit";
  /** Fired when user clicks the sphere (edit mode) — yaw/pitch in degrees */
  onSphereClick?: (pos: { yaw: number; pitch: number }) => void;
  /** Fired when a marker is clicked */
  onMarkerClick?: (marker: PanoramaMarker) => void;
};

export type PanoramaViewerHandle = {
  getView: () => { yaw: number; pitch: number; hfov: number } | null;
  lookAt: (yaw: number, pitch: number, hfov?: number) => void;
  destroy: () => void;
};

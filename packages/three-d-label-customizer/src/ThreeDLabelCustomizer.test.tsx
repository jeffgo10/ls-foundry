jest.mock("./scene/LabelScene", () => ({
  LabelScene: () => <div data-testid="label-scene" />,
}));

jest.mock("@react-three/fiber", () => ({
  Canvas: ({
    children,
    className,
    style,
  }: {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="r3f-canvas" className={className} style={style}>
      {children}
    </div>
  ),
}));

jest.mock("@react-three/drei", () => ({
  OrthographicCamera: () => <div data-testid="ortho-camera" />,
  useTexture: () => ({
    dispose: jest.fn(),
    colorSpace: "",
    minFilter: 0,
    magFilter: 0,
  }),
}));

jest.mock("./useImageDimensions", () => ({
  useImageDimensions: (src: string) =>
    src ? { width: 400, height: 800 } : { width: 0, height: 0 },
}));

jest.mock("./useGreenAreaScan", () => ({
  useGreenAreaScan: (src: string) => {
    if (!src) {
      return {
        targetBounds: null,
        surfaceGrid: null,
        imageWidth: 0,
        imageHeight: 0,
        displayCanvasSrc: null,
        scanWarning: null,
        isScanning: false,
      };
    }
    if (src.includes("no-green")) {
      return {
        targetBounds: {
          minX: 70,
          minY: 35,
          maxX: 129,
          maxY: 64,
          centerX: 100,
          centerY: 50,
          width: 60,
          height: 30,
          aspectRatio: 2,
          rotationDegrees: 0,
        },
        imageWidth: 200,
        imageHeight: 100,
        surfaceGrid: null,
        displayCanvasSrc: "data:image/png;base64,display-no-green",
        scanWarning: "No neon-green surface detected — label placed at image center.",
        isScanning: false,
      };
    }
    return {
      targetBounds: {
        minX: 20,
        minY: 10,
        maxX: 59,
        maxY: 49,
        centerX: 39.5,
        centerY: 29.5,
        width: 40,
        height: 40,
        aspectRatio: 1,
        rotationDegrees: 0,
      },
      imageWidth: 100,
      imageHeight: 80,
      surfaceGrid: null,
      displayCanvasSrc: "data:image/png;base64,display-product",
      scanWarning: null,
      isScanning: false,
    };
  },
  SCAN_WARNING_MESSAGE:
    "No neon-green surface detected — label placed at image center.",
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { ThreeDLabelCustomizer } from "./ThreeDLabelCustomizer";

describe("ThreeDLabelCustomizer", () => {
  it("renders loading prompt when images are missing", () => {
    render(
      <ThreeDLabelCustomizer canvasImageSrc="" labelImageSrc="" />,
    );
    expect(screen.getByText("Load product and label images")).toBeInTheDocument();
  });

  it("renders R3F canvas when images are provided", () => {
    render(
      <ThreeDLabelCustomizer
        canvasImageSrc="/product.png"
        labelImageSrc="/label.png"
      />,
    );
    expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    expect(screen.getByText("Curvature")).toBeInTheDocument();
    expect(screen.getByText("Offset X")).toBeInTheDocument();
  });

  it("shows scan warning banner when green area is not found", () => {
    render(
      <ThreeDLabelCustomizer
        canvasImageSrc="/no-green.png"
        labelImageSrc="/label.png"
      />,
    );
    expect(
      screen.getByText(/No neon-green surface detected/),
    ).toBeInTheDocument();
  });

  it("updates curvature slider value", () => {
    render(
      <ThreeDLabelCustomizer
        canvasImageSrc="/product.png"
        labelImageSrc="/label.png"
      />,
    );
    const sliders = screen.getAllByRole("slider");
    const curvature = sliders[0];
    fireEvent.change(curvature, { target: { value: "60" } });
    expect(screen.getByText("60")).toBeInTheDocument();
  });
});

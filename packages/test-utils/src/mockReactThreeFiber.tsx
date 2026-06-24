import React from "react";

/** Minimal @react-three/fiber mock — renders Canvas children in a test stub. */
export function registerReactThreeFiberMocks(): void {
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
    useTexture: (src: string) => ({
      dispose: jest.fn(),
      colorSpace: "",
      minFilter: 0,
      magFilter: 0,
      image: { src },
    }),
  }));
}

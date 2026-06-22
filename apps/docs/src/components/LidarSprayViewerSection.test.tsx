jest.mock("next/dynamic", () => () => function MockGlbViewer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <div data-testid="glb-viewer" data-src={src} className={className}>
      GlbViewer
    </div>
  );
});

import { render, screen } from "@testing-library/react";
import LidarSprayViewerSection from "./LidarSprayViewerSection";

describe("LidarSprayViewerSection", () => {
  it("renders GlbViewer with spray model src", () => {
    render(<LidarSprayViewerSection />);
    const viewer = screen.getByTestId("glb-viewer");
    expect(viewer).toHaveAttribute("data-src", "/spray.glb");
    expect(viewer).toHaveClass("rounded-xl");
  });
});

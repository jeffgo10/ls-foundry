jest.mock("next/dynamic", () => () => function MockThreeDLabelCustomizer({
  canvasImageSrc,
  labelImageSrc,
  showWireframe,
}: {
  canvasImageSrc: string;
  labelImageSrc: string;
  showWireframe?: boolean;
}) {
  return (
    <div
      data-testid="three-d-label-customizer"
      data-canvas-src={canvasImageSrc}
      data-label-src={labelImageSrc}
      data-wireframe={String(showWireframe)}
    >
      ThreeDLabelCustomizer
    </div>
  );
});

import { fireEvent, render, screen } from "@testing-library/react";
import ThreeDLabelCustomizerSection from "./ThreeDLabelCustomizerSection";

describe("ThreeDLabelCustomizerSection", () => {
  it("renders file inputs and customizer stub", () => {
    render(<ThreeDLabelCustomizerSection />);
    expect(screen.getByTestId("three-d-label-customizer")).toBeInTheDocument();
    expect(screen.getByText(/Product image/)).toBeInTheDocument();
    expect(screen.getByText(/Label graphic/)).toBeInTheDocument();
  });

  it("passes showWireframe to customizer when toggled", () => {
    render(<ThreeDLabelCustomizerSection />);
    fireEvent.click(screen.getByRole("checkbox"));
    const customizer = screen.getByTestId("three-d-label-customizer");
    expect(customizer).toHaveAttribute("data-wireframe", "true");
  });
});

jest.mock("next/dynamic", () => () => function MockCanvasDesigner() {
  return <div data-testid="canvas-designer">CanvasDesigner</div>;
});

import { render, screen } from "@testing-library/react";
import StickPakCanvasSection from "./StickPakCanvasSection";

describe("StickPakCanvasSection", () => {
  it("renders section controls and canvas designer", () => {
    render(<StickPakCanvasSection />);
    expect(screen.getByTestId("canvas-designer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Export$/i })).toBeInTheDocument();
  });
});

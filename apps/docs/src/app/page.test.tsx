import { render, screen } from "@testing-library/react";
import HomePage from "./page";

jest.mock("@/components/LidarSprayViewerSection", () => ({
  __esModule: true,
  default: () => <div data-testid="lidar-section">LiDAR section</div>,
}));

describe("HomePage", () => {
  it("renders heading and stickpak link", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /GLB \/ LiDAR viewer/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /StickPak canvas designer/i })).toHaveAttribute(
      "href",
      "/stickpak",
    );
    expect(screen.getByTestId("lidar-section")).toBeInTheDocument();
  });
});

import { act, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { PanoramaViewer } from "./PanoramaViewer";
import type { PanoramaViewerHandle } from "./types";

const destroy = jest.fn();
const getYaw = jest.fn(() => 12);
const getPitch = jest.fn(() => -3);
const getHfov = jest.fn(() => 100);
const lookAt = jest.fn();
const mouseEventToCoords = jest.fn(() => [-3, 12] as [number, number]);

const viewerMock = {
  destroy,
  getYaw,
  getPitch,
  getHfov,
  lookAt,
  mouseEventToCoords,
};

const pannellumViewer = jest.fn(() => viewerMock);

beforeEach(() => {
  destroy.mockClear();
  lookAt.mockClear();
  pannellumViewer.mockClear();
  pannellumViewer.mockImplementation(() => viewerMock);
  window.pannellum = { viewer: pannellumViewer };
});

afterEach(() => {
  delete window.pannellum;
});

describe("PanoramaViewer", () => {
  it("creates and destroys the Pannellum viewer", async () => {
    const { unmount } = render(
      <PanoramaViewer imageUrl="https://example.com/pano.jpg" />,
    );

    await waitFor(() => {
      expect(pannellumViewer).toHaveBeenCalledTimes(1);
    });

    const config = pannellumViewer.mock.calls[0][1] as Pannellum.ConfigOptions;
    expect(config.panorama).toBe("https://example.com/pano.jpg");
    expect(config.type).toBe("equirectangular");

    unmount();
    expect(destroy).toHaveBeenCalled();
  });

  it("remounts when imageUrl changes", async () => {
    const { rerender } = render(
      <PanoramaViewer imageUrl="https://example.com/a.jpg" />,
    );
    await waitFor(() => expect(pannellumViewer).toHaveBeenCalledTimes(1));

    rerender(<PanoramaViewer imageUrl="https://example.com/b.jpg" />);
    await waitFor(() => expect(pannellumViewer).toHaveBeenCalledTimes(2));
    expect(destroy).toHaveBeenCalled();
  });

  it("exposes imperative handle helpers", async () => {
    const ref = createRef<PanoramaViewerHandle>();
    render(
      <PanoramaViewer
        ref={ref}
        imageUrl="https://example.com/pano.jpg"
        markers={[{ id: "n", yaw: 0, pitch: 0, kind: "navigation" }]}
      />,
    );

    await waitFor(() => expect(pannellumViewer).toHaveBeenCalled());

    expect(ref.current?.getView()).toEqual({
      yaw: 12,
      pitch: -3,
      hfov: 100,
    });

    act(() => {
      ref.current?.lookAt(30, -10, 90);
    });
    expect(lookAt).toHaveBeenCalledWith(-10, 30, 90);

    act(() => {
      ref.current?.destroy();
    });
    expect(destroy).toHaveBeenCalled();
  });
});

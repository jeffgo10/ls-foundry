import { render, screen } from "@testing-library/react";
import { SelectionDimensionLabels } from "./SelectionDimensionLabels";

function createMockNode() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    on: (event: string, handler: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },
    off: (event: string, handler: () => void) => {
      listeners.get(event)?.delete(handler);
    },
    getAbsoluteTransform: () => ({
      point: ({ x, y }: { x: number; y: number }) => ({ x: x + 10, y: y + 20 }),
    }),
    emit: (event: string) => {
      listeners.get(event)?.forEach((handler) => handler());
    },
  };
}

describe("SelectionDimensionLabels", () => {
  it("renders nothing when node is undefined", () => {
    const { container } = render(
      <SelectionDimensionLabels
        node={undefined}
        localWidth={100}
        localHeight={80}
        widthLabel="10 mm"
        heightLabel="8 mm"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders width and height labels for a node", () => {
    const node = createMockNode();
    render(
      <SelectionDimensionLabels
        node={node as never}
        localWidth={100}
        localHeight={80}
        widthLabel="10.0 mm"
        heightLabel="8.0 mm"
        color="#ff0000"
      />,
    );
    expect(screen.getByText("10.0 mm")).toBeInTheDocument();
    expect(screen.getByText("8.0 mm")).toBeInTheDocument();
  });

  it("updates placements on transform events", () => {
    const node = createMockNode();
    render(
      <SelectionDimensionLabels
        node={node as never}
        localWidth={100}
        localHeight={80}
        widthLabel="W"
        heightLabel="H"
      />,
    );
    node.emit("transform");
    expect(screen.getByText("W")).toBeInTheDocument();
  });
});

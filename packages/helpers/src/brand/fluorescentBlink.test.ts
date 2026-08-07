import {
  buildFlickerKeyframes,
  generateFluorescentBlinkPlan,
  LSM_MARK_PATH_IDS,
} from "./fluorescentBlink";

describe("buildFlickerKeyframes", () => {
  it("starts off and settles fully on", () => {
    let i = 0;
    const sequence = [0.1, 0.2, 0.5, 0.9, 0.3, 0.7, 0.1, 0.8, 0.4, 0.6];
    const random = () => sequence[i++ % sequence.length]!;
    const css = buildFlickerKeyframes(random);
    expect(css).toMatch(/0\.00% \{ opacity: 0/);
    expect(css).toMatch(/100\.00% \{ opacity: 1/);
  });

  it("covers dim / mid / full fluorescent opacity branches", () => {
    // Sequence drives: flickerUntil, step sizes, and opacity rolls (<0.42, <0.62, <0.82, else).
    const sequence = [
      0.5, // flickerUntil
      0.1, 0.1, // step → off
      0.1, 0.5, 0.2, // step → dim (+ dim random)
      0.1, 0.7, 0.2, // step → mid (+ mid random)
      0.1, 0.9, // step → full
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    ];
    let i = 0;
    const random = () => sequence[Math.min(i++, sequence.length - 1)]!;
    const css = buildFlickerKeyframes(random);
    expect(css).toContain("opacity: 0;");
    expect(css).toMatch(/opacity: 0\.\d+/);
    expect(css).toContain("opacity: 1;");
  });
});

describe("generateFluorescentBlinkPlan", () => {
  it("creates unsynced plans for all three paths", () => {
    let i = 0;
    const random = () => {
      i += 1;
      return (i % 10) / 10;
    };

    const plan = generateFluorescentBlinkPlan({
      id: "test:id",
      durationMs: 2000,
      delayMs: 100,
      random,
    });

    expect(plan.paths).toHaveLength(3);
    expect(plan.paths.map((p) => p.pathId)).toEqual([...LSM_MARK_PATH_IDS]);

    const durations = new Set(plan.paths.map((p) => p.durationMs));
    const delays = new Set(plan.paths.map((p) => p.delayMs));
    const names = new Set(plan.paths.map((p) => p.animationName));
    // Deterministic RNG still yields distinct duration/delay/name per path.
    expect(durations.size).toBeGreaterThan(1);
    expect(delays.size).toBeGreaterThan(1);
    expect(names.size).toBe(3);

    for (const path of plan.paths) {
      expect(plan.cssText).toContain(`@keyframes ${path.animationName}`);
      expect(plan.cssText).toContain(`[data-lsm-blink="${path.animationName}"]`);
      expect(plan.cssText).toContain("step-end");
      expect(plan.cssText).toContain("forwards");
    }
  });

  it("clamps very short base durations to a minimum path length", () => {
    const plan = generateFluorescentBlinkPlan({
      id: "short",
      durationMs: 100,
      random: () => 0,
    });
    for (const path of plan.paths) {
      expect(path.durationMs).toBeGreaterThanOrEqual(400);
    }
  });

  it("uses default duration, delay, and Math.random when omitted", () => {
    const plan = generateFluorescentBlinkPlan({ id: "defaults-only" });
    expect(plan.paths).toHaveLength(3);
    expect(plan.cssText).toContain("@keyframes");
  });
});

describe("buildFlickerKeyframes defaults", () => {
  it("accepts the Math.random default parameter", () => {
    const css = buildFlickerKeyframes();
    expect(css).toMatch(/0\.00% \{ opacity: 0/);
    expect(css).toMatch(/100\.00% \{ opacity: 1/);
  });
});

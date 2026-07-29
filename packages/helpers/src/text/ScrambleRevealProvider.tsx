import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { resolveSkipEnvironment } from "./skipEnvironment";

export type ScrambleRevealEnvironmentValue = {
  /**
   * When true, scramble should not run (search bot, reduced-motion, or
   * provider `disabled`). Computed once via {@link resolveSkipEnvironment}
   * unless overridden by `disabled`.
   */
  skipAnimation: boolean;
};

const ScrambleRevealEnvironmentContext =
  createContext<ScrambleRevealEnvironmentValue | null>(null);

export type ScrambleRevealProviderProps = {
  children: ReactNode;
  /** Force-skip scramble for the entire subtree. */
  disabled?: boolean;
};

/**
 * Runs the bot / reduced-motion check once and shares `skipAnimation` with
 * every `useScrambleReveal` under this tree. Wrap heroes (or the app shell)
 * so staggered lines do not each re-query `matchMedia` / UA.
 */
export function ScrambleRevealProvider({
  children,
  disabled = false,
}: ScrambleRevealProviderProps) {
  const skipAnimation = disabled || resolveSkipEnvironment();
  const value = useMemo(
    (): ScrambleRevealEnvironmentValue => ({ skipAnimation }),
    [skipAnimation],
  );

  return (
    <ScrambleRevealEnvironmentContext.Provider value={value}>
      {children}
    </ScrambleRevealEnvironmentContext.Provider>
  );
}

/** `null` when no provider is mounted (hook falls back to module cache). */
export function useScrambleRevealEnvironment(): ScrambleRevealEnvironmentValue | null {
  return useContext(ScrambleRevealEnvironmentContext);
}

import React from "react";

type DynamicModule = Record<string, unknown> & {
  default?: React.ComponentType<Record<string, unknown>>;
};

/** Returns a dynamic() stub that resolves named or default exports without React.lazy. */
function mockDynamic(
  loader: () => Promise<DynamicModule>,
  options?: { ssr?: boolean; loading?: () => React.ReactNode },
) {
  return function DynamicWrapper(props: Record<string, unknown>) {
    const [Component, setComponent] = React.useState<React.ComponentType<
      Record<string, unknown>
    > | null>(null);

    React.useEffect(() => {
      loader().then((mod) => {
        const resolved =
          (typeof mod.default === "function" ? mod.default : null) ??
          (Object.values(mod).find(
            (value) => typeof value === "function",
          ) as React.ComponentType<Record<string, unknown>> | undefined);
        setComponent(() => resolved ?? null);
      });
    }, []);

    if (!Component) {
      return options?.loading ? <options.loading /> : null;
    }

    return <Component {...props} />;
  };
}

export default mockDynamic;

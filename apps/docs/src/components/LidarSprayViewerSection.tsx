"use client";

import dynamic from "next/dynamic";

const GlbViewer = dynamic(
  () => import("@ls-foundry/gl-viewer").then((m) => m.GlbViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,560px)] items-center justify-center rounded-xl border border-white/10 bg-[#070708] text-xs tracking-[0.2em] text-white/40">
        INITIALIZING VIEWER…
      </div>
    ),
  }
);

export default function LidarSprayViewerSection() {
  return <GlbViewer src="/spray.glb" className="w-full" />;
}

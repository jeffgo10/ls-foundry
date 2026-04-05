import LidarSprayViewerSection from "@/components/LidarSprayViewerSection";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <header className="mb-10">
        <p className="text-[10px] tracking-[0.25em] text-white/40">LS-FOUNDRY / DOCS</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-white sm:text-3xl">GLB / LiDAR viewer</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          Same pattern as <code className="text-white/70">LidarSprayViewerSection</code> in liteshademedia: dynamic
          import with <code className="text-white/70">ssr: false</code>. Add{" "}
          <code className="text-white/70">public/spray.glb</code> (or change the{" "}
          <code className="text-white/70">src</code> prop) to load your model.
        </p>
      </header>
      <LidarSprayViewerSection />
    </main>
  );
}

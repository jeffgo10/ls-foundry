import Link from "next/link";
import LidarSprayViewerSection from "@/components/LidarSprayViewerSection";

function HomePage() {
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
        <Link
          href="/stickpak"
          className="mt-4 inline-block text-xs tracking-[0.15em] text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
        >
          StickPak canvas designer →
        </Link>
        <Link
          href="/3d-label"
          className="mt-2 block text-xs tracking-[0.15em] text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
        >
          3D label customizer →
        </Link>
        <Link
          href="/panorama"
          className="mt-2 block text-xs tracking-[0.15em] text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
        >
          360 panorama viewer →
        </Link>
      </header>
      <LidarSprayViewerSection />
    </main>
  );
}

export default HomePage;

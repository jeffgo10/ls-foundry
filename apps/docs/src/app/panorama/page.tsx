import Link from "next/link";
import PanoramaViewerSection from "@/components/PanoramaViewerSection";

function PanoramaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <header className="mb-10">
        <p className="text-[10px] tracking-[0.25em] text-white/40">
          LS-FOUNDRY / PANORAMA
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-white sm:text-3xl">
          360 panorama viewer
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          Demo for{" "}
          <code className="text-white/70">@jeffgo10/panorama-viewer</code>.
          Upload an equirectangular 360 image, place navigation / info / label
          hotspots in edit mode, and inspect package-owned content UI.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs tracking-[0.15em] text-white/40">
          <Link
            href="/"
            className="underline-offset-4 hover:text-white/70 hover:underline"
          >
            ← GL viewer docs
          </Link>
          <Link
            href="/3d-label"
            className="underline-offset-4 hover:text-white/70 hover:underline"
          >
            3D label customizer →
          </Link>
        </div>
      </header>
      <PanoramaViewerSection />
    </main>
  );
}

export default PanoramaPage;

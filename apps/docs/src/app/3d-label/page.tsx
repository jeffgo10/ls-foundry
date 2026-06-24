import Link from "next/link";
import ThreeDLabelCustomizerSection from "@/components/ThreeDLabelCustomizerSection";

function ThreeDLabelPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <header className="mb-10">
        <p className="text-[10px] tracking-[0.25em] text-white/40">
          LS-FOUNDRY / 3D LABEL
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-white sm:text-3xl">
          3D label customizer
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          Browser test for{" "}
          <code className="text-white/70">@jeffgo10/three-d-label-customizer</code>
          . Upload a product photo with a neon-green label region and a label
          graphic; the component scans the green area and warps the label onto a
          curved mesh with multiply blending.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs tracking-[0.15em] text-white/40">
          <Link
            href="/"
            className="underline-offset-4 hover:text-white/70 hover:underline"
          >
            ← GL viewer docs
          </Link>
          <Link
            href="/stickpak"
            className="underline-offset-4 hover:text-white/70 hover:underline"
          >
            StickPak canvas designer →
          </Link>
        </div>
      </header>
      <ThreeDLabelCustomizerSection />
    </main>
  );
}

export default ThreeDLabelPage;

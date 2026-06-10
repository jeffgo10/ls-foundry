import Link from "next/link";
import StickPakCanvasSection from "@/components/StickPakCanvasSection";

function StickPakPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <header className="mb-10">
        <p className="text-[10px] tracking-[0.25em] text-white/40">LS-FOUNDRY / STICKPAK</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-white sm:text-3xl">
          Canvas designer
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          Phase 1 browser test for <code className="text-white/70">@jeffgo10/react-canvas-designer</code>.
          Drop sticker images onto the 72 DPI A4 canvas, drag them into place, then export layout JSON.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-xs tracking-[0.15em] text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
        >
          ← GL viewer docs
        </Link>
      </header>
      <StickPakCanvasSection />
    </main>
  );
}

export default StickPakPage;

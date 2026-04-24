import TopNav from "@/components/TopNav";
import HomeHero from "@/components/HomeHero";

export default function HomePage() {
  return (
    <>
      <TopNav />
      <HomeHero />
      <footer className="relative z-10 w-full py-10 border-t border-white/10 bg-black/30 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between px-8 max-w-7xl mx-auto gap-3">
          <span className="font-display italic text-white/40 font-black tracking-tighter">
            AURA SLICE
          </span>
          <span className="font-caps text-xs uppercase tracking-widest text-white/40">
            © 2026 · Crafted for tactile refreshment.
          </span>
        </div>
      </footer>
    </>
  );
}

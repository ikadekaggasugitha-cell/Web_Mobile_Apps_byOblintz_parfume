import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';

/**
 * Art-directed hero — no photography required. A burgundy stage with an
 * editorial Fraunces headline on the left and a CSS "display case" holding a
 * stylised flacon on a pedestal on the right. Degrades gracefully and reads as
 * a boutique window, not a placeholder.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-800 text-ivory">
      {/* Ambient light — champagne warmth diffusing through the burgundy. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-24 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(198,161,91,0.28),transparent_62%)]" />
        <div className="absolute -bottom-40 -left-24 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(122,31,43,0.55),transparent_60%)]" />
      </div>

      <div className="container relative mx-auto grid grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-28">
        {/* ── Editorial copy ─────────────────────────────────────────────── */}
        <div className="animate-fade-up">
          <Eyebrow tone="dark" flank={false} className="mb-6 flex items-center gap-2">
            <span aria-hidden="true" className="text-gold-400">✦</span>
            Parfum dengan Jiwa
          </Eyebrow>

          <h1 className="font-serif text-5xl font-medium leading-[1.04] tracking-[-0.015em] sm:text-6xl lg:text-7xl">
            Parfum yang
            <br />
            Menuturkan
            <br />
            <span className="italic text-gold-400">Kisah Anda</span>
          </h1>

          <p className="mt-7 max-w-md text-lg leading-relaxed text-ivory/75">
            Lebih dari sekadar wewangian — setiap botol menyimpan memori, momen,
            dan suasana yang menunggu untuk terungkap di kulit Anda.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/products"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-ivory px-8 text-sm font-medium text-primary-800 transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
            >
              Jelajahi Koleksi
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/quiz"
              className="inline-flex h-12 items-center justify-center rounded-[10px] border border-ivory/30 px-8 text-sm font-medium text-ivory transition-colors duration-200 hover:border-ivory/60 hover:bg-ivory/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
            >
              Temukan Aroma Anda
            </Link>
          </div>

          <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-luxe text-ivory/55">
            <span>100% Original</span>
            <span aria-hidden="true" className="text-gold-500">·</span>
            <span>Tersegel &amp; Terjamin Asli</span>
            <span aria-hidden="true" className="text-gold-500">·</span>
            <span>Dikirim ke Seluruh Indonesia</span>
          </p>
        </div>

        {/* ── Display case ───────────────────────────────────────────────── */}
        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="relative mx-auto flex aspect-[4/5] w-full max-w-md items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-b from-primary-900 via-primary-800 to-primary-700 shadow-card ring-1 ring-gold-400/20">
            {/* caption chip */}
            <div className="absolute right-5 top-5 z-20 rounded-full border border-gold-400/30 bg-primary-900/40 px-4 py-1.5 text-right backdrop-blur">
              <p className="text-[10px] uppercase tracking-luxe text-gold-300">
                Signature Scents
              </p>
              <p className="text-xs font-medium text-ivory">mulai Rp 299rb</p>
            </div>

            {/* ornamental flourish */}
            <span
              aria-hidden="true"
              className="absolute left-6 top-6 z-20 text-xl text-gold-400/70"
            >
              ✦
            </span>

            {/* warm floor glow */}
            <div
              aria-hidden="true"
              className="absolute inset-x-10 bottom-14 h-28 rounded-[100%] bg-gold-400/15 blur-3xl"
            />

            {/* flacon standing on an implied glossy floor, with reflection */}
            <div className="relative flex flex-col items-center">
              <Flacon />
              {/* contact shadow */}
              <div className="h-2.5 w-28 rounded-[100%] bg-primary-950/60 blur-[3px]" />
              {/* reflection */}
              <div
                aria-hidden="true"
                className="pointer-events-none -mt-1.5 scale-y-[-1] opacity-20 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.6),transparent_65%)]"
              >
                <Flacon />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A stylised translucent flacon built from divs — the brand's stand-in bottle. */
function Flacon() {
  return (
    <div className="relative z-10 flex flex-col items-center">
      {/* cap */}
      <div className="h-8 w-11 rounded-t-[6px] bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 shadow-sm" />
      {/* collar */}
      <div className="h-2.5 w-7 bg-gradient-to-b from-gold-400 to-gold-600" />
      {/* body */}
      <div className="relative h-44 w-40 overflow-hidden rounded-[16px] bg-gradient-to-br from-ivory/35 via-gold-200/20 to-ivory/8 ring-1 ring-ivory/30">
        {/* amber liquid at the base */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-gold-500/45 via-gold-400/20 to-transparent" />
        {/* glass highlight */}
        <div className="absolute left-3.5 top-3 h-24 w-4 rounded-full bg-ivory/40 blur-[2px]" />
        {/* label */}
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-[4px] bg-ivory/95 py-2.5 text-center shadow-sm">
          <span className="block font-serif text-sm tracking-[0.2em] text-primary-800">
            OBLINTZ
          </span>
          <span className="mt-0.5 block text-[8px] uppercase tracking-luxe text-warmgray">
            Eau de Parfum
          </span>
        </div>
      </div>
    </div>
  );
}

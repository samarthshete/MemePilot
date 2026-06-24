// Stage 0 placeholder. The real landing page lands in Stage 1.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-cw-bg px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-cw-text sm:text-6xl">
        ChadWallet
      </h1>
      <p className="max-w-md text-base text-cw-text-muted sm:text-lg">
        The social-first Solana memecoin wallet. Web companion coming soon.
      </p>
      <button
        type="button"
        className="rounded-full bg-cw-green px-8 py-3 text-base font-semibold text-cw-bg transition-colors hover:bg-cw-green-press"
      >
        Get the app
      </button>
    </main>
  );
}

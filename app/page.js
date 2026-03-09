import Link from "next/link";

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "#1e1e1e", color: "#d4d4d4" }}
    >
      <div className="text-center max-w-lg px-6">
        <h1 className="text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>
          WebWeave
        </h1>
        <p className="text-lg mb-8" style={{ color: "#9d9d9d" }}>
          Build Next.js websites in your browser. No setup required.
        </p>
        <Link
          href="/editor"
          className="inline-block px-8 py-3 rounded-md font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#0070f3" }}
        >
          Open Editor
        </Link>
      </div>
    </main>
  );
}

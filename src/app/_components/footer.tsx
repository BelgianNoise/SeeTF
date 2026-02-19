export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-gray-950">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-3">
        <p className="text-xs text-gray-500">
          vibecoded by{" "}
          <a
            href="https://github.com/BelgianNoise"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-400 transition hover:text-emerald-300"
          >
            BelgianNoise
          </a>{" "}
          using{" "}
          <a
            href="https://github.com/syrll/cocopilot"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-400 transition hover:text-emerald-300"
          >
            cocopilot
          </a>
          {" · © 2026 SeeTF. All rights reserved."}
        </p>
      </div>
    </footer>
  );
}

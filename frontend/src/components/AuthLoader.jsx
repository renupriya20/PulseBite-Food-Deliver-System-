export const AuthLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
    {/* Pulsing brand logo */}
    <div className="relative mb-10 flex items-center justify-center">
      {/* Outer ping ring */}
      <span className="absolute inline-flex h-20 w-20 rounded-full bg-orange-100 animate-ping opacity-60" />

      {/* Inner circle with icon */}
      <div className="relative z-10 w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
        {/* Fork & knife SVG */}
        <svg
          className="w-7 h-7 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
        </svg>
      </div>
    </div>

    {/* Brand name */}
    <h1 className="text-2xl font-bold tracking-tight text-stone-900 mb-1">
      Pulse<span className="text-orange-500">Bite</span>
    </h1>
    <p className="text-xs text-stone-400 uppercase tracking-[0.2em] font-medium mb-10">
      Fresh · Fast · Reliable
    </p>

    {/* Animated dots */}
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" />
    </div>
  </div>
);

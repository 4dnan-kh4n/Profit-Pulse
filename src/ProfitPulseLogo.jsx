export default function ProfitPulseLogo({ className = '' }) {
  return <svg className={`profit-pulse-logo ${className}`} viewBox="0 0 338 72" role="img" aria-label="Profit Pulse">
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="62" height="62" rx="18" fill="#123d2f" stroke="#7bc37c" strokeWidth="1.5" />
      <path d="M17 48V36M31 48V28M45 48V19" stroke="#a8d678" strokeWidth="6" />
      <path d="M15 47c12-4 19-10 26-19 5-6 10-12 16-18" stroke="#ffb11b" strokeWidth="4" />
      <path d="m50 11 8-1-1 8" stroke="#ffb11b" strokeWidth="3" />
    </g>
    <text x="82" y="47" fontFamily="DM Sans, Arial, sans-serif" fontSize="35" fontWeight="700" letterSpacing="-1.8"><tspan fill="#f0f5eb">Profit</tspan><tspan fill="#f5ab19">Pulse</tspan></text>
  </svg>;
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 212.1"
      width={22}
      height={29}
      aria-hidden="true"
      className={`fill-amber ${className ?? ""}`.trim()}
    >
      <path d="M92.43,110h-24.85l-17.57-17.57v-24.85l17.57-17.57h24.85l17.57,17.57v24.85l-17.57,17.57ZM71.72,100h16.57l11.72-11.72v-16.57l-11.72-11.72h-16.57l-11.72,11.72v16.57l11.72,11.72Z" />
      <rect x="62.5" y="-.18" width="10" height="64.64" transform="translate(-2.96 57.15) rotate(-45)" />
      <rect x="100" y="5" width="10" height="64.64" />
      <rect x="95.53" y="62.5" width="64.65" height="10" transform="translate(-10.28 110.18) rotate(-45)" />
      <rect x="90.36" y="100" width="64.64" height="10" />
      <rect x="87.5" y="95.53" width="10" height="64.65" transform="translate(-63.31 102.86) rotate(-45)" />
      <rect x="50" y="90.36" width="10" height="64.64" />
      <rect x="-.18" y="87.5" width="64.64" height="10" transform="translate(-56 49.83) rotate(-45)" />
      <rect x="5" y="50" width="64.64" height="10" />
      <path d="M60,212.1H0v-113.1l9.29,9.29,50.71-50.71v154.53ZM10,202.1h40v-120.38L10,121.72v80.38Z" />
      <path d="M113.14,160h-63.14v-78.28L9.29,122.43,0,113.14V46.86L46.86,0h66.27l46.86,46.86v66.27l-46.86,46.86ZM60,150h49l41-41v-57.99L109,10h-57.99L10,51.01v56.57l50-50v92.43Z" />
      <path d="M80,110c-16.54,0-30-13.46-30-30s13.46-30,30-30,30,13.46,30,30-13.46,30-30,30ZM80,60c-11.03,0-20,8.97-20,20s8.97,20,20,20,20-8.97,20-20-8.97-20-20-20Z" />
      <polygon points="160 212.1 103.14 212.1 103.14 150 113.14 150 113.14 202.1 150 202.1 150 105 160 105 160 212.1" />
    </svg>
  );
}

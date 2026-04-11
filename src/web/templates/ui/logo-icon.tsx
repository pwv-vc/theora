/** @jsxImportSource hono/jsx */

export function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#1a0044"/>
      <g>
        <rect x="12" y="12" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="19" y="12" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="26" y="12" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="33" y="12" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="40" y="12" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="47" y="12" width="5" height="5" rx="1" class="logo-pixel"/>
        <rect x="12" y="19" width="5" height="5" rx="1" class="logo-pixel logo-pixel--b"/>
        <rect x="19" y="19" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="26" y="19" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="33" y="19" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="40" y="19" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="47" y="19" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="26" y="26" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="33" y="26" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="26" y="33" width="5" height="5" rx="1" class="logo-pixel logo-pixel--c"/>
        <rect x="33" y="33" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="26" y="40" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="33" y="40" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="26" y="47" width="5" height="5" rx="1" fill="#00bbff"/>
        <rect x="33" y="47" width="5" height="5" rx="1" class="logo-pixel logo-pixel--d"/>
      </g>
    </svg>
  )
}

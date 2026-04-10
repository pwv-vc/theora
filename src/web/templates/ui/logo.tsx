/** @jsxImportSource hono/jsx */

interface PwvLogoProps {
  class?: string
  width?: number
  height?: number
}

export function PwvLogo({ class: className = '', width = 24, height = 24 }: PwvLogoProps) {
  return (
    <svg
      class={className}
      width={width}
      height={height}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="400" height="400" fill="#00D22E" />
      <path
        d="M36 160.263H67.7208C92.9361 160.263 104.119 168.704 104.119 189.583C104.119 210.461 92.9361 218.687 67.7208 218.687H56.7708V240.712H36V160.263ZM68.9753 200.55C79.0112 200.55 83.4736 197.808 83.4736 189.6C83.4736 181.392 79.0291 178.418 68.9753 178.418H56.7708V200.55H68.9753Z"
        fill="black"
      />
      <path
        d="M167.253 167.216L158.131 240.712H119.797L108.041 160.263H128.812L138.059 220.855L139.78 233.758L149.965 160.263L175.381 160.263L167.253 167.216Z"
        fill="black"
      />
      <path
        d="M163.9 167.217L172.982 240.712H211.145L222.85 160.263H202.171L192.965 220.855L191.252 233.759L181.107 160.263L155.809 160.263L163.9 167.217Z"
        fill="black"
      />
      <path
        d="M228.713 160.263H250.738L273.552 233.185L296.384 160.263H318.176L292.387 240.712H254.394L228.713 160.263Z"
        fill="black"
      />
      <path
        d="M338.443 215.139C324.321 215.139 312.869 226.591 312.869 240.713H363.999C363.999 226.591 352.547 215.139 338.425 215.139H338.443Z"
        fill="black"
      />
    </svg>
  )
}

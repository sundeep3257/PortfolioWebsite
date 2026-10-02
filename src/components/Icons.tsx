import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/** Line icons drawn on a 24x24 grid, inheriting `currentColor`. */
const base: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v10.5M7.8 10.6 12 14.8l4.2-4.2" />
      <path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </svg>
  )
}

export function LinkedInIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M5.4 3.6a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8ZM3.8 9h3.2v11.4H3.8V9Zm5.4 0h3.1v1.6c.5-.9 1.7-1.9 3.5-1.9 3.6 0 4.3 2.4 4.3 5.5v6.2h-3.2v-5.5c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.6H9.2V9Z" />
    </svg>
  )
}

export function PubMedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M7 3.6h6.4c3.1 0 5.2 1.8 5.2 5.1 0 3.2-2.1 5.2-5.2 5.2H9.6V20.4H7V3.6Zm2.6 2.2v5.8h3.6c1.7 0 2.7-1.1 2.7-2.9s-1-2.9-2.7-2.9H9.6Z" />
    </svg>
  )
}

export function StethoscopeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5v5.2a4.5 4.5 0 0 0 9 0V3.5" />
      <path d="M10.5 13.2v2.3a4.5 4.5 0 0 0 9 0v-1.6" />
      <circle cx="19.5" cy="11.6" r="2" />
    </svg>
  )
}

export function PaletteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2.2-.9 2.2-2 0-1-.7-1.6-.7-2.5 0-1 .8-1.7 1.9-1.7h1.8a3.3 3.3 0 0 0 3.3-3.3A8.6 8.6 0 0 0 12 3.5Z" />
      <circle cx="8.2" cy="10.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="7.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="8.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.6" cy="14.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  )
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13.5 4.5H19.5v6M19.5 4.5 11 13" />
      <path d="M17 13.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 18v-9a1.5 1.5 0 0 1 1.5-1.5H11" />
    </svg>
  )
}

export function ResearchGateIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      {/* Stylised "R" with the superscript "G" of the ResearchGate mark. */}
      <path d="M4 5.2h5.2c2.6 0 4.2 1.4 4.2 3.7 0 1.8-1 3-2.6 3.5l3.1 6.2h-2.7L8.4 12.9H6.5v5.7H4V5.2Zm2.5 2v3.8h2.4c1.3 0 2-.7 2-1.9s-.7-1.9-2-1.9H6.5Z" />
      <path d="M17.6 3.2c1.4 0 2.3.7 2.5 1.9h-1.2c-.2-.5-.6-.9-1.3-.9-1 0-1.5.9-1.5 2.3s.5 2.3 1.5 2.3c.8 0 1.3-.5 1.3-1.3h-1.2v-1h2.4v.5c0 1.7-1 2.8-2.5 2.8-1.7 0-2.8-1.3-2.8-3.3s1.1-3.3 2.8-3.3Z" />
    </svg>
  )
}

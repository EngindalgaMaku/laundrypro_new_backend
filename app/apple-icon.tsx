import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// LaundryPro mark, full-bleed: iOS rounds the corners itself
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
        <rect width="72" height="72" fill="#0A5C99" />
        <circle cx="36" cy="38" r="18" fill="none" stroke="#FFFFFF" strokeWidth="4.5" />
        <path d="M25.5 41.5c3.5-3.5 7-3.5 10.5 0s7 3.5 10.5 0" fill="none" stroke="#7FD8CC" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="22" cy="17" r="2.7" fill="#FFFFFF" />
      </svg>
    ),
    {
      ...size,
    }
  )
}

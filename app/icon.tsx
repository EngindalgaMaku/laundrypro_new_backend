import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// LaundryPro mark (components/brand/logo.tsx); the wave is dropped below 48px to stay legible
export default function Icon({ searchParams }: { searchParams?: { size?: string } }) {
  const iconSize = searchParams?.size ? parseInt(searchParams.size) : 32
  const simple = iconSize < 48

  return new ImageResponse(
    (
      <svg width={iconSize} height={iconSize} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
        <rect width="72" height="72" rx="18" fill="#0A5C99" />
        <circle cx="36" cy="38" r="20" fill="none" stroke="#FFFFFF" strokeWidth={simple ? 7 : 5} />
        {!simple && (
          <path d="M24 42c4-4 8-4 12 0s8 4 12 0" fill="none" stroke="#7FD8CC" strokeWidth="5" strokeLinecap="round" />
        )}
        {!simple && <circle cx="20" cy="15" r="3" fill="#FFFFFF" />}
      </svg>
    ),
    {
      width: iconSize,
      height: iconSize,
    }
  )
}

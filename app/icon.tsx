import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon({ searchParams }: { searchParams?: { size?: string } }) {
  const iconSize = searchParams?.size ? parseInt(searchParams.size) : 32
  const fontSize = Math.floor(iconSize * 0.75)
  const borderRadius = Math.floor(iconSize * 0.1875) // 6px for 32px icon
  
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: `${borderRadius}px`,
          boxShadow: iconSize > 64 ? '0 4px 20px rgba(59, 130, 246, 0.3)' : 'none',
        }}
      >
        <svg
          width={fontSize}
          height={fontSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Washing Machine Icon */}
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" fill="none"/>
          <circle cx="12" cy="13" r="5" stroke="white" strokeWidth="2" fill="none"/>
          <circle cx="12" cy="13" r="2" fill="white"/>
          <circle cx="7" cy="7" r="1" fill="white"/>
          <circle cx="10" cy="7" r="1" fill="white"/>
          <path d="M8 13c0-2.2 1.8-4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    ),
    {
      width: iconSize,
      height: iconSize,
    }
  )
}

import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function AppleIcon() {
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
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Washing Machine Icon */}
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
          <circle cx="12" cy="13" r="5" stroke="white" strokeWidth="1.5" fill="none"/>
          <circle cx="12" cy="13" r="2" fill="white"/>
          <circle cx="7" cy="7" r="1" fill="white"/>
          <circle cx="10" cy="7" r="1" fill="white"/>
          <path d="M8 13c0-2.2 1.8-4 4-4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}

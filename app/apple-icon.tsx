import { ImageResponse } from 'next/og'
import MARK from "@/lib/brand-mark.json";

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
        <rect width="72" height="72" fill={MARK.blue} />
        <path d={MARK.letter} fill="none" stroke="#FFFFFF" strokeWidth={MARK.letterWidth} strokeLinecap="round" strokeLinejoin="round" />
        <path d={MARK.wavePath} fill="none" stroke={MARK.wave} strokeWidth={MARK.waveWidth} strokeLinecap="round" />
      </svg>
    ),
    {
      ...size,
    }
  )
}

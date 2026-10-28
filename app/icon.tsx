import { ImageResponse } from 'next/og'
import MARK from "@/lib/brand-mark.json";

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// LaundryPro mark (lib/brand-mark.json); the wave is dropped below 48px to stay legible
export default function Icon({ searchParams }: { searchParams?: { size?: string } }) {
  const iconSize = searchParams?.size ? parseInt(searchParams.size) : 32
  const simple = iconSize < 48

  return new ImageResponse(
    (
      <svg width={iconSize} height={iconSize} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
        <rect width="72" height="72" rx={MARK.radius} fill={MARK.blue} />
        <path d={MARK.letter} fill="none" stroke="#FFFFFF" strokeWidth={simple ? MARK.letterWidthSimple : MARK.letterWidth} strokeLinecap="round" strokeLinejoin="round" />
        {!simple && (
          <path d={MARK.wavePath} fill="none" stroke={MARK.wave} strokeWidth={MARK.waveWidth} strokeLinecap="round" />
        )}
      </svg>
    ),
    {
      width: iconSize,
      height: iconSize,
    }
  )
}

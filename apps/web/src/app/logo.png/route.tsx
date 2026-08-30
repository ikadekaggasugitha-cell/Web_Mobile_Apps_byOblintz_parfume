import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Raster logo for schema.org Organization markup (Google requires a raster
// format — PNG/JPG — and prefers a light background). Served at /logo.png.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf7f2',
          color: '#7a1f2b',
          fontFamily: 'serif',
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: 4,
        }}
      >
        OBLINTZ
      </div>
    ),
    { width: 600, height: 600 }
  );
}

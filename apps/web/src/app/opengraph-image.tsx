import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'OBLINTZ — Parfum Original Premium';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #1c1917 0%, #763028 55%, #a56f29 100%)',
          color: '#faf7f2',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontSize: 44,
            letterSpacing: 12,
            textTransform: 'uppercase',
            color: '#dcbb75',
          }}
        >
          Parfum Original Premium
        </div>
        <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: 6 }}>
          OBLINTZ
        </div>
        <div style={{ fontSize: 36, color: '#e7ded3', marginTop: 8 }}>
          Pria · Wanita · Unisex
        </div>
      </div>
    ),
    { ...size }
  );
}

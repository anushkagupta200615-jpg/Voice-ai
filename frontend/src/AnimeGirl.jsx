// Full-screen anime girl, drawn entirely in SVG (no image files).
// `status` (idle | listening | thinking | speaking) drives her:
// she blinks when idle, her mouth moves and hand waves while speaking,
// she tilts her head while thinking, and her mic glows while listening.
// Clicking her while she speaks stops the audio (onStop).
//
// Custom image: drop aria.png / aria.jpg / aria.webp into
// frontend/src/assets/ to replace the drawing with your own picture.
const customImages = import.meta.glob('./assets/aria.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const customImage = Object.values(customImages)[0]

export default function AnimeGirl({ status, onStop }) {
  const speaking = status === 'speaking'
  const stoppable = speaking

  if (customImage) {
    return (
      <img
        className={`anime-girl anime-photo ${status}`}
        src={customImage}
        alt="Aria"
        onClick={stoppable ? onStop : undefined}
        title={stoppable ? 'Tap to stop speaking' : undefined}
      />
    )
  }

  return (
    <svg
      className={`anime-girl ${status} ${stoppable ? 'stoppable' : ''}`}
      viewBox="0 0 400 620"
      onClick={stoppable ? onStop : undefined}
      aria-label="Aria, anime voice assistant"
    >
      <defs>
        <radialGradient id="iris" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#c9a4ff" />
          <stop offset="55%" stopColor="#7c4fd4" />
          <stop offset="100%" stopColor="#3f2478" />
        </radialGradient>
        <linearGradient id="jacket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5fe0" />
          <stop offset="100%" stopColor="#53348f" />
        </linearGradient>
        <linearGradient id="hairSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a98fe8" />
          <stop offset="100%" stopColor="#8b6cd9" />
        </linearGradient>
      </defs>

      {/* ── twin tails (far back) ─────────────────────────── */}
      <path d="M96 140 Q34 270 66 440 Q84 530 60 610 L112 610 Q134 480 114 330 Q104 215 122 150 Z" fill="#7a58c9" />
      <path d="M304 140 Q366 270 334 440 Q316 530 340 610 L288 610 Q266 480 286 330 Q296 215 278 150 Z" fill="#7a58c9" />
      {/* tail highlights */}
      <path d="M88 220 Q70 330 84 440" stroke="#a98fe8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M312 220 Q330 330 316 440" stroke="#a98fe8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* hair ties */}
      <circle cx="103" cy="148" r="11" fill="#ff8fb3" />
      <circle cx="297" cy="148" r="11" fill="#ff8fb3" />

      {/* ── back hair ─────────────────────────────────────── */}
      <path d="M200 42 Q96 52 88 190 Q84 300 108 400 L292 400 Q316 300 312 190 Q304 52 200 42 Z" fill="#6d4fb8" />

      {/* ── neck + torso ──────────────────────────────────── */}
      <rect x="184" y="286" width="32" height="48" rx="14" fill="#f2c4a4" />
      <path d="M108 620 Q112 468 152 424 Q176 398 200 398 Q224 398 248 424 Q288 468 292 620 Z" fill="url(#jacket)" />
      {/* collar + zip */}
      <path d="M176 404 L200 442 L224 404 L212 398 L200 416 L188 398 Z" fill="#efe6ff" />
      <path d="M200 442 L200 618" stroke="#3f2478" strokeWidth="4" opacity="0.55" />
      {/* jacket shading */}
      <path d="M128 620 Q132 500 158 444" stroke="#3f2478" strokeWidth="8" fill="none" opacity="0.25" strokeLinecap="round" />
      <path d="M272 620 Q268 500 242 444" stroke="#3f2478" strokeWidth="8" fill="none" opacity="0.25" strokeLinecap="round" />

      {/* ── face ──────────────────────────────────────────── */}
      <path d="M122 192 Q122 118 200 110 Q278 118 278 192 Q278 254 240 282 Q218 298 200 298 Q182 298 160 282 Q122 254 122 192 Z" fill="#ffe3d0" />
      {/* face side shadow under bangs */}
      <path d="M126 200 Q128 160 146 138 Q132 176 134 210 Z" fill="#f5c9ad" opacity="0.7" />
      <path d="M274 200 Q272 160 254 138 Q268 176 266 210 Z" fill="#f5c9ad" opacity="0.7" />

      {/* blush */}
      <ellipse cx="142" cy="238" rx="15" ry="7" fill="#ffb3c0" opacity="0.55" />
      <ellipse cx="258" cy="238" rx="15" ry="7" fill="#ffb3c0" opacity="0.55" />
      {/* nose + mouth */}
      <circle cx="200" cy="234" r="2.2" fill="#eaa584" />
      {speaking ? (
        <g className="mouth-talk">
          <ellipse cx="200" cy="258" rx="12" ry="9" fill="#8a4049" />
          <ellipse cx="200" cy="262" rx="7" ry="4" fill="#e58a8a" />
        </g>
      ) : (
        <path d="M186 255 Q200 265 214 255" stroke="#c05a64" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}

      {/* ── bangs (under the eyes layer, anime-style) ─────── */}
      <path
        d="M122 192 Q114 92 200 84 Q286 92 278 192
           Q264 158 248 180 Q238 148 220 174 Q210 146 196 172
           Q184 144 168 178 Q156 152 144 186 Q134 164 122 192 Z"
        fill="url(#hairSheen)"
      />
      {/* bang highlights */}
      <path d="M160 100 Q140 120 136 150" stroke="#c9b3f5" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M240 100 Q260 120 264 150" stroke="#c9b3f5" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* ── eyes drawn over the bangs (anime transparency) ── */}
      <g className="eye">
        <ellipse cx="158" cy="207" rx="23" ry="18" fill="#fff" />
        <ellipse cx="158" cy="208" rx="14" ry="16" fill="url(#iris)" />
        <ellipse cx="158" cy="209" rx="6" ry="8" fill="#241245" />
        <circle cx="152" cy="201" r="4.5" fill="#fff" />
        <circle cx="164" cy="214" r="2.2" fill="#fff" opacity="0.9" />
        <path d="M134 198 Q158 182 182 197 L185 191" stroke="#3a2b52" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M140 222 Q158 228 176 222" stroke="#d9bef2" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      <g className="eye">
        <ellipse cx="242" cy="207" rx="23" ry="18" fill="#fff" />
        <ellipse cx="242" cy="208" rx="14" ry="16" fill="url(#iris)" />
        <ellipse cx="242" cy="209" rx="6" ry="8" fill="#241245" />
        <circle cx="236" cy="201" r="4.5" fill="#fff" />
        <circle cx="248" cy="214" r="2.2" fill="#fff" opacity="0.9" />
        <path d="M218 197 Q242 182 266 198 L269 192" stroke="#3a2b52" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M224 222 Q242 228 260 222" stroke="#d9bef2" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      {/* brows */}
      <path d="M138 176 Q158 168 180 177" stroke="#5a3f85" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M220 177 Q242 168 262 176" stroke="#5a3f85" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* ── front side locks ──────────────────────────────── */}
      <path d="M118 182 Q100 270 114 370 Q120 430 102 478 Q142 446 140 344 Q138 240 134 196 Z" fill="#8b6cd9" />
      <path d="M282 182 Q300 270 286 370 Q280 430 298 478 Q258 446 260 344 Q262 240 266 196 Z" fill="#8b6cd9" />

      {/* ── headset ───────────────────────────────────────── */}
      <path d="M116 122 A 92 92 0 0 1 284 122" stroke="#2b2140" strokeWidth="11" fill="none" strokeLinecap="round" />
      <rect x="98" y="180" width="19" height="44" rx="9.5" fill="#2b2140" />
      <rect x="283" y="180" width="19" height="44" rx="9.5" fill="#2b2140" />
      <circle cx="107" cy="202" r="5" fill="#a86bff" opacity="0.8" />
      <circle cx="292" cy="202" r="5" fill="#a86bff" opacity="0.8" />
      <path d="M294 222 Q306 274 254 288" stroke="#2b2140" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle className="mic-tip" cx="248" cy="290" r="8" fill="#a86bff" />
    </svg>
  )
}

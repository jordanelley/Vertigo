function MountainBikeIllustration() {
  return (
    <svg
      className="mountain-bike"
      viewBox="0 0 300 180"
      width="260"
      height="156"
      role="img"
      aria-label="Cartoon illustration of a full-suspension mountain bike"
    >
      {/* rear wheel */}
      <circle cx="70" cy="130" r="42" fill="#f4f4f4" stroke="#222" strokeWidth="6" />
      <circle cx="70" cy="130" r="8" fill="#222" />
      {[0, 45, 90, 135].map((angle) => (
        <line
          key={`rear-${angle}`}
          x1={70 - 34 * Math.cos((angle * Math.PI) / 180)}
          y1={130 - 34 * Math.sin((angle * Math.PI) / 180)}
          x2={70 + 34 * Math.cos((angle * Math.PI) / 180)}
          y2={130 + 34 * Math.sin((angle * Math.PI) / 180)}
          stroke="#bbb"
          strokeWidth="2"
        />
      ))}

      {/* front wheel */}
      <circle cx="230" cy="130" r="42" fill="#f4f4f4" stroke="#222" strokeWidth="6" />
      <circle cx="230" cy="130" r="8" fill="#222" />
      {[0, 45, 90, 135].map((angle) => (
        <line
          key={`front-${angle}`}
          x1={230 - 34 * Math.cos((angle * Math.PI) / 180)}
          y1={130 - 34 * Math.sin((angle * Math.PI) / 180)}
          x2={230 + 34 * Math.cos((angle * Math.PI) / 180)}
          y2={130 + 34 * Math.sin((angle * Math.PI) / 180)}
          stroke="#bbb"
          strokeWidth="2"
        />
      ))}

      {/* rear suspension / seat stay + chain stay */}
      <path
        d="M 150 118 L 70 130 L 128 100"
        fill="none"
        stroke="#ff6b35"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* rear shock */}
      <line x1="128" y1="100" x2="118" y2="122" stroke="#888" strokeWidth="8" strokeLinecap="round" />
      <line x1="128" y1="100" x2="118" y2="122" stroke="#ddd" strokeWidth="3" strokeLinecap="round" />

      {/* seat tube */}
      <path
        d="M 150 118 L 128 100 L 118 55"
        fill="none"
        stroke="#ff6b35"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* seat */}
      <line x1="100" y1="52" x2="132" y2="48" stroke="#222" strokeWidth="8" strokeLinecap="round" />

      {/* down tube + top tube to head tube */}
      <path
        d="M 150 118 L 214 62 M 128 100 L 214 62"
        fill="none"
        stroke="#ff6b35"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* front suspension fork */}
      <line x1="214" y1="62" x2="230" y2="130" stroke="#888" strokeWidth="9" strokeLinecap="round" />
      <line x1="214" y1="62" x2="230" y2="130" stroke="#ddd" strokeWidth="4" strokeLinecap="round" />

      {/* handlebar */}
      <line x1="196" y1="52" x2="222" y2="58" stroke="#222" strokeWidth="7" strokeLinecap="round" />

      {/* crank + pedal */}
      <circle cx="150" cy="118" r="12" fill="#222" />
      <line x1="150" y1="118" x2="168" y2="132" stroke="#222" strokeWidth="5" strokeLinecap="round" />
      <line x1="150" y1="118" x2="132" y2="104" stroke="#222" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export default MountainBikeIllustration

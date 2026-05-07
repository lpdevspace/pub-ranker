/**
 * PintGlassLogo — Custom SVG brand mark for Pub Ranker.
 * Geometric pint glass silhouette. Works at 24px and 200px.
 * Uses currentColor so it adapts to any text colour context.
 *
 * Props:
 *   size    — number, rendered width/height in px (default: 36)
 *   className — extra classes
 *   showText  — bool, render "Pub Ranker" wordmark beside the glass (default: true)
 */
export default function PintGlassLogo({ size = 36, className = '', showText = true }) {
  return (
    <span
      className={`inline-flex items-center gap-2 select-none ${className}`}
      aria-label="Pub Ranker"
      role="img"
    >
      {/* SVG pint glass mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Glass body — tapered trapezoid */}
        <path
          d="M9 6 L11 30 H25 L27 6 Z"
          fill="currentColor"
          opacity="0.15"
          strokeLinejoin="round"
        />
        <path
          d="M9 6 L11 30 H25 L27 6 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Foam head */}
        <path
          d="M8.5 6 Q11 3 14 5 Q16 3 18 5 Q20 3 22 5 Q25 3 27.5 6 Z"
          fill="currentColor"
          opacity="0.85"
        />
        {/* Base line */}
        <line
          x1="10"
          y1="30"
          x2="26"
          y2="30"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Highlight — left edge shimmer */}
        <line
          x1="12.5"
          y1="9"
          x2="13.5"
          y2="26"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: size * 0.72,
            lineHeight: 1,
            color: 'var(--color-brand)',
            letterSpacing: '-0.01em',
          }}
        >
          Pub Ranker
        </span>
      )}
    </span>
  );
}

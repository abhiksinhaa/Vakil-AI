export default function AuthLawyerWalk() {
  return (
    <div className="auth-lawyer-layer" aria-hidden="true">
      <div className="auth-lawyer-track">
        <svg
          className="auth-lawyer-svg"
          viewBox="0 0 110 160"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lawyerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f5ecd8" />
              <stop offset="45%" stopColor="#e8e0d0" />
              <stop offset="100%" stopColor="#c9a84c" />
            </linearGradient>
            <linearGradient id="lawyerSuit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0e6cc" />
              <stop offset="100%" stopColor="#a88b3a" />
            </linearGradient>
          </defs>

          <g className="auth-lawyer-bob">
            {/* Legs */}
            <g className="auth-lawyer-legs--left">
              <path
                d="M42 118 L38 155 L48 155 L52 118 Z"
                className="auth-lawyer-body"
              />
            </g>
            <g className="auth-lawyer-legs--right">
              <path
                d="M62 118 L58 155 L68 155 L72 118 Z"
                className="auth-lawyer-body"
              />
            </g>

            {/* Left arm */}
            <path
              d="M32 78 Q18 88 16 102 L20 106 Q24 90 36 84 Z"
              className="auth-lawyer-body"
            />

            {/* Torso & suit */}
            <path
              d="M35 72 Q55 68 75 72 L78 118 Q55 124 32 118 Z"
              fill="url(#lawyerSuit)"
            />
            <path
              d="M52 72 L55 105 L48 105 Z"
              className="auth-lawyer-accent"
              opacity="0.85"
            />

            {/* Head — no facial features */}
            <ellipse cx="55" cy="48" rx="18" ry="20" className="auth-lawyer-body" />

            {/* Arm at side / pocket reach */}
            <g className="auth-lawyer-arm">
              <path
                d="M72 78 Q88 82 92 98 L88 102 Q82 88 70 84 Z"
                className="auth-lawyer-body"
              />
              <g className="auth-lawyer-scale" transform="translate(78, 8)">
                <line
                  x1="22"
                  y1="8"
                  x2="22"
                  y2="42"
                  stroke="#c9a84c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="4"
                  y1="42"
                  x2="40"
                  y2="42"
                  stroke="#e8e0d0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M4 42 Q4 28 14 24 Q22 20 22 8"
                  fill="none"
                  stroke="#c9a84c"
                  strokeWidth="2"
                />
                <path
                  d="M40 42 Q40 28 30 24 Q22 20 22 8"
                  fill="none"
                  stroke="#c9a84c"
                  strokeWidth="2"
                />
                <ellipse cx="14" cy="24" rx="10" ry="6" fill="#e8e0d0" opacity="0.9" />
                <ellipse cx="30" cy="24" rx="10" ry="6" fill="#e8e0d0" opacity="0.9" />
              </g>
            </g>

            {/* Briefcase hint */}
            <rect
              x="28"
              y="95"
              width="14"
              height="18"
              rx="2"
              fill="#c9a84c"
              opacity="0.35"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

'use client';

export default function AuthLawyerWalk() {
  return (
    <div className="auth-lawyer-layer" aria-hidden="true">
      <div className="auth-lawyer-track">
        <svg
          className="auth-lawyer-svg"
          viewBox="0 0 96 260"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lawyerSilhouette" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8f0dc" />
              <stop offset="35%" stopColor="#e8e0d0" />
              <stop offset="100%" stopColor="#b8943f" />
            </linearGradient>
            <linearGradient id="lawyerSuitDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4c4a0" />
              <stop offset="100%" stopColor="#8a7030" />
            </linearGradient>
            <linearGradient id="lawyerPants" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0d4b8" />
              <stop offset="100%" stopColor="#9a8040" />
            </linearGradient>
          </defs>

          <g className="auth-lawyer-figure">
            {/* Back leg (behind) */}
            <g className="auth-lawyer-leg auth-lawyer-leg--back">
              <path
                d="M38 168 L32 224 L42 226 L44 168 Z"
                fill="url(#lawyerPants)"
              />
              <path
                d="M34 228 L32 248 L44 248 L42 230 Z"
                fill="url(#lawyerSilhouette)"
                opacity="0.9"
              />
            </g>

            {/* Far arm — swings opposite to near leg */}
            <g className="auth-lawyer-arm auth-lawyer-arm--far">
              <path
                d="M30 78 L18 108 L22 110 L34 82 Z"
                fill="url(#lawyerSilhouette)"
              />
              <path
                d="M18 108 L12 128 L16 130 L22 110 Z"
                fill="url(#lawyerSilhouette)"
                opacity="0.95"
              />
            </g>

            {/* Jacket & torso — slim profile, structured shoulders */}
            <g className="auth-lawyer-torso">
              <path
                d="M38 58 L48 54 L58 60 L60 134 L54 142 L36 138 L34 130 L36 72 Z"
                fill="url(#lawyerSuitDark)"
              />
              <path
                d="M36 130 L34 148 L40 152 L54 148 L52 142 Z"
                fill="url(#lawyerSuitDark)"
                opacity="0.85"
              />
              {/* Lapels */}
              <path
                d="M42 60 L48 54 L54 74 L48 96 L40 78 Z"
                fill="url(#lawyerSilhouette)"
                opacity="0.5"
              />
              <path
                d="M54 60 L60 62 L58 96 L52 108 L50 76 Z"
                fill="url(#lawyerSilhouette)"
                opacity="0.35"
              />
              {/* Shirt gap */}
              <path
                d="M46 72 L50 100 L48 132 L44 132 L42 100 Z"
                fill="#0a0f1e"
                opacity="0.35"
              />
              {/* Tie */}
              <path
                d="M46 72 L50 72 L52 108 L48 118 L44 108 Z"
                className="auth-lawyer-tie"
              />
              <path
                d="M47 68 L49 68 L50 76 L48 80 L46 76 Z"
                className="auth-lawyer-tie"
              />
            </g>

            {/* Front leg — slim dress pant */}
            <g className="auth-lawyer-leg auth-lawyer-leg--front">
              <path
                d="M48 168 L44 226 L54 228 L56 168 Z"
                fill="url(#lawyerPants)"
              />
              <line
                x1="50"
                y1="175"
                x2="48"
                y2="220"
                stroke="#c9a84c"
                strokeWidth="0.6"
                opacity="0.25"
              />
              <path
                d="M46 228 L44 248 L58 248 L56 230 Z"
                fill="url(#lawyerSilhouette)"
                opacity="0.95"
              />
            </g>

            {/* Neck */}
            <path
              d="M42 48 L48 46 L52 56 L46 58 Z"
              fill="url(#lawyerSilhouette)"
            />

            {/* Head — oval jaw profile, not a circle */}
            <path
              d="M36 18 Q48 8 58 16 Q66 28 62 42 Q58 52 50 54 L44 52 Q38 48 36 38 Q34 28 36 18 Z"
              fill="url(#lawyerSilhouette)"
            />

            {/* Near arm + scale (shoulder → elbow → hand) */}
            <g className="auth-lawyer-arm auth-lawyer-arm--near">
              <path
                d="M54 76 L62 78 L64 100 L58 102 Z"
                fill="url(#lawyerSilhouette)"
              />
              <g className="auth-lawyer-forearm">
                <path
                  d="M62 100 L74 102 L72 122 L60 120 Z"
                  fill="url(#lawyerSilhouette)"
                />
                <g className="auth-lawyer-scale" transform="translate(70, 6)">
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="28"
                    stroke="#c9a84c"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="-14"
                    y1="28"
                    x2="14"
                    y2="28"
                    stroke="#e8e0d0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M-14 28 Q-14 16 -8 12 Q0 8 0 0"
                    fill="none"
                    stroke="#c9a84c"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M14 28 Q14 16 8 12 Q0 8 0 0"
                    fill="none"
                    stroke="#c9a84c"
                    strokeWidth="1.6"
                  />
                  <ellipse cx="-8" cy="12" rx="7" ry="5" fill="#e8e0d0" />
                  <ellipse cx="8" cy="12" rx="7" ry="5" fill="#e8e0d0" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

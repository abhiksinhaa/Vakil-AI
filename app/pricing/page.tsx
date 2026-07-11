'use client'
export default function PricingPage() {
  return (
    <>
      <style>{`
        @keyframes glitter {
          0%,100% { opacity:1; transform: scale(1) rotate(0deg); }
          25% { opacity:.3; transform: scale(1.4) rotate(20deg); }
          50% { opacity:.8; transform: scale(0.7) rotate(-15deg); }
          75% { opacity:.4; transform: scale(1.3) rotate(25deg); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .spark {
          position: absolute;
          animation: glitter 1.8s ease-in-out infinite;
          font-size: 1.3rem;
          pointer-events: none;
        }
        .float-card {
          animation: float 4s ease-in-out infinite;
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #c9a84c 0%,
            #fff8e7 40%,
            #c9a84c 60%,
            #e3c47e 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#0a0f1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Glitter particles */}
        {[
          { top:'8%',  left:'10%', delay:'0s'   },
          { top:'12%', left:'82%', delay:'.4s'  },
          { top:'25%', left:'92%', delay:'.8s'  },
          { top:'70%', left:'6%',  delay:'1.1s' },
          { top:'78%', left:'78%', delay:'.3s'  },
          { top:'45%', left:'95%', delay:'.6s'  },
          { top:'55%', left:'3%',  delay:'1.4s' },
          { top:'88%', left:'48%', delay:'.2s'  },
          { top:'20%', left:'48%', delay:'.9s'  },
          { top:'60%', left:'60%', delay:'1.6s' },
          { top:'35%', left:'18%', delay:'.5s'  },
          { top:'90%', left:'20%', delay:'1.2s' },
        ].map((p, i) => (
          <span
            key={i}
            className="spark"
            style={{
              top: p.top,
              left: p.left,
              animationDelay: p.delay,
              color: i % 2 === 0 ? '#c9a84c' : '#e3c47e',
            }}
          >
            {i % 3 === 0 ? '✦' : i % 3 === 1 ? '✸' : '✺'}
          </span>
        ))}

        {/* Card */}
        <div className="float-card" style={{
          background: '#0f1525',
          border: '1px solid #c9a84c',
          borderRadius: '28px',
          padding: '60px 44px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 80px rgba(201,168,76,0.18), 0 0 160px rgba(201,168,76,0.06)',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* Top sparkles */}
          <div style={{ fontSize: '2rem', marginBottom: '24px', letterSpacing: '8px' }}>
            <span className="spark" style={{ position:'relative', top:0, left:0, animationDelay:'0s' }}>✨</span>
            <span className="spark" style={{ position:'relative', top:0, left:0, animationDelay:'.5s', margin:'0 8px' }}>✨</span>
            <span className="spark" style={{ position:'relative', top:0, left:0, animationDelay:'1s' }}>✨</span>
          </div>

          <h1 className="shimmer-text" style={{
            fontSize: '1.9rem',
            fontWeight: 700,
            marginBottom: '18px',
            lineHeight: 1.3,
          }}>
            Premium Version<br />Coming Soon
          </h1>

          <p style={{
            color: '#e8e0d0',
            opacity: 0.7,
            fontSize: '1.05rem',
            lineHeight: 1.75,
            marginBottom: '40px',
          }}>
            We're crafting something extraordinary for you.<br />
            Stay tuned.
          </p>

          <a href="/dashboard" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #c9a84c, #e3c47e)',
            color: '#0a0f1e',
            borderRadius: '12px',
            padding: '14px 36px',
            fontWeight: 700,
            fontSize: '0.95rem',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
          }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    </>
  )
}

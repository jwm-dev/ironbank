// ============================================
// Intro Animation Component  
// Logo moves to header position, borders draw in, then hands off to real UI
// ============================================

import { useState, useEffect, useRef, useLayoutEffect } from 'react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number>();

  // Hide scrollbar IMMEDIATELY
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    
    return () => {
      html.style.overflow = '';
      body.style.overflow = '';
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const duration = 2800; // Slightly longer for more deliberate feel
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - hand off to real UI instantly
        onComplete();
      }
    };

    const startDelay = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 50);

    return () => {
      clearTimeout(startDelay);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [onComplete]);

  // Easing functions
  const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const smoothStep = (start: number, end: number, t: number) => {
    const x = Math.max(0, Math.min((t - start) / (end - start), 1));
    return x * x * (3 - 2 * x);
  };

  // ===== ANIMATION PHASES =====
  // 0.00-0.12: Flag fades in
  // 0.08-0.25: Logo text reveals
  // 0.22-0.55: Logo moves to final position + morphs
  // 0.50-0.85: Borders draw in (deliberate, visible)
  // 0.80-0.95: Background fades out
  // 0.95-1.00: Hold at final state (logo stays, no fade!)

  const flagOpacity = smoothStep(0, 0.12, progress);
  const logoReveal = smoothStep(0.08, 0.25, progress);
  const moveProgress = easeInOutQuart(smoothStep(0.22, 0.55, progress));
  const glowFade = 1 - smoothStep(0.18, 0.50, progress);
  
  // Border drawing - slower and more deliberate
  const borderProgress = easeOutCubic(smoothStep(0.50, 0.85, progress));
  
  // Background fades but logo does NOT fade - it stays at 100%
  const bgOpacity = 1 - smoothStep(0.80, 0.95, progress);

  // ===== FINAL POSITION - must match header logo EXACTLY =====
  // Header: left-3 (12px) + px-2 (8px) = 20px left edge for flag
  // Header: top-6 (24px) + py-1.5 (6px) = 30px top edge for flag  
  // Flag size: 28x20px -> center at x=34, y=40

  const screenCenterX = typeof window !== 'undefined' ? window.innerWidth / 2 : 720;
  const screenCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 450;
  
  const finalFlagCenterX = 34;
  const finalFlagCenterY = 40;

  const flagCenterX = screenCenterX + (finalFlagCenterX - screenCenterX) * moveProgress;
  const flagCenterY = screenCenterY + (finalFlagCenterY - screenCenterY) * moveProgress;

  // Visual property interpolation
  const flagWidth = 72 - moveProgress * 44;   // 72 -> 28
  const flagHeight = 52 - moveProgress * 32;  // 52 -> 20
  const gap = 20 - moveProgress * 10;         // 20 -> 10
  const textSize = 28 - moveProgress * 16;    // 28 -> 12
  const borderWidth = 2 - moveProgress * 1;   // 2 -> 1
  const borderRadius = 8 - moveProgress * 6;  // 8 -> 2
  const borderOpacity = 0.4 - moveProgress * 0.2; // 0.4 -> 0.2

  // Text container width - enough for full "IRONBANK" at any size
  const textContainerWidth = logoReveal * (260 - moveProgress * 150);

  // Border line lengths for drawing animation
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const rightBorderLength = windowWidth - 190;
  
  return (
    <div 
      className="fixed inset-0 z-[200] overflow-hidden"
      style={{ pointerEvents: bgOpacity < 0.05 ? 'none' : 'auto' }}
    >
      {/* Dark background - fades to reveal UI underneath */}
      <div 
        className="absolute inset-0 bg-dark-500"
        style={{ opacity: bgOpacity }}
      />

      {/* Background glow */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: glowFade }}
      >
        <div 
          className="w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(36,137,199,0.2) 0%, rgba(241,175,21,0.12) 45%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* ===== HEADER DRAWING ANIMATION ===== */}
      {/* Notch is always fully visible, bar draws from left to right */}
      {borderProgress > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Left section - header + notch as one piece (always full opacity) */}
          <div 
            className="absolute top-0 left-0 w-[190px] h-[66px] bg-dark-400/80 backdrop-blur-xl"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 40px, 190px 40px, 166px 66px, 0 66px)',
            }}
          />
          
          {/* Right section of header bar - draws from left to right */}
          <div 
            className="absolute top-0 left-[190px] h-10 bg-dark-400/80 backdrop-blur-xl"
            style={{ 
              width: `${rightBorderLength * borderProgress}px`,
            }}
          />
          
          {/* Right horizontal border - draws left to right */}
          <div 
            className="absolute top-10 left-[190px] h-px bg-white/5"
            style={{ 
              width: `${rightBorderLength * borderProgress}px`,
            }}
          />
          
          {/* Negative space - page color showing through the curve with border */}
          <div className="absolute top-10 left-[166px] w-6 h-[26px] overflow-hidden">
            <div className="absolute inset-0 bg-dark-500" />
            <div 
              className="absolute inset-0 bg-dark-400/80 backdrop-blur-xl rounded-br-[24px]"
              style={{ boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.05)' }}
            />
          </div>
          
          {/* Bottom notch border */}
          <div className="absolute top-[66px] left-0 w-[166px] h-px bg-white/5" />
        </div>
      )}

      {/* ===== LOGO - STAYS AT 100% OPACITY ===== */}
      {/* Flag */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: flagCenterX,
          top: flagCenterY,
          transform: 'translate(-50%, -50%)',
          // NO opacity fade here - stays visible!
        }}
      >
        <div className="relative">
          {/* Glow behind flag */}
          <div 
            className="absolute -inset-6 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(36,137,199,0.45) 0%, rgba(241,175,21,0.45) 100%)',
              filter: 'blur(25px)',
              opacity: glowFade * 0.85,
            }}
          />
          <div 
            className="relative overflow-hidden"
            style={{
              width: `${flagWidth}px`,
              height: `${flagHeight}px`,
              borderRadius: `${borderRadius}px`,
              border: `${borderWidth}px solid rgba(255,255,255,${borderOpacity})`,
              boxShadow: glowFade > 0 ? `0 20px 40px -10px rgba(36,137,199,${0.35 * glowFade})` : 'none',
              opacity: flagOpacity,
            }}
          >
            <img 
              src="/Commonwealth_flag.png" 
              alt="Commonwealth Flag" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Text */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: flagCenterX + flagWidth / 2 + gap,
          top: flagCenterY,
          transform: 'translateY(-50%)',
          width: `${textContainerWidth}px`,
          opacity: logoReveal, // Only fades in, never out
          overflow: 'hidden',
        }}
      >
        <span 
          className="tracking-wider text-cw-gold-500 whitespace-nowrap block"
          style={{ 
            fontFamily: '"Press Start 2P", cursive',
            fontSize: `${textSize}px`,
          }}
        >
          IRONBANK
        </span>
      </div>
    </div>
  );
}

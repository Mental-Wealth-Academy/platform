'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from './LandingPage.module.css';

export const RotatingTextSection: React.FC = () => {
  const texts = useMemo(() => [
    'Decentralized Science',
    'Academia',
    'AI Research'
  ], []);
  const [step, setStep] = useState(0);
  const currentIndex = step % texts.length;
  const [currentWidth, setCurrentWidth] = useState(0);
  const [textWidths, setTextWidths] = useState<number[]>([]);
  const textItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const measureAllWidths = () => {
      const fontSize = window.innerWidth >= 768 ? '2.65rem' : '1.2rem';
      const widths = texts.map((text) => {
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'nowrap';
        span.style.fontSize = fontSize;
        span.style.fontFamily = 'var(--font-primary)';
        span.style.fontWeight = 'inherit';
        span.style.letterSpacing = 'normal';
        span.style.textRendering = 'optimizeLegibility';
        (span.style as any).webkitFontSmoothing = 'antialiased';
        (span.style as any).mozOsxFontSmoothing = 'grayscale';
        span.textContent = text;
        document.body.appendChild(span);

        const rect = span.getBoundingClientRect();
        const width = Math.ceil(rect.width);

        document.body.removeChild(span);

        const percentageBuffer = Math.ceil(width * 0.05);
        const fixedBuffer = window.innerWidth >= 768 ? 20 : 10;
        const finalWidth = width + percentageBuffer + fixedBuffer;

        return finalWidth;
      });
      setTextWidths(widths);
    };

    measureAllWidths();
    window.addEventListener('resize', measureAllWidths);
    return () => window.removeEventListener('resize', measureAllWidths);
  }, [texts]);

  useEffect(() => {
    if (textItemRefs.current[currentIndex]) {
      const element = textItemRefs.current[currentIndex];
      if (element) {
        const rect = element.getBoundingClientRect();
        const actualWidth = Math.ceil(rect.width);
        if (actualWidth > currentWidth) {
          setCurrentWidth(actualWidth + 10);
        }
      }
    }
  }, [currentIndex, currentWidth]);

  useEffect(() => {
    if (textWidths.length > 0 && textWidths[currentIndex]) {
      setCurrentWidth(textWidths[currentIndex]);
    }
  }, [currentIndex, textWidths]);

  const degreesPerItem = 360 / texts.length;
  const rotation = step * degreesPerItem;

  return (
    <div className={styles.rotatingTextContainer}>
      <div className={styles.rotatingTextLines}>
        <h3 className={styles.rotatingTextHeading}>
          <span className={styles.rotatingTextStatic}>Advancing</span>
          <div
            className={styles.rotatingTextWrapper}
            style={{
              width: currentWidth > 0 ? `${currentWidth}px` : 'auto',
              perspective: '1000px',
              overflow: 'visible',
              display: 'inline-block',
              verticalAlign: 'middle',
              transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div
              className={styles.rotatingTextInner}
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${-rotation}deg)`,
                transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                width: '100%',
                height: '100%'
              }}
            >
              {texts.map((text, index) => {
                const itemRotation = index * degreesPerItem;
                return (
                  <div
                    key={index}
                    ref={(el) => {
                      textItemRefs.current[index] = el;
                    }}
                    className={styles.rotatingTextItem}
                    style={{
                      transform: `translateX(-50%) rotateX(${itemRotation}deg) translateZ(var(--rotating-tz, 60px))`,
                      backfaceVisibility: 'hidden',
                      width: 'auto',
                      left: '50%',
                      transformOrigin: 'center center'
                    }}
                  >
                    {text}
                  </div>
                );
              })}
            </div>
          </div>
        </h3>
        <p className={styles.rotatingTextStaticLine}>through quests, rewards, and an AI who remembers</p>
      </div>
    </div>
  );
};

export default RotatingTextSection;

'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from './motion';

interface CounterStatProps {
  number: string;
  label: string;
  className?: string;
  numberClassName?: string;
  labelClassName?: string;
  duration?: number;
}

function easeOutExpo(p: number) {
  return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
}

/** Parses "2,400+" → { value: 2400, decimals: 0, suffix: '+' } and "5.0" → { value: 5, decimals: 1, suffix: '' }. */
export function parseCounter(input: string) {
  const suffix = input.replace(/[\d.,\s]/g, '');
  const numeric = input.replace(/[^\d.]/g, '');
  const value = Number.parseFloat(numeric);
  const decimals = numeric.includes('.') ? numeric.split('.')[1].length : 0;
  return { value: Number.isFinite(value) ? value : 0, decimals, suffix };
}

export function formatCounter(value: number, decimals: number) {
  // en-US grouping matches the site's own "2,400+" copy (en-ZA would render "2 400" / "5,0").
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function CounterStat({
  number,
  label,
  className = 'text-center',
  numberClassName = 'text-4xl md:text-5xl font-black text-white mb-1',
  labelClassName = 'text-sm text-cyan-200 font-medium',
  duration = 1800,
}: CounterStatProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0.5);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  const { value, decimals, suffix } = parseCounter(number);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(value * easeOutExpo(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <div ref={ref} className={className}>
      <div className={numberClassName}>
        {formatCounter(display, decimals)}{suffix}
      </div>
      <p className={labelClassName}>{label}</p>
    </div>
  );
}

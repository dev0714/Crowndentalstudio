'use client';

import { useState, useEffect, useRef } from 'react';

interface CounterStatProps {
  number: string;
  label: string;
}

export function CounterStat({ number, label }: CounterStatProps) {
  const [displayNumber, setDisplayNumber] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    // Extract the numeric part from the string (e.g., "2,400+" -> 2400)
    const numericValue = parseInt(number.replace(/[^0-9]/g, ''), 10);
    
    if (isNaN(numericValue)) return;

    hasAnimated.current = true;
    const duration = 2000; // 2 seconds animation
    const startTime = Date.now();
    const increment = numericValue / (duration / 16); // Assuming 60fps

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * numericValue);
      
      setDisplayNumber(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [number]);

  // Format the number with commas
  const formattedDisplay = displayNumber.toLocaleString();
  const suffix = number.includes('+') ? '+' : '';

  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-black text-white mb-1">
        {formattedDisplay}{suffix}
      </div>
      <p className="text-sm text-cyan-200 font-medium">{label}</p>
    </div>
  );
}

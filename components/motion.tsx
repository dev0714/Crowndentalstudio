'use client'

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'

interface AnimatedProps {
  children: ReactNode
  className?: string
  delay?: number
  style?: CSSProperties
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

export function FadeInUp({ children, className, delay = 0, style }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(60px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function FadeInLeft({ children, className, delay = 0 }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0)' : 'translateX(-60px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

export function FadeInRight({ children, className, delay = 0 }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0)' : 'translateX(60px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

export function ScaleIn({ children, className, delay = 0 }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'scale(1)' : 'scale(0.85)',
        transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

export function StaggerContainer({ children, className }: AnimatedProps) {
  return <div className={className}>{children}</div>
}

export function StaggerItem({ children, className, delay = 0 }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(50px)',
        transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

export function HeroText({ children, className, delay = 0 }: AnimatedProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay * 1000 + 50)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className={className}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(80px)',
        transition: `opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)`,
      }}
    >
      {children}
    </div>
  )
}

export function FloatingBlob({ className }: { className?: string }) {
  return <div className={`${className} animate-blob`} />
}

export function FloatingBlobAlt({ className }: { className?: string }) {
  return <div className={`${className} animate-blob-alt`} />
}

// Floating card wrapper with CSS animation
export function FloatCard({ children, className, animDelay = 0 }: { children: ReactNode; className?: string; animDelay?: number }) {
  return (
    <div
      className={className}
      style={{ animation: `floatCard 5s ease-in-out ${animDelay}s infinite` }}
    >
      {children}
    </div>
  )
}

// Re-export a lightweight motion-like div for simple cases
export const motion = {
  div: ({ children, className, style, animate, transition, initial, ...rest }: any) => (
    <div className={className} style={style} {...rest}>{children}</div>
  ),
}

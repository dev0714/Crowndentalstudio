'use client'

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'

interface AnimatedProps {
  children: ReactNode
  className?: string
  delay?: number
  style?: CSSProperties
}

const EASE = 'cubic-bezier(0.22,1,0.36,1)'

/** Flips to true once the element scrolls into view (once). Reduced-motion users see content immediately. */
export function useInView<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function transition(delay: number, duration = 0.7) {
  return `opacity ${duration}s ${EASE} ${delay}s, transform ${duration}s ${EASE} ${delay}s`
}

export function FadeInUp({ children, className, delay = 0, style }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(40px)', transition: transition(delay), ...style }}>
      {children}
    </div>
  )
}

export function FadeInLeft({ children, className, delay = 0, style }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateX(0)' : 'translateX(-40px)', transition: transition(delay), ...style }}>
      {children}
    </div>
  )
}

export function FadeInRight({ children, className, delay = 0, style }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateX(0)' : 'translateX(40px)', transition: transition(delay), ...style }}>
      {children}
    </div>
  )
}

export function ScaleIn({ children, className, delay = 0, style }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? 'scale(1)' : 'scale(0.94)', transition: transition(delay, 0.6), ...style }}>
      {children}
    </div>
  )
}

/**
 * Real stagger: each direct child (typically a StaggerItem) receives an ascending `delay`
 * unless it sets its own, so grids arrive left-to-right instead of all at once.
 */
export function StaggerContainer({ children, className, step = 0.09 }: AnimatedProps & { step?: number }) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child
        const el = child as ReactElement<{ delay?: number }>
        return el.props.delay == null ? cloneElement(el, { delay: i * step }) : el
      })}
    </div>
  )
}

export function StaggerItem({ children, className, delay = 0, style }: AnimatedProps) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(28px)', transition: transition(delay, 0.65), ...style }}>
      {children}
    </div>
  )
}

/**
 * Cinematic headline: each line rises from behind an invisible mask, 130ms apart.
 * Pure CSS (`.reveal-mask` / `.reveal-line` in globals.css), so it plays before hydration.
 */
export function RevealLines({
  lines,
  as: Tag = 'h1',
  className,
  delay = 0,
}: {
  lines: ReactNode[]
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
  className?: string
  delay?: number
}) {
  return (
    <Tag className={className} style={{ ['--d' as string]: `${delay}ms` } as CSSProperties}>
      {lines.map((line, i) => (
        <span key={i} className="reveal-mask">
          <span className="reveal-line" style={{ ['--i' as string]: i } as CSSProperties}>{line}</span>
        </span>
      ))}
    </Tag>
  )
}

/** Slow filmic zoom-and-drift on a full-bleed photo. Wrap a positioned container holding a `fill` Image. */
export function KenBurns({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`ken-burns ${className ?? ''}`}>{children}</div>
}

/** Scroll-scrubbed depth: the child drifts slightly slower than the page (static where unsupported). */
export function Parallax({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`parallax ${className ?? ''}`}>{children}</div>
}

/** Mount-time fade used for supporting hero copy; `delay` in ms. */
export function FadeUp({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`fade-up ${className ?? ''}`} style={{ ['--d' as string]: `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  )
}

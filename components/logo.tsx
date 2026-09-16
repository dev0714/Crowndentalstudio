import Image from 'next/image'

interface LogoProps {
  /** `icon` is the mark alone; `text` is the wordmark alone; `full` is mark + wordmark + tagline. */
  variant?: 'full' | 'icon' | 'text'
  className?: string
  /** Colour the wordmark for a dark background. */
  onDark?: boolean
}

export const BRAND_TAGLINE = 'We Bridge The Gap'

/** The Crown Dental Studio mark: teal disc, blue ring and tooth outline. Renders crisp at any size. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/brand/crown-mark.svg"
      alt="Crown Dental Studio"
      width={220}
      height={210}
      priority
      className={className}
    />
  )
}

export function Logo({ variant = 'full', className = '', onDark = false }: LogoProps) {
  if (variant === 'icon') {
    return <LogoMark className={className} />
  }

  const wordmark = onDark ? 'text-white' : 'text-[#1f7f86]'
  const tagline = onDark ? 'text-teal-light' : 'text-[#17b6c4]'

  if (variant === 'text') {
    return (
      <span className={`font-display font-medium uppercase tracking-[0.12em] ${wordmark} ${className}`}>
        Crown Dental Studio
      </span>
    )
  }

  return (
    <span className={`inline-flex flex-col items-center text-center ${className}`}>
      <LogoMark className="h-24 w-auto" />
      <span className={`mt-2 font-display font-medium uppercase tracking-[0.12em] text-[26px] leading-none ${wordmark}`}>
        Crown Dental Studio
      </span>
      <span className={`mt-1.5 font-body font-semibold text-[13px] ${tagline}`}>{BRAND_TAGLINE}</span>
    </span>
  )
}

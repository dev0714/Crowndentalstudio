import Image from 'next/image'

interface LogoProps {
  variant?: 'full' | 'icon' | 'text'
  className?: string
}

export function Logo({ variant = 'full', className = '' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <Image
        src="/crown-dental-logo.png"
        alt="Crown Dental Studio"
        width={40}
        height={40}
        className={className}
      />
    )
  }

  if (variant === 'text') {
    return (
      <Image
        src="/crown-dental-logo.png"
        alt="Crown Dental Studio"
        width={180}
        height={80}
        className={className}
      />
    )
  }

  return (
    <Image
      src="/crown-dental-logo.png"
      alt="Crown Dental Studio"
      width={200}
      height={80}
      className={className}
    />
  )
}

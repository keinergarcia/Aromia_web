import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const text = size === 'sm' ? 'text-lg' : 'text-xl'
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt="Logo de AROMIA"
        className={cn(
          'rounded-xl object-contain',
          box,
        )}
      />
      <span className={cn('font-extrabold tracking-tight text-white', text)}>
        AROMIA
      </span>
    </div>
  )
}
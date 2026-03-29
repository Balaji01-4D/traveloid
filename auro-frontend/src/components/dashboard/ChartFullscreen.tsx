import { useEffect, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function ChartFullscreen({
  title,
  className,
  children,
}: {
  title?: string
  className?: string
  children: (isFullscreen: boolean) => ReactNode
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isFullscreen])

  return (
    <div
      className={cn(
        'relative',
        isFullscreen && 'fixed inset-0 z-50 bg-background p-4 md:p-6',
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {title ? <p className="text-xs text-muted-foreground">{title}</p> : <span />}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="gap-2"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        </Button>
      </div>

      {children(isFullscreen)}
    </div>
  )
}
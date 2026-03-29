import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Image as ImageIcon, MapPinned, Plus, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getPlaces, type Place } from '@/lib/api'

const FALLBACK_IMAGE =
  'https://cdn.shadcnstudio.com/ss-assets/components/card/image-2.png?height=280&format=auto'

type SortBy = 'capacity' | 'crowd' | 'name'

function getLiveCrowdPercent(placeId: number) {
  return ((placeId * 37) % 81) + 12
}

function getCrowdTone(percent: number) {
  if (percent < 45) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  }

  if (percent < 75) {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }

  return 'bg-rose-100 text-rose-800 border-rose-200'
}

function getSparklinePoints(seed: number) {
  const values = Array.from({ length: 12 }).map((_, index) => {
    const phase = (seed % 7) * 0.32
    return 58 + Math.sin(index * 0.65 + phase) * 24 + ((seed + index * 13) % 9)
  })

  return values
    .map((value, index) => {
      const x = (index / 11) * 180
      const y = 54 - (value / 100) * 42
      return `${x},${Math.max(8, Math.min(52, y))}`
    })
    .join(' ')
}

export default function PlacesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('crowd')

  useEffect(() => {
    async function fetchPlaces() {
      try {
        const { places: data } = await getPlaces()
        setPlaces(data)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaces()
  }, [])

  useEffect(() => {
    if (searchParams.get('created') !== '1') {
      return
    }

    toast.success('Place added and synced into live monitoring.')
    const next = new URLSearchParams(searchParams)
    next.delete('created')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const visiblePlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const filtered = places.filter((place) => {
      if (!normalizedQuery) {
        return true
      }

      const coords = `${place.latitude},${place.longitude}`
      return (
        place.name.toLowerCase().includes(normalizedQuery) ||
        coords.toLowerCase().includes(normalizedQuery)
      )
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (sortBy === 'capacity') {
        return b.capacity - a.capacity
      }

      return getLiveCrowdPercent(b.id) - getLiveCrowdPercent(a.id)
    })
  }, [places, query, sortBy])

  return (
    <div className='space-y-8 p-8'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='text-4xl font-extrabold tracking-tight'>Places</h1>
          <p className='text-sm text-muted-foreground/80 md:text-base'>
            Manage places with live crowd context, capacity, and quick analysis access.
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <div className='hidden items-center gap-2 rounded-lg border border-black/8 bg-white/75 px-3 py-2 shadow-[0_8px_22px_-18px_rgba(18,18,28,0.5)] backdrop-blur md:flex'>
            <SlidersHorizontal className='h-4 w-4 text-muted-foreground' />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search by name or coordinates'
              className='h-8 w-56 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0'
            />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className='h-8 rounded-md border border-black/10 bg-background px-2 text-xs font-medium outline-none transition-colors focus:border-black/20'
              aria-label='Sort places'
            >
              <option value='capacity'>Capacity</option>
              <option value='crowd'>Crowd</option>
              <option value='name'>Name</option>
            </select>
          </div>

          <Button asChild>
            <Link to='/dashboard/places/new'>
              <Plus className='mr-2 h-4 w-4' />
              Add New Place
            </Link>
          </Button>
        </div>
      </div>

      <div className='flex items-center gap-2 rounded-lg border border-black/8 bg-white/70 p-2 shadow-[0_8px_22px_-18px_rgba(18,18,28,0.45)] md:hidden'>
        <SlidersHorizontal className='h-4 w-4 text-muted-foreground' />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search places'
          className='h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0'
        />
      </div>

      {loading ? (
        <div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className='surface-card pt-0'>
              <Skeleton className='h-44 w-full rounded-t-xl rounded-b-none' />
              <CardHeader className='space-y-3'>
                <Skeleton className='h-5 w-2/3' />
                <Skeleton className='h-4 w-1/2' />
                <Skeleton className='h-4 w-1/3' />
              </CardHeader>
              <CardFooter className='gap-3'>
                <Skeleton className='h-9 flex-1' />
                <Skeleton className='h-9 w-10' />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : visiblePlaces.length === 0 ? (
        <Card className='surface-card mx-auto max-w-xl text-center'>
          <CardHeader>
            <CardTitle className='text-2xl font-bold'>No places found</CardTitle>
            <CardDescription className='text-sm text-muted-foreground/80'>
              Create your first place or adjust filters to reveal matching locations.
            </CardDescription>
          </CardHeader>
          <CardFooter className='justify-center'>
            <Button asChild>
              <Link to='/dashboard/places/new'>
                <Plus className='mr-2 h-4 w-4' />
                Add First Place
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
          {visiblePlaces.map((place, index) => {
            const imageLink = place.image_link || FALLBACK_IMAGE
            const mapLink = `https://www.google.com/maps?q=${place.latitude},${place.longitude}`
            const livePercent = getLiveCrowdPercent(place.id)
            const sparklinePoints = getSparklinePoints(place.id)

            return (
              <Card
                key={place.id}
                className='place-card surface-card surface-card-hover fade-up-stagger overflow-hidden pt-0'
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <CardContent className='px-0'>
                  <div className='card-image-wrap'>
                    <img
                      src={imageLink}
                      alt={place.name}
                      className='aspect-video h-56 w-full object-cover transition-transform duration-300 ease-out hover:scale-105'
                      loading='lazy'
                    />
                    <div className='card-image-overlay' />
                    <div className='absolute right-3 bottom-3'>
                      <Badge className={`border ${getCrowdTone(livePercent)}`}>
                        Live Crowd: {livePercent}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>

                <CardHeader className='space-y-3'>
                  <CardTitle className='text-lg font-bold'>{place.name}</CardTitle>
                  <CardDescription className='space-y-1 text-sm text-muted-foreground/80'>
                    <p>
                      Capacity <span className='font-semibold text-foreground'>{place.capacity}</span>
                    </p>
                    <p className='text-xs tracking-wide text-muted-foreground'>
                      {place.latitude}, {place.longitude}
                    </p>
                  </CardDescription>
                  <div className='place-sparkline'>
                    <svg viewBox='0 0 180 60' className='h-10 w-full'>
                      <polyline
                        fill='none'
                        stroke='hsl(var(--primary))'
                        strokeWidth='2.25'
                        strokeLinecap='round'
                        points={sparklinePoints}
                      />
                    </svg>
                  </div>
                </CardHeader>

                <CardFooter className='gap-3 max-sm:flex-col max-sm:items-stretch'>
                  <Button asChild className='group w-full sm:w-auto'>
                    <Link to={`/dashboard/places/${place.id}`}>
                      <ImageIcon className='h-4 w-4' />
                      Open Analysis
                      <ArrowRight className='h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1' />
                    </Link>
                  </Button>
                  <Button asChild variant='outline'>
                    <a href={mapLink} target='_blank' rel='noreferrer' aria-label='Open map' title='Open map'>
                      <MapPinned className='h-4 w-4' />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

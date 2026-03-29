import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPinned, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPlaces, type Place } from '@/lib/api'
import CardTopImageDemo from '@/components/shadcn-studio/card/card-05'

const FALLBACK_IMAGE =
  'https://cdn.shadcnstudio.com/ss-assets/components/card/image-2.png?height=280&format=auto'

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Places</h1>
          <p className='text-muted-foreground'>
            Manage your organisation places in a visual card layout.
          </p>
        </div>
        <Button asChild>
          <Link to='/dashboard/places/new'>
            <Plus className='mr-2 h-4 w-4' />
            Add New Place
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className='rounded-md border p-8 text-center text-muted-foreground'>
          Loading places...
        </div>
      ) : places.length === 0 ? (
        <div className='space-y-4'>
          <div className='rounded-md border p-8 text-center text-muted-foreground'>
            No places yet. Add your first place.
          </div>
          <CardTopImageDemo />
        </div>
      ) : (
        <div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
          {places.map((place) => {
            const imageLink = place.image_link || FALLBACK_IMAGE
            const mapLink = `https://www.google.com/maps?q=${place.latitude},${place.longitude}`

            return (
              <Card key={place.id} className='pt-0'>
                <CardContent className='px-0'>
                  <img
                    src={imageLink}
                    alt={place.name}
                    className='aspect-video h-70 w-full rounded-t-xl object-cover'
                    loading='lazy'
                  />
                </CardContent>
                <CardHeader>
                  <CardTitle>{place.name}</CardTitle>
                  <CardDescription>
                    Capacity: {place.capacity}
                    <br />
                    Coordinates: {place.latitude}, {place.longitude}
                  </CardDescription>
                </CardHeader>
                <CardFooter className='gap-3 max-sm:flex-col max-sm:items-stretch'>
                  <Button asChild>
                    <Link to={`/dashboard/places/${place.id}`}>
                      <ImageIcon className='mr-2 h-4 w-4' />
                      Open Analysis
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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createPlace } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { LocateFixed, MapPinned, PencilLine } from 'lucide-react'

type CoordinateMode = 'current' | 'map' | 'manual'

function parseCoordinatesFromText(text: string): { latitude: number; longitude: number } | null {
  const raw = text.trim()
  if (!raw) {
    return null
  }

  try {
    const parsedUrl = new URL(raw)
    const q = parsedUrl.searchParams.get('q') ?? parsedUrl.searchParams.get('query')
    const ll = parsedUrl.searchParams.get('ll')

    if (q) {
      const parsed = parseCoordinatesFromText(q)
      if (parsed) {
        return parsed
      }
    }

    if (ll) {
      const parsed = parseCoordinatesFromText(ll)
      if (parsed) {
        return parsed
      }
    }
  } catch {
    // Input may be plain text coordinates, so continue with regex parsing.
  }

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) {
      continue
    }

    const latitude = parseFloat(match[1])
    const longitude = parseFloat(match[2])

    if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
      return { latitude, longitude }
    }
  }

  return null
}

export default function AddPlacePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [coordinateMode, setCoordinateMode] = useState<CoordinateMode>('current')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapLink, setMapLink] = useState('')

  async function fetchCurrentLocation(): Promise<boolean> {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.')
      return false
    }

    setIsLocating(true)

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude)
          setLongitude(position.coords.longitude)
          toast.success('Current location loaded.')
          setIsLocating(false)
          resolve(true)
        },
        () => {
          toast.error('Unable to fetch current location. Please allow location access.')
          setIsLocating(false)
          resolve(false)
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const imageLink = (form.elements.namedItem('image_link') as HTMLInputElement).value.trim()
    const capacity = parseInt((form.elements.namedItem('capacity') as HTMLInputElement).value, 10)

    if (coordinateMode === 'current' && (latitude === null || longitude === null)) {
      const ok = await fetchCurrentLocation()
      if (!ok) {
        setLoading(false)
        return
      }
    }

    if (Number.isNaN(capacity) || capacity < 0) {
      toast.error('Capacity must be a valid positive number.')
      setLoading(false)
      return
    }

    if (latitude === null || longitude === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      toast.error('Please set a valid location first.')
      setLoading(false)
      return
    }

    try {
      await createPlace({
        name,
        image_link: imageLink,
        capacity,
        latitude,
        longitude,
      })

      toast.success('Place created successfully.', {
        description: 'Live metrics and analysis views are now ready for this place.',
      })
      navigate('/dashboard/places?created=1', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } }
      toast.error(
        axiosErr?.response?.data?.error ??
          axiosErr?.response?.data?.message ??
          'Failed to create place.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='mx-auto max-w-2xl p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Add New Place</h1>
        <p className='text-muted-foreground'>
          Add a place with image link and choose location in an industry-standard flow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className='w-full'>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor='name'>Place Name</FieldLabel>
            <Input id='name' name='name' type='text' placeholder='Eiffel Tower' required />
          </Field>

          <Field>
            <FieldLabel htmlFor='image_link'>Image Link</FieldLabel>
            <Input
              id='image_link'
              name='image_link'
              type='url'
              placeholder='https://example.com/place.jpg'
            />
          </Field>

          <Field>
            <FieldLabel htmlFor='capacity'>Capacity</FieldLabel>
            <Input
              id='capacity'
              name='capacity'
              type='number'
              min='0'
              step='1'
              placeholder='200'
              required
            />
          </Field>

          <Field>
            <FieldLabel>Location Source</FieldLabel>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              <Button
                type='button'
                variant={coordinateMode === 'current' ? 'default' : 'outline'}
                onClick={() => setCoordinateMode('current')}
              >
                <LocateFixed className='mr-2 h-4 w-4' />
                Current Location
              </Button>
              <Button
                type='button'
                variant={coordinateMode === 'map' ? 'default' : 'outline'}
                onClick={() => setCoordinateMode('map')}
              >
                <MapPinned className='mr-2 h-4 w-4' />
                Choose on Map
              </Button>
              <Button
                type='button'
                variant={coordinateMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setCoordinateMode('manual')}
              >
                <PencilLine className='mr-2 h-4 w-4' />
                Manual Coordinates
              </Button>
            </div>
          </Field>

          {coordinateMode === 'current' && (
            <div className='rounded-md border p-4'>
              <p className='mb-3 text-sm text-muted-foreground'>
                Use your browser geolocation to autofill hidden coordinates.
              </p>
              <Button type='button' variant='outline' onClick={fetchCurrentLocation} disabled={isLocating}>
                {isLocating ? 'Fetching location...' : 'Use Current Location'}
              </Button>
            </div>
          )}

          {coordinateMode === 'map' && (
            <div className='space-y-3 rounded-md border p-4'>
              <p className='text-sm text-muted-foreground'>
                Open map, pick location, then paste the map URL to extract coordinates.
              </p>
              <div className='flex flex-wrap gap-2'>
                <Button type='button' variant='outline' asChild>
                  <a href='https://maps.google.com' target='_blank' rel='noreferrer'>
                    Open Google Maps
                  </a>
                </Button>
                <Button type='button' variant='outline' asChild>
                  <a href='https://www.openstreetmap.org' target='_blank' rel='noreferrer'>
                    Open OpenStreetMap
                  </a>
                </Button>
              </div>
              <Input
                id='map_link'
                name='map_link'
                type='url'
                placeholder='Paste map URL or coordinates like 48.8584, 2.2945'
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
              />
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  const parsed = parseCoordinatesFromText(mapLink)
                  if (!parsed) {
                    if (mapLink.includes('maps.app.goo.gl') || mapLink.includes('goo.gl/maps')) {
                      toast.error('Google short links hide coordinates. Open the link first, then paste the expanded map URL from the browser address bar.')
                      return
                    }

                    toast.error('Could not parse coordinates from the provided link/text. Paste an expanded map URL or a direct "lat, long" value.')
                    return
                  }

                  setLatitude(parsed.latitude)
                  setLongitude(parsed.longitude)
                  toast.success('Coordinates extracted from map link.')
                }}
              >
                Use Coordinates from Map Link
              </Button>
            </div>
          )}

          {coordinateMode === 'manual' && (
            <div className='grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='latitude'>Latitude</FieldLabel>
                <Input
                  id='latitude'
                  name='latitude'
                  type='number'
                  step='any'
                  placeholder='48.8584'
                  value={latitude ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setLatitude(value === '' ? null : parseFloat(value))
                  }}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor='longitude'>Longitude</FieldLabel>
                <Input
                  id='longitude'
                  name='longitude'
                  type='number'
                  step='any'
                  placeholder='2.2945'
                  value={longitude ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setLongitude(value === '' ? null : parseFloat(value))
                  }}
                  required
                />
              </Field>
            </div>
          )}

          <div className='rounded-md bg-muted/40 p-3 text-sm text-muted-foreground'>
            Selected coordinates:{' '}
            {latitude !== null && longitude !== null
              ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : 'Not set yet'}
          </div>

          <Button type='submit' disabled={loading}>
            {loading ? 'Creating...' : 'Create Place'}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Organisation {
  id: number
  name: string
}

export interface Place {
  id: number
  name: string
  image_link: string
  capacity: number
  latitude: number
  longitude: number
  organisation_id: number
}

export interface RegisterOrgResponse {
  org: Organisation
}

export async function registerOrganisation(name: string): Promise<RegisterOrgResponse> {
  const { data } = await api.post<RegisterOrgResponse>('/organisation/register', { name })
  return data
}

export interface User {
  id: number
  name: string
  email: string
  organisation_id: number
}

export interface RegisterAdminPayload {
  organisation_id: number
  name: string
  email: string
  password: string
}

export interface RegisterAdminResponse {
  user: User
  token: string
}

export async function registerAdmin(payload: RegisterAdminPayload): Promise<RegisterAdminResponse> {
  const { data } = await api.post<RegisterAdminResponse>('/organisation/admin', payload)
  return data
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export interface CurrentUserResponse {
  id: number
  name: string
  email: string
  organisation_id: number
  role: string
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const { data } = await api.get<CurrentUserResponse>('/auth/me')
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export interface DeleteAccountPayload {
  confirm_delete_organisation?: boolean
  confirm_organisation_name?: string
  confirm_text?: string
}

export async function deleteAccount(payload?: DeleteAccountPayload): Promise<void> {
  await api.delete('/auth/delete-account', { data: payload ?? {} })
}

export async function deleteMemberByAdmin(memberId: number): Promise<void> {
  await api.delete(`/auth/members/${memberId}`)
}

export default api

export interface CheckOrgNameResponse {
  exists: boolean
}

export async function checkOrganisationName(name: string): Promise<CheckOrgNameResponse> {
  const { data } = await api.get<CheckOrgNameResponse>(`/organisation/check-name?name=${encodeURIComponent(name)}`)
  return data
}

export interface GetPlacesResponse {
  places: Place[]
}

export async function getPlaces(): Promise<GetPlacesResponse> {
  const { data } = await api.get<GetPlacesResponse>('/places')
  return data
}

export interface CreatePlacePayload {
  name: string
  image_link: string
  capacity: number
  latitude: number
  longitude: number
}

export async function createPlace(payload: CreatePlacePayload): Promise<void> {
  await api.post('/places', payload)
}

export interface CurrentActual {
  timestamp: string
  count: number
  percent_capacity: number
}

export interface CurrentPrediction {
  timestamp: string
  predicted: number
  upper_bound: number
  lower_bound: number
  percent_capacity: number
}

export interface PlaceCurrentResponse {
  place_id: number
  as_of: string
  capacity: number
  latest_actual: CurrentActual | null
  next_predictions: CurrentPrediction[]
}

export interface TimeSeriesPoint {
  timestamp: string
  actual: number | null
  predicted: number | null
}

export interface PlaceTimeSeriesResponse {
  place_id: number
  start: string
  end: string
  interval: 'hour' | 'day'
  timeseries: TimeSeriesPoint[]
}

export interface CrowdHeatmapResponse {
  place_id: number
  range: string
  start: string
  end: string
  heatmap: Array<Array<number | null>>
}

export interface CrowdPeaksResponse {
  place_id: number
  range: string
  start: string
  end: string
  busiest_hour: {
    hour: number
    avg_count: number
  } | null
  least_crowded_time: {
    day_of_week: number
    hour: number
    avg_count: number
  } | null
}

export interface ForecastPoint {
  timestamp: string
  count: number
  upper_bound: number
  lower_bound: number
}

export interface ForecastNextResponse {
  place_id: number
  hours: number
  start: string
  end: string
  forecast: ForecastPoint[]
}

export interface ForecastResponse {
  place_id: number
  start: string
  end: string
  forecast: ForecastPoint[]
}

export interface ForecastAlert {
  timestamp: string
  predicted_count: number
  upper_bound: number
  lower_bound: number
  capacity: number
  overload_by: number
}

export interface ForecastAlertsResponse {
  place_id: number
  start: string
  end: string
  overload_count: number
  alerts: ForecastAlert[]
}

export async function getPlaceCurrent(placeId: number): Promise<PlaceCurrentResponse> {
  const { data } = await api.get<PlaceCurrentResponse>(`/places/${placeId}/current`)
  return data
}

export async function getPlaceTimeSeries(
  placeId: number,
  start: Date,
  end: Date,
  interval: 'hour' | 'day' = 'hour',
): Promise<PlaceTimeSeriesResponse> {
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    interval,
  })

  const { data } = await api.get<PlaceTimeSeriesResponse>(`/places/${placeId}/timeseries?${params.toString()}`)
  return data
}

export async function getPlaceCrowdHeatmap(placeId: number, range = '30d'): Promise<CrowdHeatmapResponse> {
  const { data } = await api.get<CrowdHeatmapResponse>(`/places/${placeId}/crowd/heatmap?range=${encodeURIComponent(range)}`)
  return data
}

export async function getPlaceCrowdPeaks(placeId: number, range = '7d'): Promise<CrowdPeaksResponse> {
  const { data } = await api.get<CrowdPeaksResponse>(`/places/${placeId}/crowd/peaks?range=${encodeURIComponent(range)}`)
  return data
}

export async function getPlaceForecastNext(placeId: number, hours = 24): Promise<ForecastNextResponse> {
  const { data } = await api.get<ForecastNextResponse>(`/places/${placeId}/forecast/next?hours=${hours}`)
  return data
}

export async function getPlaceForecast(
  placeId: number,
  start?: Date,
  end?: Date,
): Promise<ForecastResponse> {
  const params = new URLSearchParams()
  if (start) {
    params.set('start', start.toISOString())
  }
  if (end) {
    params.set('end', end.toISOString())
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  const { data } = await api.get<ForecastResponse>(`/places/${placeId}/forecast${suffix}`)
  return data
}

export async function getPlaceForecastAlerts(placeId: number): Promise<ForecastAlertsResponse> {
  const { data } = await api.get<ForecastAlertsResponse>(`/places/${placeId}/forecast/alerts`)
  return data
}

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
  const { data } = await api.get<GetPlacesResponse>('/auth/places')
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
  await api.post('/auth/places', payload)
}

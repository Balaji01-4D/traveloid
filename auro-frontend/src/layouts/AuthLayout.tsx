import { Outlet } from "react-router-dom"
import sunsetImg from '@/assets/login-register-page-image.jpg'
import logoImg from '@/assets/logo.png'

export default function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-white dark:bg-zinc-950">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <img src={logoImg} alt="Traveloid" className="h-6 w-auto" />
            <span className="font-bold text-lg">Traveloid</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block bg-muted">
        <img
          src={sunsetImg}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-12 left-10 right-10 text-white">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] uppercase opacity-60">
            Traveloid Workspace
          </p>
          <p className="text-2xl font-semibold leading-snug">
            Your world,<br />one journey at a time.
          </p>
        </div>
      </div>
    </div>
  )
}

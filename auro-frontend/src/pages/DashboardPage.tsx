import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Outlet, Navigate, useLocation } from "react-router-dom"

export default function DashboardPage() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const title = segments[1] ? segments[1].replace('-', ' ') : 'overview'
  
  if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
    return <Navigate to="/dashboard/overview" replace />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-sm font-medium capitalize text-muted-foreground">{title}</h1>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

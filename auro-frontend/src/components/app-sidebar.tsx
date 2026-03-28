import * as React from "react"
import { useEffect, useState } from "react"
import {
  MapPin,
  Users,
  Settings
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import api, { getCurrentUser } from "@/lib/api"
import OrganisationIcon from "@/components/icons/OrganisationIcon"

const adminNavMain = [
  {
    title: "Places",
    url: "/dashboard/places",
    icon: MapPin,
    isActive: true,
    items: [
      {
        title: "All Places",
        url: "/dashboard/places",
      },
      {
        title: "Add New Place",
        url: "/dashboard/places/new",
      },
    ],
  },
  {
    title: "Members",
    url: "/dashboard/members",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    items: [
      {
        title: "Organisation",
        url: "/dashboard/settings",
      },
    ],
  },
]

const memberNavMain = [
  {
    title: "Places",
    url: "/dashboard/places",
    icon: MapPin,
    isActive: true,
    items: [
      {
        title: "All Places",
        url: "/dashboard/places",
      },
      {
        title: "Add New Place",
        url: "/dashboard/places/new",
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState({
    name: "",
    email: "",
    avatar: "",
  })
  const [teams, setTeams] = useState([
    {
      name: "Workspace",
      logo: OrganisationIcon,
      plan: "Workspace",
    },
  ])
  const [role, setRole] = useState<string>("member")

  useEffect(() => {
    async function fetchSidebarData() {
      try {
        const meData = await getCurrentUser()
        setUser({
          name: meData.name,
          email: meData.email,
          avatar: "",
        })
        setRole(meData.role)

        if (meData.organisation_id) {
          const { data: orgRes } = await api.get(`/organisation/${meData.organisation_id}`)
          setTeams([{
            name: orgRes.org.name,
            logo: OrganisationIcon,
            plan: "Workspace",
          }])
        }
      } catch (err) {
        console.error("Failed to fetch sidebar data", err)
      }
    }
    fetchSidebarData()
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={role === "admin" ? adminNavMain : memberNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

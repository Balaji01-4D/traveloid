import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import api, { deleteAccount, deleteMemberByAdmin, getCurrentUser, type CurrentUserResponse } from '@/lib/api'
import { toast } from 'sonner'

interface Member {
  id: number
  name: string
  email: string
  role: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null)
  const [organisationName, setOrganisationName] = useState('')

  async function fetchMembers() {
    setLoading(true)
    try {
      const meData = await getCurrentUser()
      setCurrentUser(meData)
      const orgId = meData.organisation_id

      const [{ data: membersData }, { data: orgData }] = await Promise.all([
        api.get(`/organisation/${orgId}/members`),
        api.get(`/organisation/${orgId}`),
      ])

      setMembers(membersData.members || [])
      setOrganisationName(orgData?.org?.name ?? '')
    } catch (err) {
      console.error('Could not fetch members', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  async function handleDeleteMember(memberId: number) {
    const confirmed = window.confirm('Delete this member account?')
    if (!confirmed) {
      return
    }

    try {
      await deleteMemberByAdmin(memberId)
      toast.success('Member deleted successfully.')
      await fetchMembers()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } }
      toast.error(axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message ?? 'Failed to delete member.')
    }
  }

  async function handleDeleteSelf(member: Member) {
    if (!currentUser) {
      return
    }

    if (currentUser.role === 'admin') {
      const confirmDeleteOrg = window.confirm('You are an admin. Deleting your account will also delete the entire organisation and all related data (members, admins, places). Continue?')
      if (!confirmDeleteOrg) {
        return
      }

      const confirmText = window.prompt('Type DELETE to continue:') ?? ''
      const confirmOrganisationName = window.prompt(`Type organisation name (${organisationName}) to confirm:`) ?? ''

      try {
        await deleteAccount({
          confirm_delete_organisation: true,
          confirm_text: confirmText,
          confirm_organisation_name: confirmOrganisationName,
        })
        toast.success('Organisation deleted successfully.')
        window.location.href = '/login'
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string; message?: string } } }
        toast.error(axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message ?? 'Failed to delete account.')
      }
      return
    }

    const confirmed = window.confirm(`Delete your account (${member.email})?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteAccount()
      toast.success('Account deleted successfully.')
      window.location.href = '/login'
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } }
      toast.error(axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message ?? 'Failed to delete account.')
    }
  }

  return (
    <div className="flex-col gap-6 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Members</h1>
          <p className="text-muted-foreground">
            Manage who has access to your workspace.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/members/invite">
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Link>
        </Button>
      </div>

      <div className="border rounded-md">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading members...</div>
        ) : members.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground">No members found.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{member.name}</td>
                  <td className="px-4 py-3">{member.email}</td>
                  <td className="px-4 py-3 capitalize">{member.role}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {currentUser?.role === 'admin' && member.role === 'member' && (
                      <Button variant="outline" size="sm" onClick={() => handleDeleteMember(member.id)}>
                        Delete Member
                      </Button>
                    )}
                    {currentUser?.id === member.id && (
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteSelf(member)}>
                        Delete My Account
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

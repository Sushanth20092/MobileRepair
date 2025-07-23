"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Wrench, Clock, CheckCircle, AlertCircle, MessageCircle, Star, MapPin, Calendar, Phone, LogOut, Wifi, WifiOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/api"
import { formatGBP } from "@/lib/utils"
import { NotificationBellAgentDashboard } from '@/components/ui/NotificationBellAgentDashboard';

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "in-progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "in-progress":
      return <Clock className="h-4 w-4" />
    case "pending":
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export default function AgentDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [onlineStatusLoading, setOnlineStatusLoading] = useState(true)

  useEffect(() => {
    // Add a small delay to allow auth context to load user profile
    const timer = setTimeout(() => {
      setProfileLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Don't redirect until profile is loaded
    if (profileLoading) return

    if (!user) {
      router.replace('/auth/login')
      return
    }
    if (user.role !== 'agent') {
      router.replace('/')
      return
    }
    // Removed waiting-approval redirect logic since only approved agents are in the agents table
  }, [user, router, profileLoading])

  // Handle browser back button for agents - redirect to homepage instead of login
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If the user is an agent and tries to go back, redirect to homepage
      if (user && user.role === 'agent') {
        event.preventDefault()
        router.replace('/')
      }
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [user, router])

  // Fetch agent's online status
  useEffect(() => {
    const fetchAgentStatus = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('is_online')
          .eq('user_id', user.id)
          .single()
        
        if (error) {
          console.error('Error fetching agent status:', error)
          return
        }
        
        setIsOnline(data?.is_online || false)
        setOnlineStatusLoading(false)
      } catch (error) {
        console.error('Error in fetchAgentStatus:', error)
        setOnlineStatusLoading(false)
      }
    }

    if (user && !profileLoading) {
      fetchAgentStatus()
    }
  }, [user, profileLoading])

  // Subscribe to agent status changes
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel(`agent_status:${user.id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'agents',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          setIsOnline(payload.new.is_online || false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase.from('jobs').select('*')
        setJobs(data || [])
        setLoading(false)
      } catch {
        setError("Failed to load jobs")
        setLoading(false)
      }
    }
    fetchJobs()
    // Subscribe to jobs table changes
    const channel = supabase.channel('realtime:jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
        fetchJobs()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleAcceptJob = (jobId: string) => {
    setJobs(jobs.map((job) => (job.id === jobId ? { ...job, status: "in-progress" } : job)))
    toast({
      title: "Job Accepted",
      description: "You have accepted the repair job",
    })
  }

  const handleDeclineJob = (jobId: string) => {
    toast({
      title: "Job Declined",
      description: "The job has been declined and will be reassigned",
      variant: "destructive",
    })
  }

  const handleCompleteJob = (jobId: string) => {
    setJobs(
      jobs.map((job) =>
        job.id === jobId ? { ...job, status: "completed", completedDate: new Date().toISOString().split("T")[0] } : job,
      ),
    )
    toast({
      title: "Job Completed",
      description: "The repair job has been marked as completed",
    })
  }

  const handleOnlineStatusToggle = async (checked: boolean) => {
    if (!user) return
    
    setOnlineStatusLoading(true)
    
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_online: checked })
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Error updating online status:', error)
        toast({
          title: "Error",
          description: "Failed to update online status",
          variant: "destructive",
        })
        // Revert the toggle if update failed
        setIsOnline(!checked)
      } else {
        setIsOnline(checked)
        toast({
          title: checked ? "Online" : "Offline",
          description: `You are now ${checked ? 'online' : 'offline'}`,
        })
      }
    } catch (error) {
      console.error('Error in handleOnlineStatusToggle:', error)
      toast({
        title: "Error",
        description: "Failed to update online status",
        variant: "destructive",
      })
      // Revert the toggle if update failed
      setIsOnline(!checked)
    } finally {
      setOnlineStatusLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const pendingJobs = jobs.filter((job) => job.status === "pending")
  const activeJobs = jobs.filter((job) => job.status === "in-progress")
  const completedJobs = jobs.filter((job) => job.status === "completed")

  // Show loading state while profile is being fetched
  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Dashboard</h1>
            <p className="text-muted-foreground">Manage your assigned repair jobs</p>
          </div>
          <div className="flex items-center gap-4">
            {user?.role === 'agent' && <NotificationBellAgentDashboard userId={user.id} />}
            {/* Online/Offline Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <Switch
                checked={isOnline}
                onCheckedChange={handleOnlineStatusToggle}
                disabled={onlineStatusLoading}
                className="data-[state=checked]:bg-green-600"
              />
              {onlineStatusLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              )}
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobs.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingJobs.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeJobs.length}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedJobs.length}</div>
              <p className="text-xs text-muted-foreground">Successfully completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Jobs</CardTitle>
            <CardDescription>Manage your assigned repair jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList>
                <TabsTrigger value="pending">Pending ({pendingJobs.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No pending jobs</h3>
                    <p className="text-muted-foreground">New repair requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingJobs.map((job) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{job.device}</h3>
                              <Badge className={getStatusColor(job.status)}>
                                {getStatusIcon(job.status)}
                                <span className="ml-1 capitalize">{job.status}</span>
                              </Badge>
                              {job.type === "express" && <Badge variant="destructive">Express</Badge>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                              <p>
                                <strong>Customer:</strong> {job.customer}
                              </p>
                              <p>
                                <strong>Issue:</strong> {job.issue}
                              </p>
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.address}
                              </p>
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {job.phone}
                              </p>
                              <p className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Booked: {new Date(job.bookedDate).toLocaleDateString()}
                              </p>
                              <p>
                                <strong>Amount:</strong> {formatGBP(job.amount)}
                              </p>
                            </div>

                            {job.images.length > 0 && (
                              <div className="flex gap-2 mb-3">
                                <span className="text-sm font-medium">Images:</span>
                                <div className="flex gap-2">
                                  {job.images.map((image: string, index: number) => (
                                    <img
                                      key={index}
                                      src={image || "/placeholder.svg"}
                                      alt={`Issue ${index + 1}`}
                                      className="w-12 h-12 object-cover rounded border"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <div className="text-right mb-2">
                              <p className="text-xs text-muted-foreground">Job ID: {job.id}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => handleAcceptJob(job.id)} className="w-full">
                                Accept Job
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeclineJob(job.id)}
                                className="w-full"
                              >
                                Decline
                              </Button>
                              <Button size="sm" variant="outline" className="w-full">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Chat
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                {activeJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No active jobs</h3>
                    <p className="text-muted-foreground">Accepted jobs will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeJobs.map((job) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{job.device}</h3>
                              <Badge className={getStatusColor(job.status)}>
                                {getStatusIcon(job.status)}
                                <span className="ml-1 capitalize">{job.status.replace("-", " ")}</span>
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                              <p>
                                <strong>Customer:</strong> {job.customer}
                              </p>
                              <p>
                                <strong>Issue:</strong> {job.issue}
                              </p>
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.address}
                              </p>
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {job.phone}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <div className="text-right mb-2">
                              <p className="font-semibold">{formatGBP(job.amount)}</p>
                              <p className="text-xs text-muted-foreground">Job ID: {job.id}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => handleCompleteJob(job.id)} className="w-full">
                                Mark Complete
                              </Button>
                              <Button size="sm" variant="outline" className="w-full">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Chat
                              </Button>
                              <Button size="sm" variant="outline" className="w-full">
                                Update Status
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {completedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No completed jobs</h3>
                    <p className="text-muted-foreground">Completed jobs will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedJobs.map((job) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{job.device}</h3>
                              <Badge className={getStatusColor(job.status)}>
                                {getStatusIcon(job.status)}
                                <span className="ml-1 capitalize">{job.status}</span>
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                              <p>
                                <strong>Customer:</strong> {job.customer}
                              </p>
                              <p>
                                <strong>Issue:</strong> {job.issue}
                              </p>
                              <p className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Completed:{" "}
                                {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <div className="text-right mb-2">
                              <p className="font-semibold">{formatGBP(job.amount)}</p>
                              <p className="text-xs text-muted-foreground">Job ID: {job.id}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button size="sm" variant="outline" className="w-full">
                                <Star className="h-3 w-3 mr-1" />
                                View Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

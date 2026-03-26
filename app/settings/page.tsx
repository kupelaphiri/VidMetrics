'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Key, Bell, Palette, Database, Loader2, Check, AlertCircle } from 'lucide-react'

interface UserSettings {
  videos_to_fetch: number
  auto_export: boolean
  export_format: string
  notifications_enabled: boolean
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<UserSettings>({
    videos_to_fetch: 50,
    auto_export: false,
    export_format: 'csv',
    notifications_enabled: true,
  })
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedKey = localStorage.getItem('youtube_api_key') || ''
    setApiKey(savedKey)
    // Hydrate from localStorage first for instant feedback
    try {
      const cached = localStorage.getItem('vidmetrics_settings')
      if (cached) {
        const parsed = JSON.parse(cached)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          videos_to_fetch: data.videos_to_fetch ?? 50,
          auto_export: data.auto_export ?? false,
          export_format: data.export_format ?? 'csv',
          notifications_enabled: data.notifications_enabled ?? true,
        })
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      setSaveStatus('idle')
      setError(null)

      // Save API key to localStorage, remove if cleared
      if (apiKey.trim()) {
        localStorage.setItem('youtube_api_key', apiKey.trim())
      } else {
        localStorage.removeItem('youtube_api_key')
        setApiKey('')
      }

      // Persist settings to localStorage for use in other pages
      localStorage.setItem('vidmetrics_settings', JSON.stringify(settings))

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaveStatus('idle')
    if (key === 'notifications_enabled' && value === true) {
      Notification.requestPermission()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your application preferences
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>Your YouTube API key — used to identify your search history</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">YouTube API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="AIza..."
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setSaveStatus('idle') }}
                />
                <p className="text-xs text-muted-foreground">
                  Your key is stored locally in your browser and never sent to our servers. Get yours from the{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Cloud Console
                  </a>
                  . Your search history is tied to this key.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Data Preferences</CardTitle>
                  <CardDescription>Configure how data is fetched and stored</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default-videos">Default Videos to Fetch</Label>
                <Select
                  value={settings.videos_to_fetch.toString()}
                  onValueChange={(v) => updateSetting('videos_to_fetch', parseInt(v))}
                >
                  <SelectTrigger id="default-videos">
                    <SelectValue placeholder="Select amount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 videos</SelectItem>
                    <SelectItem value="50">50 videos</SelectItem>
                    <SelectItem value="100">100 videos</SelectItem>
                    <SelectItem value="200">200 videos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Number of videos to analyze by default when fetching channel data
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-format">Default Export Format</Label>
                <Select
                  value={settings.export_format}
                  onValueChange={(v) => updateSetting('export_format', v)}
                >
                  <SelectTrigger id="export-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-export Reports</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically download report after analysis
                  </p>
                </div>
                <Switch
                  checked={settings.auto_export}
                  onCheckedChange={(v) => updateSetting('auto_export', v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Manage your notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts when analysis is complete
                  </p>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(v) => updateSetting('notifications_enabled', v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={theme}
                  onValueChange={(v) => setTheme(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={fetchSettings}>
              Reset
            </Button>
            <Button onClick={saveSettings} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

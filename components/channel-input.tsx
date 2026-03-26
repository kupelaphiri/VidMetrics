'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChannelInputProps {
  onAnalyze: (url: string) => void
  isLoading: boolean
}

export function ChannelInput({ onAnalyze, isLoading }: ChannelInputProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onAnalyze(url.trim())
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 text-balance">
          YouTube Competitor Analysis
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg text-pretty">
          Paste a competitor&apos;s channel URL to instantly see which videos are crushing it
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="youtube.com/@channelname or channel URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !url.trim()}
          className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            'Analyze Channel'
          )}
        </Button>
      </form>
      
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
        <span>Try:</span>
        <button 
          type="button"
          onClick={() => setUrl('https://youtube.com/@mkbhd')}
          className="text-primary hover:underline"
        >
          @mkbhd
        </button>
        <span>|</span>
        <button 
          type="button"
          onClick={() => setUrl('https://youtube.com/@veritasium')}
          className="text-primary hover:underline"
        >
          @veritasium
        </button>
        <span>|</span>
        <button 
          type="button"
          onClick={() => setUrl('https://youtube.com/@MrBeast')}
          className="text-primary hover:underline"
        >
          @MrBeast
        </button>
      </div>
    </div>
  )
}

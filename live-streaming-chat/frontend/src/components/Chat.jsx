import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function apiRoot() {
  const base = import.meta.env.VITE_API_URL
  if (typeof base === 'string' && base.length > 0) {
    return base.replace(/\/$/, '')
  }
  return ''
}

function mergeMessages(prev, incoming) {
  const map = new Map(prev.map((m) => [m.id, m]))
  map.set(incoming.id, incoming)
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    if (ta !== tb) return ta - tb
    return a.id - b.id
  })
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [streamOk, setStreamOk] = useState(true)
  const base = useMemo(() => apiRoot(), [])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${base}/api/chat/messages`)
      if (!res.ok) return
      const list = await res.json()
      if (!Array.isArray(list)) return
      setMessages(
        [...list].sort((a, b) => {
          const ta = new Date(a.createdAt).getTime()
          const tb = new Date(b.createdAt).getTime()
          if (ta !== tb) return ta - tb
          return a.id - b.id
        }),
      )
    } catch {
      /* ignore network / parse errors */
    }
  }, [base])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    const url = `${base}/api/chat/stream`
    const es = new EventSource(url)

    es.onopen = () => {
      setStreamOk(true)
    }

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg?.id != null && msg?.content != null) {
          setMessages((prev) => mergeMessages(prev, msg))
        }
      } catch {
        /* ignore malformed frames */
      }
    }

    es.onerror = () => {
      setStreamOk(false)
    }

    return () => {
      es.close()
    }
  }, [base])

  async function handleSubmit(e) {
    e.preventDefault()
    const content = draft.trim()
    if (!content) return

    try {
      const res = await fetch(`${base}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        try {
          const msg = await res.json()
          setMessages((prev) => mergeMessages(prev, msg))
        } catch {
          /* fall back to SSE / refresh */
        }
        setDraft('')
      }
    } catch {
      /* connection errors */
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <h1 className="text-sm font-semibold tracking-tight">
          Chat {!streamOk && <span className="text-muted-foreground"> · reconnecting…</span>}
        </h1>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col bg-zinc-900/80">
        <div
          className="flex-1 space-y-2 overflow-y-auto p-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-md bg-zinc-800/80 px-2 py-1.5 text-sm leading-snug"
            >
              <span className="text-zinc-300">{m.content}</span>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-zinc-800 bg-zinc-900 p-3"
        >
          <Input
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            placeholder="Send a message"
            className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500"
            autoComplete="off"
            maxLength={2000}
            aria-label="Message"
          />
          <Button type="submit" className="shrink-0 bg-[#9146ff] hover:bg-[#7c3aed]">
            Chat
          </Button>
        </form>
      </div>
    </div>
  )
}

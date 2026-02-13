import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePolling } from '../hooks/usePolling'
import { cardToGrid, checkFullCard, validateMarks } from '../lib/bingo'
import type { Participant, Round } from '../lib/types'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { Loader2, Grid3X3 } from 'lucide-react'

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

export default function Tabelas() {
  const { user } = useAuth()
  const [claimingId, setClaimingId] = useState<string | null>(null)

  // Fetch all rounds
  const fetchData = useCallback(async () => {
    if (!user) return null
    const { data: parts } = await supabase
      .from('participants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!parts || parts.length === 0) return null

    const roundIds = [...new Set(parts.map(p => p.round_id))]
    const { data: rounds } = await supabase
      .from('rounds')
      .select('*')
      .in('id', roundIds)

    return { participants: parts as Participant[], rounds: (rounds || []) as Round[] }
  }, [user?.id])

  const { data, loading, refetch } = usePolling(fetchData, 4000, !!user)

  const handleMark = async (participant: Participant, round: Round, num: number) => {
    if (num === 0) return // FREE
    if (participant.has_bingo) return

    const drawn = new Set(round.drawn_numbers)
    if (!drawn.has(num)) {
      toast.error('Esse número ainda não foi sorteado!')
      return
    }

    const alreadyMarked = new Set(participant.marked_numbers)
    if (alreadyMarked.has(num)) {
      // Unmark
      const newMarked = participant.marked_numbers.filter(n => n !== num)
      await supabase
        .from('participants')
        .update({ marked_numbers: newMarked })
        .eq('id', participant.id)
      refetch()
      return
    }

    // Mark
    const newMarked = [...participant.marked_numbers, num]
    await supabase
      .from('participants')
      .update({ marked_numbers: newMarked })
      .eq('id', participant.id)
    refetch()
  }

  const handleBingoClaim = async (participant: Participant, round: Round) => {
    setClaimingId(participant.id)
    try {
      const markedCount = participant.marked_numbers.length
      if (markedCount < 24) {
        toast.error(`Faltam ${24 - markedCount} números para completar a cartela!`)
        return
      }

      // Validate all marks are in drawn_numbers
      if (!validateMarks(participant.marked_numbers, round.drawn_numbers)) {
        toast.error('Alguns números marcados não foram sorteados ainda!')
        return
      }

      // Check full card
      if (!checkFullCard(participant.card, participant.marked_numbers)) {
        toast.error('Sua cartela não está completa!')
        return
      }

      const now = new Date().toISOString()
      const { error } = await supabase
        .from('participants')
        .update({ has_bingo: true, bingo_claimed_at: now })
        .eq('id', participant.id)

      if (error) throw error

      // Confetti!
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#A8348D', '#FFD700', '#FF6B6B', '#4ECDC4'],
      })
      toast.success('🎉 BINGO! Parabéns! Cartela completa!')
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar bingo')
    } finally {
      setClaimingId(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!data || data.participants.length === 0) {
    return (
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8">
          Minhas Tabelas
        </h2>
        <div className="text-center py-16">
          <Grid3X3 size={56} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Você ainda não participou de nenhuma rodada.</p>
          <p className="text-gray-400 text-sm mt-1">Vá para Participantes para se inscrever!</p>
        </div>
      </div>
    )
  }

  const roundMap = new Map(data.rounds.map(r => [r.id, r]))

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8">
        Minhas Tabelas
      </h2>

      <div className="space-y-8 max-w-lg mx-auto">
        {data.participants.map((participant, idx) => {
          const round = roundMap.get(participant.round_id)
          if (!round) return null
          const grid = cardToGrid(participant.card)
          const drawn = new Set(round.drawn_numbers)
          const marked = new Set(participant.marked_numbers)
          const markedCount = participant.marked_numbers.length

          return (
            <div
              key={participant.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-800">
                  Rodada #{idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  {participant.has_bingo && (
                    <span className="text-xs bg-primary text-white font-bold px-3 py-1 rounded-full animate-number-pop">
                      🎉 BINGO!
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      round.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {round.status === 'active' ? 'Em andamento' : 'Encerrada'}
                  </span>
                </div>
              </div>

              {/* Grid */}
              <div className="p-4">
                {/* Column headers */}
                <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                  {COLUMNS.map(col => (
                    <div
                      key={col}
                      className="text-center font-display font-black text-primary text-lg"
                    >
                      {col}
                    </div>
                  ))}
                </div>

                {/* Number grid */}
                <div className="grid grid-cols-5 gap-1.5">
                  {grid.map((row, rowIdx) =>
                    row.map((num, colIdx) => {
                      const isFree = num === 0
                      const isDrawn = isFree || drawn.has(num)
                      const isMarked = isFree || marked.has(num)
                      const canClick = !isFree && isDrawn && !participant.has_bingo && round.status === 'active'

                      return (
                        <button
                          key={`${rowIdx}-${colIdx}`}
                          onClick={() => canClick && handleMark(participant, round, num)}
                          disabled={!canClick}
                          className={`aspect-square rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                            isFree
                              ? 'bg-primary text-white'
                              : isMarked
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                                : isDrawn
                                  ? 'bg-primary/15 text-primary ring-2 ring-primary/30 cursor-pointer hover:bg-primary/25'
                                  : 'bg-gray-100 text-gray-400'
                          } ${canClick && !isMarked ? 'hover:scale-105' : ''}`}
                        >
                          {isFree ? '⭐' : num}
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Counter */}
                <p className="text-center text-xs text-gray-400 mt-3">
                  {markedCount}/24 números marcados
                </p>

                {/* BINGO button */}
                {round.status === 'active' && !participant.has_bingo && (
                  <button
                    onClick={() => handleBingoClaim(participant, round)}
                    disabled={markedCount < 24 || claimingId === participant.id}
                    className={`w-full mt-4 py-3 rounded-xl font-display font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                      markedCount >= 24
                        ? 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {claimingId === participant.id && (
                      <Loader2 size={18} className="animate-spin" />
                    )}
                    🎯 BINGO!
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

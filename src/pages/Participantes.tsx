import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePolling } from '../hooks/usePolling'
import { generateCard } from '../lib/bingo'
import type { Participant, Round } from '../lib/types'
import toast from 'react-hot-toast'
import { Loader2, Users, CircleOff } from 'lucide-react'

export default function Participantes() {
  const { user } = useAuth()
  const [joining, setJoining] = useState(false)

  const fetchRound = useCallback(async () => {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .single()
    return data as Round | null
  }, [])

  const { data: round, refetch: refetchRound } = usePolling(fetchRound, 5000)

  const fetchParticipants = useCallback(async () => {
    if (!round) return []
    const { data } = await supabase
      .from('participants')
      .select('*, profiles(name, avatar_url)')
      .eq('round_id', round.id)
      .order('created_at', { ascending: true })
    return (data || []) as (Participant & { profiles: { name: string; avatar_url: string | null } })[]
  }, [round?.id])

  const { data: participants, loading, refetch: refetchParticipants } = usePolling(
    fetchParticipants,
    5000,
    !!round,
  )

  const isJoined = participants?.some(p => p.user_id === user?.id) ?? false

  const handleJoin = async () => {
    if (!round || !user) return
    if (isJoined) return

    setJoining(true)
    try {
      const card = generateCard()
      const { error } = await supabase.from('participants').insert({
        round_id: round.id,
        user_id: user.id,
        card,
      })
      if (error) throw error
      toast.success('Você está participando! Sua cartela foi gerada. 🎉')
      refetchParticipants()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao participar')
    } finally {
      setJoining(false)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8">
        Escolha os participantes
      </h2>

      {!round ? (
        <div className="text-center py-16">
          <CircleOff size={56} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Nenhuma rodada ativa no momento.</p>
          <p className="text-gray-400 text-sm mt-1">Aguarde o administrador criar uma nova rodada.</p>
        </div>
      ) : (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">
              Total de <span className="text-gray-900 font-bold">{participants?.length || 0}</span> participantes
            </span>
            <button
              onClick={!isJoined ? handleJoin : undefined}
              disabled={isJoined || joining}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                isJoined
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/20'
              }`}
            >
              {joining && <Loader2 size={14} className="animate-spin" />}
              {isJoined ? 'Já inscrito' : 'Participar'}
            </button>
          </div>

          {/* Participants list */}
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {loading && !participants ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : participants && participants.length > 0 ? (
              participants.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {p.profiles?.avatar_url ? (
                    <img
                      src={p.profiles.avatar_url}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {getInitials(p.profiles?.name || '?')}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-800">
                    {p.profiles?.name || 'Sem nome'}
                  </span>
                  {p.has_bingo && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                      🎉 BINGO!
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Nenhum participante ainda</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

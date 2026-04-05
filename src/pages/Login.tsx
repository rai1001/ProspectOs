import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../components/Toast'

export default function Login() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const { error } = await signInWithEmail(email)
    if (error) {
      toast.error('Error al enviar el enlace. Verifica el email.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded bg-amber-500 flex items-center justify-center">
            <span className="text-black font-mono font-bold text-base">P</span>
          </div>
          <h1 className="text-xl font-mono font-semibold text-white">ProspectOS</h1>
        </div>

        {sent ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-base font-mono text-white mb-2">Revisa tu email</h2>
            <p className="text-sm text-[#9ca3af]">
              Hemos enviado un enlace mágico a <span className="text-white">{email}</span>.
              Haz clic en el enlace para acceder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-base font-mono text-white mb-1">Acceder</h2>
            <p className="text-sm text-[#9ca3af] mb-5">
              Introduce tu email para recibir un enlace de acceso.
            </p>
            <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500 mb-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

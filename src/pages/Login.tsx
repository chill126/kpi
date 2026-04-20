import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const next: typeof errors = {}
    if (!email) next.email = 'Email is required'
    if (!password) next.password = 'Password is required'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch {
      setErrors({ general: 'Invalid email or password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">K2 Medical Research</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>

        {errors.general && (
          <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-k2-accent hover:bg-k2-accent-hover text-white"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}

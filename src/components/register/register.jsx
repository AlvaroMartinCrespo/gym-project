import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Typography, Button, TextField, Checkbox } from '@mui/material'

export default function Register({ toast, setIsLogin, isLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorEmail, setErrorEmail] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorPassword, setErrorPassword] = useState(false)
  const [errorConfirmPassword, setErrorConfirmPassword] = useState(false)
  
  const { signUp } = useAuth()

  const checkEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,7}$/
    return regex.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    let hasValidationErrors = false

    if (email) {
      if (!checkEmail(email)) {
        toast.error('Debe ingresar un email válido')
        setErrorEmail(true)
        hasValidationErrors = true
      } else {
        setErrorEmail(false)
      }
    } else {
      toast.error('Debe ingresar un email')
      setErrorEmail(true)
      hasValidationErrors = true
    }

    if (!password) {
      toast.error('Debe ingresar una contraseña')
      setErrorPassword(true)
      hasValidationErrors = true
    } else {
      setErrorPassword(false)
    }

    if (!confirmPassword) {
      toast.error('Debe confirmar su contraseña')
      setErrorConfirmPassword(true)
      hasValidationErrors = true
    } else if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      setErrorConfirmPassword(true)
      hasValidationErrors = true
    } else {
      setErrorConfirmPassword(false)
    }

    if (hasValidationErrors) {
      return
    }

    setLoading(true)

    try {
      const result = await signUp(email, password)
      
      if (result.error) {
        console.error('Error de Supabase:', result.error.message)
        toast.error(result.error.message)
      } else {
        toast.success('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (error) {
      console.error('Error inesperado:', error.message)
      toast.error('Error inesperado: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center flex-col min-h-screen px-4">
      <Typography variant="h4" component="h2" className="text-black font-bold mb-6">
        Registrarse
      </Typography>
      <div className="w-full max-w-xs sm:max-w-sm p-6 text-gray-900">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <TextField
            error={errorEmail}
            helperText={errorEmail ? 'Debe ingresar un email válido' : ''}
            type="email"
            label="Email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            variant="outlined"
            className="bg-white rounded-lg"
          />
  
          <TextField
            type="password"
            error={errorPassword}
            helperText={errorPassword ? 'Introduce una contraseña' : 'La contraseña debe tener un mínimo de 6 caracteres.'}
            label="Contraseña"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            variant="outlined"
            className="bg-white rounded-lg"
          />
  
          <TextField
            type="password"
            error={errorConfirmPassword}
            helperText={errorConfirmPassword ? 'Las contraseñas no coinciden' : 'Confirma tu contraseña'}
            label="Confirmar Contraseña"
            placeholder="********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
            variant="outlined"
            className="bg-white rounded-lg"
          />
  
          <div className="flex items-center gap-2">
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              sx={{ padding: 0.5 }}
            />
            <label className="text-sm">Mantener sesión</label>
          </div>
  
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            className="!bg-green-600 !hover:bg-green-700 !text-white !py-2 !rounded-xl !text-sm !font-semibold"
          >
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </Button>
  
          <Button
            variant="outlined"
            onClick={() => setIsLogin(!isLogin)}
            className="!border-gray-400 !text-gray-800 !rounded-xl !py-2 !text-sm"
          >
            {(!isLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </Button>
        </form>
      </div>
    </div>
  )  
}
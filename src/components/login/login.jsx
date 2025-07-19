import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Typography, Checkbox, Button, Input, TextField } from '@mui/material'

export default function Login({toast, setIsLogin, isLogin}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorEmail, setErrorEmail] = useState(false)
  const [errorPassword, setErrorPassword] = useState(false)
  
  const { signUp, signIn } = useAuth()

  const checkEmail = (email) =>{
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,7}$/
    return regex.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if(email){
        if(!checkEmail(email)){
            toast.error('Debe ingresar un email valido')
            setErrorEmail(true)
        }else{
            setErrorEmail(false)
        }
    }else{
        toast.error('Debe ingresar un email')
        setErrorEmail(true)
    }

    if(!password){
        toast.error('Debe ingresar un password')
        setErrorPassword(true)
    }else{
        setErrorPassword(false)
    }

    setLoading(true)

    try {
      let result
      if (isLogin) {
        result = await signIn(email, password)
      } else {
        result = await signUp(email, password)
      }
      if(result.error.code && result.error.code === "invalid_credentials"){
        toast.error(result.error.message)
      }
    } catch (error) {
      console.error('Error inesperado: ' + error.message)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center flex-col min-h-screen px-4 bg-gradient-to-br from-gray-900 to-black text-white">
      <Typography variant="h4" component="h2" className="text-white font-bold mb-6">
        Iniciar Sesión
      </Typography>
      <div className="w-full max-w-xs sm:max-w-sm bg-white rounded-2xl p-6 shadow-xl text-gray-900">
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
            helperText={errorPassword ? 'Introduce una contraseña' : ''}
            label="Contraseña"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            <label className="text-sm">Recordar contraseña</label>
          </div>
  
          <Button
            variant="contained"
            type="submit"
            className="!bg-blue-600 !hover:bg-blue-700 !text-white !py-2 !rounded-xl !text-sm !font-semibold"
          >
            {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
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
import React, { useState, useEffect } from 'react'
import {
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  AppBar,
  Toolbar,
  Box,
  Divider
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { 
  Add, 
  CalendarToday, 
  Person, 
  EmojiEvents,
  Menu,
  Logout,
  Delete,
  FitnessCenter
} from '@mui/icons-material'
import dayjs from 'dayjs'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../db/supabaseClient'

export default function Calendario({ toast }) {
  const { user, signOut } = useAuth()
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [ejercicios, setEjercicios] = useState([
    { nombre: '', repeticiones: '', peso: '' }
  ])
  const [loading, setLoading] = useState(false)

  // Cargar rutina existente cuando cambia la fecha
  useEffect(() => {
    cargarRutina()
  }, [selectedDate, user])

  const cargarRutina = async () => {
    if (!user) return

    const fecha = selectedDate.format('YYYY-MM-DD')
    
    try {
      const { data, error } = await supabase
        .from('rutinas')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', fecha)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 es "no rows returned", que es normal si no hay rutina
        throw error
      }

      if (data && data.ejercicios) {
        // Asegurarse de que ejercicios es un array válido
        const ejerciciosData = Array.isArray(data.ejercicios) ? data.ejercicios : []
        setEjercicios(ejerciciosData.length > 0 ? ejerciciosData : [{ nombre: '', repeticiones: '', peso: '' }])
      } else {
        // Si no hay rutina, resetear a un ejercicio vacío
        setEjercicios([{ nombre: '', repeticiones: '', peso: '' }])
      }
    } catch (err) {
      console.error('Error al cargar rutina:', err)
      setEjercicios([{ nombre: '', repeticiones: '', peso: '' }])
    }
  }

  const handleChangeEjercicio = (index, field, value) => {
    const updated = [...ejercicios]
    updated[index][field] = value
    setEjercicios(updated)
  }

  const handleAddEjercicio = () => {
    setEjercicios([...ejercicios, { nombre: '', repeticiones: '', peso: '' }])
  }

  const handleDeleteEjercicio = (index) => {
    if (ejercicios.length > 1) {
      const updated = ejercicios.filter((_, i) => i !== index)
      setEjercicios(updated)
    }
  }

  const handleGuardar = async () => {
    if (!user) return toast.error('Usuario no autenticado')

    // Filtrar ejercicios vacíos
    const ejerciciosValidos = ejercicios.filter(ej => 
      ej.nombre.trim() !== '' || ej.repeticiones !== '' || ej.peso !== ''
    )

    if (ejerciciosValidos.length === 0) {
      return toast.error('Agrega al menos un ejercicio con datos')
    }

    const fecha = selectedDate.format('YYYY-MM-DD')
    const rutina = {
      user_id: user.id,
      fecha,
      ejercicios: ejerciciosValidos,
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('rutinas')
        .upsert([rutina], { 
          onConflict: 'user_id,fecha',
          ignoreDuplicates: false 
        })

      if (error) throw error

      toast.success('Rutina guardada correctamente')
    } catch (err) {
      console.error('Error al guardar:', err)
      toast.error('Error al guardar rutina: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="px-6 pt-2">
      <Card sx={{ bgcolor: 'white', borderRadius: 3, mb: 2 }}>
        <CardContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
            />
          </LocalizationProvider>
        </CardContent>
      </Card>
  
      {ejercicios.map((ejercicio, index) => (
        <Card key={index} sx={{ bgcolor: 'white', color: 'gray.900', borderRadius: 3, mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Ejercicio {index + 1}
              </Typography>
              {ejercicios.length > 1 && (
                <IconButton 
                  onClick={() => handleDeleteEjercicio(index)}
                  color="error"
                  size="small"
                >
                  <Delete />
                </IconButton>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Ejercicio"
                value={ejercicio.nombre}
                onChange={(e) => handleChangeEjercicio(index, 'nombre', e.target.value)}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Repeticiones"
                  type="number"
                  value={ejercicio.repeticiones}
                  onChange={(e) => handleChangeEjercicio(index, 'repeticiones', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Peso (kg)"
                  type="number"
                  value={ejercicio.peso}
                  onChange={(e) => handleChangeEjercicio(index, 'peso', e.target.value)}
                  fullWidth
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
  
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleAddEjercicio}
          sx={{ 
            color: 'white', 
            borderColor: 'white',
            '&:hover': {
              borderColor: 'gray.300',
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          Añadir ejercicio
        </Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={loading}
          sx={{ 
            bgcolor: 'green.600',
            '&:hover': { bgcolor: 'green.700' }
          }}
        >
          {loading ? 'Guardando...' : 'Guardar rutina'}
        </Button>
      </Box>
    </Box>
  )
}

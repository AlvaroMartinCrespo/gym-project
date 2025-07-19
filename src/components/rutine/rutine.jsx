import React, { useState } from 'react'
import {
  Typography,
  TextField,
  Button,
  Card,
  CardContent
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { Add } from '@mui/icons-material'
import dayjs from 'dayjs'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../db/supabaseClient' // Asegúrate de tener esto

export default function RutinaDiaria({ toast }) {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [ejercicios, setEjercicios] = useState([
    { nombre: '', repeticiones: '', peso: '' }
  ])
  const [loading, setLoading] = useState(false)

  const handleChangeEjercicio = (index, field, value) => {
    const updated = [...ejercicios]
    updated[index][field] = value
    setEjercicios(updated)
  }

  const handleAddEjercicio = () => {
    setEjercicios([...ejercicios, { nombre: '', repeticiones: '', peso: '' }])
  }

  const handleGuardar = async () => {
    if (!user) return toast.error('Usuario no autenticado')

    const fecha = selectedDate.format('YYYY-MM-DD')
    const rutina = {
      user_id: user.id,
      fecha,
      ejercicios,
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('rutinas')
        .upsert([rutina], { onConflict: ['user_id', 'fecha'] })

      if (error) throw error

      toast.success('Rutina guardada correctamente')
    } catch (err) {
      toast.error('Error al guardar rutina: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-6 flex flex-col gap-4">
      <Typography variant="h5" className="text-center font-bold">
        Rutina del {selectedDate.format('DD/MM/YYYY')}
      </Typography>

      <Card className="bg-white rounded-xl overflow-hidden">
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
        <Card key={index} className="bg-white text-gray-900 rounded-xl">
          <CardContent className="flex flex-col gap-2">
            <TextField
              label="Ejercicio"
              value={ejercicio.nombre}
              onChange={(e) => handleChangeEjercicio(index, 'nombre', e.target.value)}
              fullWidth
            />
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
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between items-center">
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleAddEjercicio}
          className="!text-white !border-white"
        >
          Añadir ejercicio
        </Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={loading}
          className="!bg-green-600 !text-white"
        >
          {loading ? 'Guardando...' : 'Guardar rutina'}
        </Button>
      </div>
    </div>
  )
}

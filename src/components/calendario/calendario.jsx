import React, { useState, useEffect } from 'react'
import {
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  Box,
  Autocomplete,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { 
  Add, 
  Delete,
  ExpandMore,
  FitnessCenter
} from '@mui/icons-material'
import dayjs from 'dayjs'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../db/supabaseClient'

export default function Calendario({ toast }) {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [ejerciciosDisponibles, setEjerciciosDisponibles] = useState([])
  const [rutinaEjercicios, setRutinaEjercicios] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarEjerciciosDisponibles()
  }, [])

  useEffect(() => {
    cargarRutina()
  }, [selectedDate, user])

  const cargarEjerciciosDisponibles = async () => {
    try {
      const { data, error } = await supabase
        .from('ejercicios')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true })

      if (error) throw error
      setEjerciciosDisponibles(data || [])
    } catch (err) {
      console.error('Error al cargar ejercicios:', err)
      toast.error('Error al cargar ejercicios disponibles')
    }
  }

  const cargarRutina = async () => {
    if (!user) return

    const fecha = selectedDate.format('YYYY-MM-DD')
    
    try {
      // Cargar rutina del día
      const { data: rutina, error: rutinaError } = await supabase
        .from('rutinas')
        .select('id')
        .eq('user_id', user.id)
        .eq('fecha', fecha)
        .single()

      if (rutinaError && rutinaError.code !== 'PGRST116') {
        throw rutinaError
      }

      if (rutina) {
        // Cargar series de la rutina con información del ejercicio
        const { data: series, error: seriesError } = await supabase
          .from('series')
          .select(`
            *,
            ejercicios (id, nombre, categoria)
          `)
          .eq('rutina_id', rutina.id)
          .order('ejercicio_id')
          .order('serie_numero')

        if (seriesError) throw seriesError

        // Agrupar series por ejercicio
        const ejerciciosAgrupados = {}
        series?.forEach(serie => {
          const ejercicioId = serie.ejercicio_id
          if (!ejerciciosAgrupados[ejercicioId]) {
            ejerciciosAgrupados[ejercicioId] = {
              ejercicio: serie.ejercicios,
              series: []
            }
          }
          ejerciciosAgrupados[ejercicioId].series.push({
            id: serie.id,
            serie_numero: serie.serie_numero,
            repeticiones: serie.repeticiones,
            peso: serie.peso
          })
        })

        setRutinaEjercicios(Object.values(ejerciciosAgrupados))
      } else {
        setRutinaEjercicios([])
      }
    } catch (err) {
      console.error('Error al cargar rutina:', err)
      setRutinaEjercicios([])
    }
  }

  const agregarEjercicio = (ejercicio) => {
    if (!ejercicio) return
    
    // Verificar si el ejercicio ya está en la rutina
    const yaExiste = rutinaEjercicios.some(re => re.ejercicio.id === ejercicio.id)
    if (yaExiste) {
      toast.error('Este ejercicio ya está en tu rutina de hoy')
      return
    }

    const nuevoEjercicio = {
      ejercicio: ejercicio,
      series: [{ serie_numero: 1, repeticiones: '', peso: '' }]
    }

    setRutinaEjercicios([...rutinaEjercicios, nuevoEjercicio])
  }

  const eliminarEjercicio = (ejercicioId) => {
    setRutinaEjercicios(rutinaEjercicios.filter(re => re.ejercicio.id !== ejercicioId))
  }

  const agregarSerie = (ejercicioId) => {
    setRutinaEjercicios(rutinaEjercicios.map(re => {
      if (re.ejercicio.id === ejercicioId) {
        const nuevaSerie = {
          serie_numero: re.series.length + 1,
          repeticiones: '',
          peso: ''
        }
        return { ...re, series: [...re.series, nuevaSerie] }
      }
      return re
    }))
  }

  const eliminarSerie = (ejercicioId, serieNumero) => {
    setRutinaEjercicios(rutinaEjercicios.map(re => {
      if (re.ejercicio.id === ejercicioId) {
        const seriesFiltradas = re.series.filter(s => s.serie_numero !== serieNumero)
        // Renumerar las series
        const seriesRenumeradas = seriesFiltradas.map((s, index) => ({
          ...s,
          serie_numero: index + 1
        }))
        return { ...re, series: seriesRenumeradas }
      }
      return re
    }))
  }

  const actualizarSerie = (ejercicioId, serieNumero, campo, valor) => {
    setRutinaEjercicios(rutinaEjercicios.map(re => {
      if (re.ejercicio.id === ejercicioId) {
        const seriesActualizadas = re.series.map(s => {
          if (s.serie_numero === serieNumero) {
            return { ...s, [campo]: valor }
          }
          return s
        })
        return { ...re, series: seriesActualizadas }
      }
      return re
    }))
  }

  const guardarRutina = async () => {
    if (!user) return toast.error('Usuario no autenticado')

    // Validar que haya ejercicios y series válidas
    const ejerciciosValidos = rutinaEjercicios.filter(re => 
      re.series.some(s => s.repeticiones !== '' || s.peso !== '')
    )

    if (ejerciciosValidos.length === 0) {
      return toast.error('Agrega al menos un ejercicio con datos')
    }

    const fecha = selectedDate.format('YYYY-MM-DD')
    setLoading(true)

    try {
      // 1. Crear o encontrar la rutina del día
      const { data: rutina, error: rutinaError } = await supabase
        .from('rutinas')
        .upsert([{
          user_id: user.id,
          email: user.email,
          fecha: fecha
        }], { 
          onConflict: 'user_id,fecha',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (rutinaError) throw rutinaError

      // 2. Eliminar series existentes de esta rutina
      const { error: deleteError } = await supabase
        .from('series')
        .delete()
        .eq('rutina_id', rutina.id)

      if (deleteError) throw deleteError

      // 3. Insertar las nuevas series
      const seriesToInsert = []
      ejerciciosValidos.forEach(re => {
        re.series.forEach(serie => {
          if (serie.repeticiones !== '' || serie.peso !== '') {
            seriesToInsert.push({
              rutina_id: rutina.id,
              ejercicio_id: re.ejercicio.id,
              serie_numero: serie.serie_numero,
              repeticiones: serie.repeticiones ? parseInt(serie.repeticiones) : null,
              peso: serie.peso ? parseFloat(serie.peso) : null
            })
          }
        })
      })

      if (seriesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('series')
          .insert(seriesToInsert)

        if (insertError) throw insertError
      }

      toast.success('Rutina guardada correctamente')
      await cargarRutina() // Recargar para mostrar los cambios

    } catch (err) {
      console.error('Error al guardar:', err)
      toast.error('Error al guardar rutina: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar ejercicios por categoría para el selector
  const ejerciciosPorCategoria = ejerciciosDisponibles.reduce((acc, ejercicio) => {
    const categoria = ejercicio.categoria || 'Otros'
    if (!acc[categoria]) acc[categoria] = []
    acc[categoria].push(ejercicio)
    return acc
  }, {})

  return (
    <Box className="px-6 pt-2 pb-20">
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

      {/* Selector de ejercicios */}
      <Card sx={{ bgcolor: 'white', borderRadius: 3, mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: 'gray.800' }}>
            Agregar Ejercicio
          </Typography>
          <Autocomplete
            options={ejerciciosDisponibles}
            getOptionLabel={(option) => option.nombre}
            groupBy={(option) => option.categoria || 'Otros'}
            onChange={(event, newValue) => {
              agregarEjercicio(newValue)
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Selecciona un ejercicio"
                fullWidth
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <FitnessCenter sx={{ mr: 1, color: 'gray.500' }} />
                {option.nombre}
                <Chip 
                  label={option.categoria} 
                  size="small" 
                  sx={{ ml: 'auto' }}
                />
              </Box>
            )}
          />
        </CardContent>
      </Card>

      {/* Lista de ejercicios en la rutina */}
      {rutinaEjercicios.map((rutinaEjercicio) => (
        <Card key={rutinaEjercicio.ejercicio.id} sx={{ bgcolor: 'white', borderRadius: 3, mb: 2 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ color: 'gray.800' }}>
                    {rutinaEjercicio.ejercicio.nombre}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {rutinaEjercicio.series.length} serie{rutinaEjercicio.series.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <IconButton 
                  onClick={(e) => {
                    e.stopPropagation()
                    eliminarEjercicio(rutinaEjercicio.ejercicio.id)
                  }}
                  color="error"
                  size="small"
                >
                  <Delete />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {rutinaEjercicio.series.map((serie) => (
                <Box key={serie.serie_numero} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ minWidth: '60px', color: 'gray.600' }}>
                    Serie {serie.serie_numero}:
                  </Typography>
                  <TextField
                    label="Reps"
                    type="number"
                    size="small"
                    value={serie.repeticiones}
                    onChange={(e) => actualizarSerie(
                      rutinaEjercicio.ejercicio.id, 
                      serie.serie_numero, 
                      'repeticiones', 
                      e.target.value
                    )}
                    sx={{ width: '80px' }}
                  />
                  <TextField
                    label="Peso (kg)"
                    type="number"
                    size="small"
                    value={serie.peso}
                    onChange={(e) => actualizarSerie(
                      rutinaEjercicio.ejercicio.id, 
                      serie.serie_numero, 
                      'peso', 
                      e.target.value
                    )}
                    sx={{ width: '100px' }}
                  />
                  {rutinaEjercicio.series.length > 1 && (
                    <IconButton 
                      onClick={() => eliminarSerie(rutinaEjercicio.ejercicio.id, serie.serie_numero)}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => agregarSerie(rutinaEjercicio.ejercicio.id)}
                sx={{ mt: 1 }}
              >
                Agregar serie
              </Button>
            </AccordionDetails>
          </Accordion>
        </Card>
      ))}

      {/* Botón guardar */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
        <Button
          variant="contained"
          onClick={guardarRutina}
          disabled={loading}
          size="large"
          sx={{ 
            bgcolor: 'green.600',
            '&:hover': { bgcolor: 'green.700' },
            px: 4
          }}
        >
          {loading ? 'Guardando...' : 'Guardar rutina'}
        </Button>
      </Box>
    </Box>
  )
}
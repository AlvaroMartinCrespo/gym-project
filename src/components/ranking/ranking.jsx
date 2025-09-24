import { 
    Typography, 
    Box,
    Card,
    CardContent,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    Grid
} from '@mui/material'
import { 
    EmojiEvents,
    FitnessCenter,
    Star,
    TrendingUp
} from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../db/supabaseClient'

export default function Ranking({ toast }) {
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()
    const [selectedCategory, setSelectedCategory] = useState(0)
    const [categories, setCategories] = useState([])
    const [rankings, setRankings] = useState({})
    const [exercises, setExercises] = useState({})

    useEffect(() => {
        loadRankingData()
    }, [])

    const loadRankingData = async () => {
        try {
            setLoading(true)
            
            // Obtener todas las categorías disponibles
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('ejercicios')
                .select('categoria')
                .order('categoria')

            if (categoriesError) throw categoriesError

            // Extraer categorías únicas
            const uniqueCategories = [...new Set(categoriesData.map(item => item.categoria))]
                .filter(cat => cat !== null)
                .sort()

            setCategories(uniqueCategories)

            // Cargar rankings para todas las categorías
            await loadAllRankings(uniqueCategories)

        } catch (error) {
            console.error('Error loading ranking data:', error)
            toast.error('Error al cargar los rankings')
        } finally {
            setLoading(false)
        }
    }

    const loadAllRankings = async (categoriesList) => {
        const allRankings = {}
        const allExercises = {}

        for (const category of categoriesList) {
            try {
                // Obtener ejercicios de esta categoría
                const { data: exercisesData, error: exercisesError } = await supabase
                    .from('ejercicios')
                    .select('id, nombre')
                    .eq('categoria', category)
                    .order('nombre')

                if (exercisesError) throw exercisesError

                allExercises[category] = exercisesData

                // Obtener las series con mejor peso por usuario para cada ejercicio de esta categoría
                const { data: seriesData, error: seriesError } = await supabase
                    .from('series')
                    .select(`
                        peso,
                        repeticiones,
                        ejercicio_id,
                        rutinas!inner (
                            user_id,
                            fecha,
                            email
                        ),
                        ejercicios!inner (
                            nombre,
                            categoria
                        )
                    `)
                    .eq('ejercicios.categoria', category)
                    .not('peso', 'is', null)
                    .order('peso', { ascending: false })

                if (seriesError) throw seriesError

                // Procesar datos para crear ranking por ejercicio
                const categoryRankings = {}

                exercisesData.forEach(exercise => {
                    const exerciseId = exercise.id
                    const exerciseName = exercise.nombre

                    // Filtrar series de este ejercicio específico
                    const exerciseSeries = seriesData.filter(serie => serie.ejercicio_id === exerciseId)

                    // Agrupar por usuario y obtener el mejor peso
                    const userRecords = {}

                    exerciseSeries.forEach(serie => {
                        const userId = serie.rutinas.user_id
                        const userEmail = serie.rutinas.email
                        const currentWeight = parseFloat(serie.peso)

                        if (!userRecords[userId] || currentWeight > userRecords[userId].peso) {
                            userRecords[userId] = {
                                userId,
                                email: userEmail,
                                peso: currentWeight,
                                repeticiones: serie.repeticiones,
                                fecha: serie.rutinas.fecha
                            }
                        }
                    })

                    // Convertir a array y ordenar por peso
                    const ranking = Object.values(userRecords)
                        .sort((a, b) => b.peso - a.peso)
                        .slice(0, 10) // Top 10

                    // Obtener datos de usuario para cada record
                    categoryRankings[exerciseName] = ranking
                })

                allRankings[category] = categoryRankings

            } catch (error) {
                console.error(`Error loading ranking for category ${category}:`, error)
            }
        }

        // Obtener información de usuarios para mostrar nombres/emails
        await enrichWithUserData(allRankings)

        setRankings(allRankings)
        setExercises(allExercises)
    }

    const enrichWithUserData = async (allRankings) => {
        // Obtener todos los user_ids únicos
        const allUserIds = new Set()
        Object.values(allRankings).forEach(categoryRanking => {
            Object.values(categoryRanking).forEach(exerciseRanking => {
                exerciseRanking.forEach(record => {
                    allUserIds.add(record.userId)
                })
            })
        })

        // Obtener datos de usuarios desde Supabase Auth
        try {
            const userDataMap = {}
            
            // Obtener información de usuarios usando el Admin API de Supabase
            for (const userId of allUserIds) {
                try {
                    // Intentar obtener el usuario desde Supabase Auth
                    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
                    
                    if (userData?.user && !userError) {
                        userDataMap[userId] = {
                            name: userData.user.email?.split('@')[0] || `Usuario ${userId.slice(-4)}`,
                            email: userData.user.email || `user${userId.slice(-4)}@gym.com`
                        }
                    } else {
                        // Fallback si no se puede obtener el usuario
                        userDataMap[userId] = {
                            name: `user${userId.slice(-4)}@gym.com`,
                            email: `user${userId.slice(-4)}@gym.com`
                        }
                    }
                } catch (authError) {
                    // Si falla la consulta de auth, usar el email simulado
                    userDataMap[userId] = {
                        name: `user${userId.slice(-4)}@gym.com`,
                        email: `user${userId.slice(-4)}@gym.com`
                    }
                }
            }

            // Enriquecer los rankings con datos de usuario
            Object.keys(allRankings).forEach(category => {
                Object.keys(allRankings[category]).forEach(exercise => {
                    allRankings[category][exercise] = allRankings[category][exercise].map(record => ({
                        ...record,
                        userData: userDataMap[record.userId] || { 
                            name: `user${record.userId.slice(-4)}@gym.com`, 
                            email: `user${record.userId.slice(-4)}@gym.com`
                        }
                    }))
                })
            })

        } catch (error) {
            console.error('Error enriching user data:', error)
        }
    }

    const handleCategoryChange = (event, newValue) => {
        setSelectedCategory(newValue)
    }

    const getPositionColor = (position) => {
        switch (position) {
            case 0: return 'gold'
            case 1: return 'silver' 
            case 2: return '#CD7F32' // bronze
            default: return 'primary'
        }
    }

    const getPositionIcon = (position) => {
        switch (position) {
            case 0: return '🥇'
            case 1: return '🥈'
            case 2: return '🥉'
            default: return `#${position + 1}`
        }
    }

    if (loading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '50vh' 
            }}>
                <CircularProgress />
            </Box>
        )
    }

    if (categories.length === 0) {
        return (
            <Box sx={{ padding: 2, paddingBottom: 10 }}>
                <Alert severity="info">
                    No hay datos de entrenamientos para mostrar rankings aún.
                </Alert>
            </Box>
        )
    }

    const currentCategory = categories[selectedCategory]
    const currentRankings = rankings[currentCategory] || {}
    const currentExercises = exercises[currentCategory] || []

    return (
        <Box sx={{ 
            padding: 0, 
            paddingBottom: 10,
            bgcolor: 'grey.50',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <Box sx={{ padding: 2, bgcolor: 'white', boxShadow: 1 }}>
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmojiEvents sx={{ marginRight: 1, color: 'primary.main' }} />
                    Rankings
                </Typography>
                
                {/* Tabs para categorías */}
                <Tabs
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'capitalize',
                            minWidth: 'auto'
                        }
                    }}
                >
                    {categories.map((category, index) => (
                        <Tab 
                            key={category} 
                            label={category} 
                            sx={{ textTransform: 'capitalize' }}
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Contenido de rankings por ejercicio */}
            <Box sx={{ padding: 2 }}>
                {currentExercises.length === 0 ? (
                    <Alert severity="info">
                        No hay ejercicios registrados en la categoría {currentCategory}.
                    </Alert>
                ) : (
                    <Grid container spacing={2}>
                        {currentExercises.map((exercise) => {
                            const exerciseRanking = currentRankings[exercise.nombre] || []
                            
                            if (exerciseRanking.length === 0) {
                                return null // No mostrar ejercicios sin datos
                            }

                            return (
                                <Grid item xs={12} key={exercise.id}>
                                    <Card sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography 
                                                variant="h6" 
                                                gutterBottom 
                                                sx={{ 
                                                    textTransform: 'capitalize',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    mb: 2
                                                }}
                                            >
                                                <FitnessCenter sx={{ mr: 1, color: 'primary.main' }} />
                                                {exercise.nombre}
                                            </Typography>
                                            
                                            <List dense>
                                                {exerciseRanking.map((record, index) => (
                                                    <Box key={`${record.userId}-${index}`}>
                                                        <ListItem sx={{ px: 0 }}>
                                                            <ListItemAvatar>
                                                                <Avatar 
                                                                    sx={{ 
                                                                        bgcolor: index < 3 ? getPositionColor(index) : 'grey.400',
                                                                        color: 'white',
                                                                        width: 40,
                                                                        height: 40,
                                                                        fontSize: '0.9rem'
                                                                    }}
                                                                >
                                                                    {getPositionIcon(index)}
                                                                </Avatar>
                                                            </ListItemAvatar>
                                                            <ListItemText
                                                                primary={
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Typography variant="body1" fontWeight="medium">
                                                                            {record.email}
                                                                        </Typography>
                                                                        <Chip
                                                                            label={`${record.peso} kg`}
                                                                            size="small"
                                                                            color="primary"
                                                                            variant="outlined"
                                                                        />
                                                                    </Box>
                                                                }
                                                                secondary={
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {record.repeticiones} reps • {new Date(record.fecha).toLocaleDateString('es-ES')}
                                                                    </Typography>
                                                                }
                                                            />
                                                        </ListItem>
                                                        {index < exerciseRanking.length - 1 && 
                                                            <Divider variant="inset" component="li" />
                                                        }
                                                    </Box>
                                                ))}
                                            </List>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )
                        })}
                    </Grid>
                )}
            </Box>
        </Box>
    )
}
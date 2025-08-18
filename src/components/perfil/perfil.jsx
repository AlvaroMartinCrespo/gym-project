import { 
    Typography, 
    Box, 
    Card, 
    CardContent, 
    Avatar, 
    Grid, 
    LinearProgress,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    Button,
    CircularProgress
} from '@mui/material'
import { 
    Person, 
    Email, 
    FitnessCenter, 
    Timeline, 
    CalendarToday,
    Edit,
    Star,
    TrendingUp,
    EmojiEvents
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from '../../db/supabaseClient' // Ajusta la ruta según tu configuración

export default function Perfil({ toast }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        workoutsThisMonth: 0,
        currentStreak: 0,
        totalWorkouts: 0,
        favoriteExercise: 'Sin datos',
        joinDate: '',
        totalSeries: 0,
        averageWeight: 0
    })
    const [recentWorkouts, setRecentWorkouts] = useState([])
    const [achievements, setAchievements] = useState([])

    useEffect(() => {
        if (user) {
            loadUserStats()
        }
    }, [user])

    const loadUserStats = async () => {
        try {
            setLoading(true)
            await Promise.all([
                loadBasicStats(),
                loadRecentWorkouts(),
                loadAchievements()
            ])
        } catch (error) {
            console.error('Error loading user stats:', error)
            toast.error('Error al cargar estadísticas del perfil')
        } finally {
            setLoading(false)
        }
    }

    const loadBasicStats = async () => {
        // Obtener rutinas del usuario
        const { data: rutinas, error: rutinasError } = await supabase
            .from('rutinas')
            .select(`
                id,
                fecha,
                created_at,
                series (
                    id,
                    repeticiones,
                    peso,
                    ejercicio_id,
                    ejercicios (
                        nombre,
                        categoria
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('fecha', { ascending: false })

        if (rutinasError) throw rutinasError

        // Calcular estadísticas básicas
        const totalWorkouts = rutinas?.length || 0
        
        // Rutinas de este mes
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const workoutsThisMonth = rutinas?.filter(rutina => {
            const rutinaDate = new Date(rutina.fecha)
            return rutinaDate.getMonth() === currentMonth && rutinaDate.getFullYear() === currentYear
        }).length || 0

        // Calcular racha actual
        const currentStreak = calculateCurrentStreak(rutinas)

        // Ejercicio favorito (el más usado)
        const exerciseCounts = {}
        let totalSeries = 0
        let totalWeight = 0
        let totalWeightSeries = 0

        rutinas?.forEach(rutina => {
            rutina.series?.forEach(serie => {
                totalSeries++
                if (serie.peso) {
                    totalWeight += parseFloat(serie.peso)
                    totalWeightSeries++
                }
                const exerciseName = serie.ejercicios.nombre
                exerciseCounts[exerciseName] = (exerciseCounts[exerciseName] || 0) + 1
            })
        })

        const favoriteExercise = Object.keys(exerciseCounts).reduce((a, b) => 
            exerciseCounts[a] > exerciseCounts[b] ? a : b
        , 'Sin datos')

        const averageWeight = totalWeightSeries > 0 ? (totalWeight / totalWeightSeries).toFixed(1) : 0

        // Fecha de registro del usuario
        const joinDate = user.created_at ? 
            new Date(user.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }) : 'Sin datos'

        setStats({
            workoutsThisMonth,
            currentStreak,
            totalWorkouts,
            favoriteExercise,
            joinDate,
            totalSeries,
            averageWeight: parseFloat(averageWeight)
        })
    }

    const calculateCurrentStreak = (rutinas) => {
        if (!rutinas || rutinas.length === 0) return 0

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const sortedRutinas = rutinas
            .map(r => new Date(r.fecha))
            .sort((a, b) => b - a)

        let streak = 0
        let checkDate = new Date(today)

        // Si no hay rutina hoy, empezar desde ayer
        if (!sortedRutinas.some(date => date.getTime() === today.getTime())) {
            checkDate.setDate(checkDate.getDate() - 1)
        }

        while (checkDate >= sortedRutinas[sortedRutinas.length - 1]) {
            const hasWorkout = sortedRutinas.some(date => date.getTime() === checkDate.getTime())
            
            if (hasWorkout) {
                streak++
                checkDate.setDate(checkDate.getDate() - 1)
            } else {
                break
            }
        }

        return streak
    }

    const loadRecentWorkouts = async () => {
        const { data: rutinas, error } = await supabase
            .from('rutinas')
            .select(`
                fecha,
                series (
                    id,
                    ejercicios (
                        categoria
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('fecha', { ascending: false })
            .limit(5)

        if (error) throw error

        const workoutsWithDetails = rutinas?.map(rutina => {
            // Contar ejercicios por categoría
            const categories = {}
            rutina.series?.forEach(serie => {
                const cat = serie.ejercicios.categoria
                categories[cat] = (categories[cat] || 0) + 1
            })

            // Determinar el tipo principal de rutina
            const mainCategory = Object.keys(categories).reduce((a, b) => 
                categories[a] > categories[b] ? a : b
            , 'Rutina general')

            const totalSeries = rutina.series?.length || 0
            const duration = `${Math.max(30, totalSeries * 3)} min` // Estimación

            return {
                date: new Date(rutina.fecha).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }),
                type: capitalizeFirst(mainCategory),
                duration,
                series: totalSeries
            }
        }) || []

        setRecentWorkouts(workoutsWithDetails)
    }

    const loadAchievements = () => {
        const achievementsList = [
            { 
                id: 1, 
                name: 'Primera rutina', 
                description: 'Completaste tu primera rutina', 
                earned: stats.totalWorkouts >= 1 
            },
            { 
                id: 2, 
                name: 'Racha de 3 días', 
                description: 'Entrena 3 días seguidos', 
                earned: stats.currentStreak >= 3 
            },
            { 
                id: 3, 
                name: 'Racha de 7 días', 
                description: 'Entrena 7 días seguidos', 
                earned: stats.currentStreak >= 7 
            },
            { 
                id: 4, 
                name: 'Constancia', 
                description: 'Completa 20 rutinas', 
                earned: stats.totalWorkouts >= 20 
            },
            { 
                id: 5, 
                name: 'Fuerza superior', 
                description: 'Completa 100 series', 
                earned: stats.totalSeries >= 100 
            },
            { 
                id: 6, 
                name: 'Mes activo', 
                description: 'Entrena 15 días en un mes', 
                earned: stats.workoutsThisMonth >= 15 
            }
        ]

        setAchievements(achievementsList)
    }

    const capitalizeFirst = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1)
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

    return (
        <Box sx={{ 
            padding: 2, 
            paddingBottom: 10, // Espacio para la bottom navigation
            bgcolor: 'grey.50',
            minHeight: '100vh'
        }}>
            {/* Header del perfil */}
            <Card sx={{ marginBottom: 2 }}>
                <CardContent sx={{ textAlign: 'center', padding: 3 }}>
                    <Avatar
                        sx={{ 
                            width: 80, 
                            height: 80, 
                            margin: '0 auto 16px',
                            bgcolor: 'primary.main',
                            fontSize: '2rem'
                        }}
                    >
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <Typography variant="h5" gutterBottom>
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {user?.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Miembro desde {stats.joinDate}
                    </Typography>
                    <Button 
                        variant="outlined" 
                        startIcon={<Edit />}
                        sx={{ marginTop: 2 }}
                        onClick={() => toast.info('Función de editar próximamente')}
                    >
                        Editar Perfil
                    </Button>
                </CardContent>
            </Card>

            {/* Estadísticas principales */}
            <Grid container spacing={2} sx={{ marginBottom: 2 }}>
                <Grid item xs={6}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <FitnessCenter sx={{ fontSize: 40, color: 'primary.main', marginBottom: 1 }} />
                            <Typography variant="h4" color="primary">
                                {stats.workoutsThisMonth}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Rutinas este mes
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Timeline sx={{ fontSize: 40, color: 'success.main', marginBottom: 1 }} />
                            <Typography variant="h4" color="success.main">
                                {stats.currentStreak}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Días seguidos
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Progreso del mes */}
            <Card sx={{ marginBottom: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Progreso del Mes
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                            Meta mensual:
                        </Typography>
                        <Box sx={{ width: '100%', marginLeft: 1 }}>
                            <LinearProgress 
                                variant="determinate" 
                                value={Math.min((stats.workoutsThisMonth / 20) * 100, 100)} 
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ marginLeft: 1 }}>
                            {stats.workoutsThisMonth}/20
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            {/* Logros */}
            <Card sx={{ marginBottom: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmojiEvents sx={{ marginRight: 1 }} />
                        Logros ({achievements.filter(a => a.earned).length}/{achievements.length})
                    </Typography>
                    <Grid container spacing={1}>
                        {achievements.map((achievement) => (
                            <Grid item xs={6} key={achievement.id}>
                                <Chip
                                    icon={<Star />}
                                    label={achievement.name}
                                    variant={achievement.earned ? "filled" : "outlined"}
                                    color={achievement.earned ? "primary" : "default"}
                                    size="small"
                                    sx={{ width: '100%', justifyContent: 'flex-start' }}
                                    onClick={() => toast.info(achievement.description)}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            {/* Estadísticas detalladas */}
            <Card sx={{ marginBottom: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Estadísticas
                    </Typography>
                    <List dense>
                        <ListItem>
                            <ListItemIcon>
                                <FitnessCenter />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Total de rutinas" 
                                secondary={stats.totalWorkouts}
                            />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                        <ListItem>
                            <ListItemIcon>
                                <Star />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Ejercicio favorito" 
                                secondary={stats.favoriteExercise}
                            />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                        <ListItem>
                            <ListItemIcon>
                                <TrendingUp />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Total de series" 
                                secondary={stats.totalSeries}
                            />
                        </ListItem>
                        {stats.averageWeight > 0 && (
                            <>
                                <Divider variant="inset" component="li" />
                                <ListItem>
                                    <ListItemIcon>
                                        <FitnessCenter />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Peso promedio" 
                                        secondary={`${stats.averageWeight} kg`}
                                    />
                                </ListItem>
                            </>
                        )}
                    </List>
                </CardContent>
            </Card>

            {/* Rutinas recientes */}
            {recentWorkouts.length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarToday sx={{ marginRight: 1 }} />
                            Rutinas Recientes
                        </Typography>
                        <List dense>
                            {recentWorkouts.map((workout, index) => (
                                <Box key={index}>
                                    <ListItem>
                                        <ListItemIcon>
                                            <FitnessCenter color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={workout.type}
                                            secondary={`${workout.date} • ${workout.series} series • ${workout.duration}`}
                                        />
                                    </ListItem>
                                    {index < recentWorkouts.length - 1 && <Divider variant="inset" component="li" />}
                                </Box>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}
        </Box>
    )
}
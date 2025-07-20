import { useAuth } from '../../hooks/useAuth'
import { useState } from 'react'
import Login from '../../components/login/login'
import Register from '../../components/register/register'
import Calendario from '../calendario/calendario'
import Ranking from '../ranking/ranking'
import Perfil from '../perfil/perfil'
import {
    Typography,
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
import { 
    Add, 
    CalendarToday, 
    Person, 
    EmojiEvents,
    Menu,
    Logout,
  } from '@mui/icons-material'

export default function Layout({title, toast}){
    const { user, loading, signOut } = useAuth()
    const [isLogin, setIsLogin] = useState(true)
    const [route, setRoute] = useState('calendario')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [bottomNavValue, setBottomNavValue] = useState(0)

    const getContent = (route) =>{  
        switch(route){
            case 'calendario':
                return <Calendario toast={toast}/>
            case 'perfil':
                return <Perfil toast={toast}/>
            case 'ranking':
                return <Ranking toast={toast}/>
        }
    }
  
    const handleBottomNavChange = (event, newValue) => {
        setBottomNavValue(newValue)
        switch(newValue) {
          case 0:
            setRoute('calendario')
            break
          case 1:
            setRoute('perfil')
            break
          case 2:
            setRoute('ranking')
            break
        }
    }

    const handleSignOut = async () => {
        try {
          await signOut()
          toast.success('Sesión cerrada correctamente')
        } catch (error) {
          toast.error('Error al cerrar sesión')
        }
        setDrawerOpen(false)
    }

    const drawerContent = (
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            <ListItem>
              <ListItemIcon>
                <Person />
              </ListItemIcon>
              <ListItemText 
                primary={user?.email || 'Usuario'} 
                secondary="Mi cuenta"
              />
            </ListItem>
          </List>
          <Divider />
          <List>
            <ListItem button onClick={() => {
              setDrawerOpen(false)
              // Navegar a configuración si tienes esa ruta
            }}>
            </ListItem>
            <ListItem button onClick={handleSignOut}>
              <ListItemIcon>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Cerrar sesión" />
            </ListItem>
          </List>
        </Box>
    )

    if (!user) {
        if(isLogin){
            return <Login toast={toast} setIsLogin={setIsLogin} isLogin={isLogin}/>
        }
        return <Register toast={toast} setIsLogin={setIsLogin} isLogin={isLogin}/>
    }
  
    return <>
        <Box>
            {/* App Bar */}
            <AppBar position="static" sx={{ bgcolor: 'gray.900' }}>
                <Toolbar>
                <IconButton
                    edge="start"
                    color="inherit"
                    onClick={() => setDrawerOpen(true)}
                >
                    <Menu />
                </IconButton>
                <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
                    Rutina
                </Typography>
                </Toolbar>
            </AppBar>

            {/* Drawer */}
            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                {drawerContent}
            </Drawer>

            {getContent(route)}
            
            <BottomNavigation
                value={bottomNavValue}
                onChange={handleBottomNavChange}
                showLabels
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    '& .MuiBottomNavigationAction-root': {
                        color: 'white',
                        '&.Mui-selected': {
                        color: 'secondary.main'
                        }
                    }
                }}
            >
                <BottomNavigationAction
                    label="Calendario"
                    icon={<CalendarToday />}
                />
                <BottomNavigationAction
                    label="Perfil"
                    icon={<Person />}
                />
                <BottomNavigationAction
                    label="Ranking"
                    icon={<EmojiEvents />}
                />
            </BottomNavigation>
        </Box>
    </>
}
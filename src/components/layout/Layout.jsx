import { useAuth } from '../../hooks/useAuth'
import { useState } from 'react'
import { Button } from '@mui/material'
import Login from '../../components/login/login'
import Register from '../../components/register/register'
import Rutine from '../../components/rutine/rutine'

export default function Layout({title, toast}){
    const { user, loading, signOut } = useAuth()
    const [isLogin, setIsLogin] = useState(true)
  
    if (!user) {
        if(isLogin){
            return <Login toast={toast} setIsLogin={setIsLogin} isLogin={isLogin}/>
        }
        return <Register toast={toast} setIsLogin={setIsLogin} isLogin={isLogin}/>
    }
  
    return <>
        <div>
            <Rutine />
            <Button onClick={signOut} variant="contained">
                Sign Out
            </Button>
        </div>
    </>
}
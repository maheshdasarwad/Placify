//hook layer
import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../auth/services/auth.api";


export const useAuth = () => {
    const context = useContext(AuthContext)
    const {user, setUser, loading, setLoading} = context

    const handleLogin = async ({email,password}) => {
        setLoading(true)
        try{
            const data = await login({email, password})  //api call 
            setUser(data.user)
        } catch(err) {
            console.log(err)
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({username, email, password}) => {
        setLoading(true) //state manage
        try{
            const data = await register({username, email, password}) //api call
            setUser(data.user)
        } catch(err){
            console.log(err)
        } finally{
            setLoading(false)
        }
    }

    const handleLogout = async() => {
        setLoading(true) //state manage
        try{
            const data = await logout() //apicall
            setUser(null)
        } catch(err){
            console.log(err)
        } finally{
            setLoading(false)
        }
    }

    useEffect(() => {
        
        const getAndSetUser = async() => {
            try{
                const response = await getMe()
                setUser(response.user)
            } catch(err) {
                console.log(err)
                setUser(null)
            } finally {
                setLoading(false)
            }   
        }
        getAndSetUser()
    },[])


    return {user, loading, handleLogin, handleRegister, handleLogout}
}
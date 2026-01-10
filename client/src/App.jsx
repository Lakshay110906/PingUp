import React, { useRef, useEffect } from 'react' // Added useEffect
import { Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Messages from './pages/Messages'
import ChatBox from './pages/ChatBox'
import Connections from './pages/Connections'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import CreatePost from './pages/CreatePost'
import { useAuth, useUser } from '@clerk/clerk-react'
import Layout from './pages/Layout'
import { Toaster, toast } from 'react-hot-toast' // Consolidated imports
import { useDispatch, useSelector } from 'react-redux' // 1. Import useSelector
import { fetchUser } from './features/user/userSlice'
import { fetchConnections } from './features/connections/connectionsSlice'
import { addMessage } from './features/messages/messagesSlice'
import Notification from './components/Notification'

const App = () => {
  const { user } = useUser() // Clerk User (Used for auth check)
  const { getToken } = useAuth()
  const dispatch = useDispatch()
  
  // 2. Get the Real Database User from Redux
  // We need this user's _id for the live connection
  const mongoUser = useSelector((state) => state.user.user) 

  const { pathname } = useLocation()
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken()
        dispatch(fetchUser(token))
        dispatch(fetchConnections(token))
      }
    }
    fetchData()
  }, [user, getToken, dispatch])

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  // 3. EVENT SOURCE CONNECTION
  useEffect(() => {
    // Only connect if we have the mongoUser loaded
    if (mongoUser) {
      
      // FIX: Use mongoUser._id (Database ID) instead of user.id (Clerk ID)
      const eventSource = new EventSource(import.meta.env.VITE_BASEURL + '/api/message/' + mongoUser._id)

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        // Check if we are currently looking at the chat where the message came from
        if (pathnameRef.current === ('/messages/' + message.from_user_id._id)) {
          dispatch(addMessage(message))
        } else {
          // Otherwise show a notification
          toast.custom((t) => (
            <Notification t={t} message={message} />
          ), { position: 'bottom-right' })
        }
      }

      eventSource.onerror = (error) => {
        console.error("SSE Error:", error)
        eventSource.close()
      }

      return () => {
        eventSource.close()
      }
    }
  }, [mongoUser, dispatch]) // Dependency is now mongoUser, not user

  return (
    <>
      <Toaster />
      <Routes>
        <Route path='/' element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path='messages' element={<Messages />} />
          <Route path='messages/:userId' element={<ChatBox />} />
          <Route path='connections' element={<Connections />} />
          <Route path='discover' element={<Discover />} />
          <Route path='profile' element={<Profile />} />
          <Route path='profile/:profileId' element={<Profile />} />
          <Route path='create-post' element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
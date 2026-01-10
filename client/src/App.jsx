import React, { useRef, useEffect } from 'react'
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
import { Toaster, toast } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUser } from './features/user/userSlice'
import { fetchConnections } from './features/connections/connectionsSlice'
import { addMessage } from './features/messages/messagesSlice'
import Notification from './components/Notification'

const App = () => {
  const { user } = useUser()
  const { getToken } = useAuth()
  const dispatch = useDispatch()
  
  // 1. GET THE DATABASE USER (This contains the correct _id for messaging)
  const mongoUser = useSelector((state) => state.user.value) 

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

  // 2. LIVE CHAT CONNECTION (SSE)
  useEffect(() => {
    // Only connect if we have the MongoDB user data loaded
    if (mongoUser) {
      
      console.log("Connecting to SSE with DB ID:", mongoUser._id);
      
      // CRITICAL FIX: Use mongoUser._id (Database ID) instead of user.id (Clerk ID)
      const eventSource = new EventSource(import.meta.env.VITE_BASEURL + '/api/message/' + mongoUser._id)

      eventSource.onopen = () => {
        console.log("✅ SSE Connection Established");
      };

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        // Handle ID mismatch if population fails (String vs Object)
        const senderId = typeof message.from_user_id === 'object' 
          ? message.from_user_id._id 
          : message.from_user_id;

        // Check if we are currently looking at the chat where the message came from
        if (pathnameRef.current === ('/messages/' + senderId)) {
          dispatch(addMessage(message))
        } else {
          // Otherwise show a notification
          toast.custom((t) => (
            <Notification t={t} message={message} />
          ), { position: 'bottom-right' })
        }
      }

      eventSource.onerror = (error) => {
        console.error("SSE Error:", error);
        eventSource.close();
      }

      return () => {
        eventSource.close()
      }
    }
  }, [mongoUser, dispatch]) // Dependency is mongoUser

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
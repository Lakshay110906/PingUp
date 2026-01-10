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
import { fetchMessages } from './features/messages/messagesSlice' // Import fetchMessages
import Notification from './components/Notification'
import api from './api/axios' // Import API to make manual calls

const App = () => {
  const { user } = useUser()
  const { getToken } = useAuth()
  const dispatch = useDispatch()
  
  const mongoUser = useSelector((state) => state.user.value) 
  const { messages } = useSelector((state) => state.messages) // Access current chat messages if any

  const { pathname } = useLocation()
  const pathnameRef = useRef(pathname)
  const lastMessageIdRef = useRef(null) // Keep track of the last received message

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

  // --- REPLACED SSE WITH POLLING (Works on Vercel) ---
  useEffect(() => {
    if (!mongoUser) return;

    const pollServer = async () => {
      try {
        const token = await getToken();
        
        // 1. Fetch Recent Conversations
        const { data } = await api.get('/api/user/recent-messages', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (data.success && data.messages.length > 0) {
            const latestChat = data.messages[0];
            const latestMsg = latestChat.lastMessage;

            // 2. Check if this is a NEW message we haven't seen yet
            if (lastMessageIdRef.current && lastMessageIdRef.current !== latestMsg._id) {
                
                // 3. Check if it's INCOMING (not sent by me)
                if (latestMsg.from_user_id !== mongoUser._id) {
                    
                    // 4. If we are currently in that chat window...
                    if (pathnameRef.current === ('/messages/' + latestChat.user._id)) {
                        // ...Fetch the full chat history to update the screen
                        dispatch(fetchMessages({ token, userId: latestChat.user._id }));
                    } else {
                        // 5. Otherwise, show a Notification
                        const notifData = {
                             ...latestMsg,
                             from_user_id: latestChat.user // Ensure this matches Notification structure
                        }
                        
                        toast.custom((t) => (
                            <Notification t={t} message={notifData} />
                        ), { position: 'bottom-right' })
                    }
                }
            }
            
            // Update our ref so we don't notify again for the same message
            lastMessageIdRef.current = latestMsg._id;
        }

      } catch (error) {
        console.error("Polling Error:", error);
      }
    };

    // Run immediately
    pollServer();

    // Run every 3 seconds (Adjust as needed)
    const intervalId = setInterval(pollServer, 2000);

    return () => clearInterval(intervalId);

  }, [mongoUser, dispatch, getToken]); 

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
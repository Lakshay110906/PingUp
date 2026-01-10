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
import { addMessage, fetchMessages } from './features/messages/messagesSlice'
import Notification from './components/Notification'
import api from './api/axios'

const App = () => {
  const { user } = useUser()
  const { getToken } = useAuth()
  const dispatch = useDispatch()
  
  const mongoUser = useSelector((state) => state.user.value) 
  
  const { pathname } = useLocation()
  const pathnameRef = useRef(pathname)
  const lastMessageIdRef = useRef(null) 

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

  // --- POLLING LOGIC (FIXED) ---
  useEffect(() => {
    if (!mongoUser) return;

    const pollServer = async () => {
      try {
        const token = await getToken();
        
        // Fetch Inbox
        const { data } = await api.get('/api/user/recent-messages', {
            headers: { Authorization: `Bearer ${token}` }
        });

        // FIX: Check directly for messages array
        if (data.success && data.messages && data.messages.length > 0) {
            // The endpoint returns a sorted array of MESSAGES, not chats.
            // So data.messages[0] IS the latest message.
            const latestMsg = data.messages[0]; 

            // 1. Check if this is a NEW message we haven't seen yet
            if (lastMessageIdRef.current && lastMessageIdRef.current !== latestMsg._id) {
                
                // 2. Identify Sender (Handle populated object vs string ID)
                const senderId = latestMsg.from_user_id?._id || latestMsg.from_user_id;

                // 3. Ensure it's not a message I sent to myself (just in case)
                if (senderId !== mongoUser._id) {
                    
                    // 4. If we are currently in that chat window...
                    if (pathnameRef.current === ('/messages/' + senderId)) {
                        // Refresh the chat to show the new message
                        dispatch(fetchMessages({ token, userId: senderId }));
                    } else {
                        // 5. Otherwise, show Notification
                        toast.custom((t) => (
                            <Notification t={t} message={latestMsg} />
                        ), { position: 'bottom-right' })
                    }
                }
            }
            
            // Update ref to current latest ID
            lastMessageIdRef.current = latestMsg._id;
        }

      } catch (error) {
        console.error("Polling Error:", error);
      }
    };

    pollServer();
    const intervalId = setInterval(pollServer, 3000); // Check every 3 seconds

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
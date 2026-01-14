import React, { useEffect, useRef, useState } from 'react'
import { ImageIcon, SendHorizonal, MoreVertical, Trash2, ArrowLeft } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link, useNavigate } from 'react-router'
import { useAuth } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { addMessage, fetchMessages, resetMessages, deleteMessageFromState } from '../features/messages/messagesSlice'

const ChatBox = () => {
  const { messages } = useSelector((state) => state.messages)
  const userState = useSelector((state) => state.user.value)
  const { userId } = useParams()
  const { getToken } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [user, setUser] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)

  const messagesEndRef = useRef(null)
  const isFirstLoad = useRef(true)

  const connections = useSelector((state) => state.connections.connections)

  const fetchUserMessages = async () => {
    try {
      const token = await getToken()
      dispatch(fetchMessages({ token, userId }))
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Live Listener
  useEffect(() => {
    if (!userState?._id) return;

    const backendUrl = import.meta.env.VITE_BASEURL ;
    const eventSource = new EventSource(`${backendUrl}/api/message/${userState._id}`);

    eventSource.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      
      const isRelated = 
          (newMessage.from_user_id._id === userId || newMessage.from_user_id === userId) || 
          (newMessage.to_user_id._id === userId || newMessage.to_user_id === userId);

      if (isRelated) {
         dispatch(addMessage(newMessage)); 
      }
    };

    return () => {
      eventSource.close();
    };
  }, [userState, userId, dispatch]);

  const sendMessage = async () => {
    try {
      if (!text && !image) return
      const token = await getToken()
      const formData = new FormData()

      formData.append('to_user_id', userId)
      formData.append('text', text)
      image && formData.append('image', image)

      const { data } = await api.post('/api/message/send', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        setText('')
        setImage(null)
        dispatch(addMessage(data.message))
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (messageId, type) => {
    try {
      const token = await getToken();
      dispatch(deleteMessageFromState({ messageId, type })); 
      setActiveMenuId(null);

      const { data } = await api.post('/api/message/delete',
        { messageId, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.success) {
        fetchUserMessages();
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  }

  const handleClearChat = async () => {
      if(!confirm("Are you sure you want to clear this chat? This will remove all messages for you.")) return;
      
      try {
          const token = await getToken();
          const { data } = await api.post('/api/message/clear', 
              { to_user_id: userId },
              { headers: { Authorization: `Bearer ${token}` } }
          );

          if (data.success) {
              toast.success("Chat cleared");
              dispatch(resetMessages());
              setShowHeaderMenu(false);
          } else {
              toast.error(data.message);
          }
      } catch (error) {
          console.error(error);
          toast.error("Failed to clear chat");
      }
  }

  useEffect(() => {
    const handleClickOutside = () => {
        setActiveMenuId(null);
        setShowHeaderMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    isFirstLoad.current = true
    fetchUserMessages()
    return () => { dispatch(resetMessages()) }
  }, [userId])

  useEffect(() => {
    if (connections.length > 0) {
      const user = connections.find(connection => connection._id === userId)
      setUser(user)
    }
  }, [connections, userId])

  useEffect(() => {
    if (messages.length > 0) {
      const scrollBehavior = isFirstLoad.current ? 'auto' : 'smooth';
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: scrollBehavior });
        isFirstLoad.current = false;
      }, 50);
    }
  }, [messages]);

  // Sort Descending (Newest First) for flex-col-reverse
  const reversedMessages = messages.toSorted((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return user && (
    <div className='flex flex-col h-screen'>
      {/* Header */}
      <div className='flex items-center justify-between p-2 md:px-10 xl:pl-42 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-300 relative z-30'>
        <div className='flex items-center gap-2'>
            <button onClick={() => navigate(-1)} className='md:hidden text-gray-600'>
                <ArrowLeft size={24} />
            </button>

            <img src={user.profile_picture} className='size-8 rounded-full' alt="" />
            <div>
              <p className='font-medium'>{user.full_name}</p>
              <p className='text-sm text-gray-500 -mt-1.5'>@{user.username}</p>
            </div>
        </div>

        <div className='relative max-sm:mr-10'>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setShowHeaderMenu(!showHeaderMenu);
                }}
                className='p-2 rounded-full hover:bg-black/5 transition'
            >
                <MoreVertical className='text-gray-600' size={20}/>
            </button>
            
            {showHeaderMenu && (
                <div className='absolute right-0 top-10 bg-white shadow-lg rounded-lg border border-gray-100 py-1 w-40 z-50 ring-1 ring-black ring-opacity-5'>
                    <button 
                        onClick={handleClearChat}
                        className='w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2'
                    >
                        <Trash2 size={16}/>
                        Clear Chat
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Messages Area - Updated for Bottom-to-Top Stacking */}
      {/* flex-col-reverse starts content from the visual bottom */}
      <div className='p-5 md:px-10 flex-1 overflow-y-scroll custom-scroll flex flex-col-reverse'>
        <div className='space-y-4 max-w-4xl mx-auto w-full'>
          
          {/* Scroll Anchor - Placed at the "Start" (which is visual Bottom in reverse col) */}
          <div ref={messagesEndRef} />

          {
            reversedMessages.map((message, index) => {
               const isMyMessage = (message.from_user_id?._id === userState?._id) || (message.from_user_id === userState?._id);
               // In reversed list, "top" items are visually at bottom.
               const isNearBottom = index <= 2; 

               return (
                <div key={index} className={`flex flex-col group relative ${message.to_user_id !== user._id ? 'items-start' : 'items-end'}`}>
                  
                  <div className={`relative p-2 text-sm max-w-[80%] md:max-w-sm text-slate-700 rounded-lg shadow 
                      ${message.to_user_id !== user._id ? 'rounded-bl-none bg-purple-100' : 'rounded-br-none bg-white'}
                      ${message.is_deleted_everyone ? 'italic text-gray-500 bg-gray-100' : ''}
                  `}>
                    
                    {/* 3-Dot Menu */}
                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === message._id ? null : message._id);
                    }}
                    className={`absolute top-1 
                        ${message.to_user_id !== user._id ? '-right-6 md:-right-8' : '-left-6 md:-left-8'} 
                        p-2 rounded-full hover:bg-gray-100 text-gray-500 
                        opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`} 
                    >
                    <MoreVertical size={20} />
                    </button>

                    {/* Dropdown */}
                    {activeMenuId === message._id && (
                      <div className={`absolute z-20 ${isNearBottom ? 'bottom-8' : 'top-8'} 
                        ${message.to_user_id !== user._id ? 'left-0' : 'right-0'} 
                        bg-white shadow-xl rounded-lg border border-gray-100 py-1 w-44 overflow-hidden ring-1 ring-black ring-opacity-5`}
                      >
                        <button onClick={() => handleDelete(message._id, 'me')} className="w-full text-left px-4 py-3 md:py-2 text-sm hover:bg-gray-50 text-gray-700 border-b border-gray-50 md:border-none">
                          Delete for me
                        </button>
                        
                        {isMyMessage && !message.is_deleted_everyone && (
                          <button onClick={() => handleDelete(message._id, 'everyone')} className="w-full text-left px-4 py-3 md:py-2 text-sm hover:bg-gray-50 text-red-600">
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    {message.message_type === 'image' && !message.is_deleted_everyone && (
                        <Link to={message.media_url} target='_blank'>
                          <img src={message.media_url} className='w-full max-w-sm rounded-lg mb-1 bg-white cursor-pointer' alt="" />
                        </Link>
                    )}
                    <p>{message.text}</p>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Input Area */}
      <div className='px-4'>
        <div className="flex items-center gap-3 pl-5 p-1.5 bg-white w-full max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5">
          <input type="text" className=" flex-1 outline-none text-slate-700" placeholder='Type a message...' onKeyDown={e => e.key === 'Enter' && sendMessage()} onChange={(e) => setText(e.target.value)} value={text} />
          <label htmlFor="image">
            {image ? <img src={URL.createObjectURL(image)} alt="" /> : <ImageIcon className='size-7 text-gray-400 cursor-pointer' />}
            <input type="file" id='image' accept='image/*' hidden onChange={(e) => setImage(e.target.files[0])} />
          </label>
          <button onClick={sendMessage} className='bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-800 active:scale-95 cursor-pointer text-white p-2 rounded-full'>
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatBox
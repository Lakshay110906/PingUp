import React, { useEffect, useRef, useState } from 'react'
import { ImageIcon, SendHorizonal, MoreVertical } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link } from 'react-router'
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
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [user, setUser] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
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
        toast.error(data.message);
        fetchUserMessages();
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  }

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
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

  const sortedMessages = messages.toSorted((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return user && (
    <div className='flex flex-col h-screen'>
      {/* Header */}
      <div className='flex items-center gap-2 p-2 md:px-10 xl:pl-42 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-300'>
        <img src={user.profile_picture} className='size-8 rounded-full' alt="" />
        <div>
          <p className='font-medium'>{user.full_name}</p>
          <p className='text-sm text-gray-500 -mt-1.5'>@{user.username}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className='p-5 md:px-10 flex-1 overflow-y-scroll custom-scroll'>
        <div className='space-y-4 max-w-4xl mx-auto'>
          {
            sortedMessages.map((message, index) => {
              
              const isMyMessage = message.from_user_id === userState?._id || message.from_user_id?._id === userState?._id;
              
              // LOGIC: Check if this is one of the last 2 messages to determine menu direction
              const isNearBottom = index >= sortedMessages.length - 2;

              return (
                <div key={index} className={`flex flex-col group relative ${message.to_user_id !== user._id ? 'items-start' : 'items-end'}`}>

                  {/* Message Bubble */}
                  <div className={`relative p-2 text-sm max-w-[80%] md:max-w-sm text-slate-700 rounded-lg shadow 
                      ${message.to_user_id !== user._id ? 'rounded-bl-none bg-purple-100' : 'rounded-br-none bg-white'}
                      ${message.is_deleted_everyone ? 'italic text-gray-500 bg-gray-100' : ''}
                  `}>

                    {/* 3-Dot Menu Button */}
                    {/* CHANGES: 
                        1. opacity-100 (Always visible on mobile) 
                        2. md:opacity-0 md:group-hover:opacity-100 (Hover effect only on desktop)
                        3. Adjusted right/left positioning to -5 on mobile to prevent cut-off
                    */}
                    {!message.is_deleted_everyone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === message._id ? null : message._id);
                        }}
                        className={`absolute top-1 
                          ${message.to_user_id !== user._id ? '-right-8 p-2 bottom-1 md:-right-8' : '-left-6 md:-left-8'} 
                           rounded-full hover:bg-gray-100 text-gray-500 
                          opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`} 
                        title="Message options"
                      >
                        <MoreVertical size={20} />
                      </button>
                    )}

                    {/* Dropdown Menu */}
                    {activeMenuId === message._id && (
                      <div className={`absolute z-20 ${isNearBottom ? 'bottom-8' : 'top-8'} 
                        ${message.to_user_id !== user._id ? 'left-0' : 'right-0'} 
                        bg-white shadow-xl rounded-lg border border-gray-100 py-1 w-44 overflow-hidden ring-1 ring-black ring-opacity-5`}
                      >
                        <button onClick={() => handleDelete(message._id, 'me')} className="w-full text-left px-4 py-3 md:py-2 text-sm hover:bg-gray-50 text-gray-700 cursor-pointer border-b border-gray-50 md:border-none">
                          Delete for me
                        </button>
                        
                        {isMyMessage && (
                          <button onClick={() => handleDelete(message._id, 'everyone')} className="w-full text-left px-4 py-3 md:py-2 text-sm hover:bg-gray-50 text-red-600 cursor-pointer">
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    )}

                    {/* Message Content */}
                    {
                      message.message_type === 'image' && !message.is_deleted_everyone && (
                        <Link to={message.media_url} target='_blank'>
                          <img src={message.media_url} className='w-full max-w-sm rounded-lg mb-1 bg-white cursor-pointer' alt="" />
                        </Link>
                      )
                    }
                    <p>{message.text}</p>
                  </div>
                </div>
              )
            })
          }
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className='px-4'>
        <div className="flex items-center gap-3 pl-5 p-1.5 bg-white w-full max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5">
          <input type="text" className=" flex-1 outline-none text-slate-700" placeholder='Type a message...' onKeyDown={e => e.key === 'Enter' && sendMessage()} onChange={(e) => setText(e.target.value)} value={text} />
          <label htmlFor="image">
            {
              image ? <img src={URL.createObjectURL(image)} alt="" /> : <ImageIcon className='size-7 text-gray-400 cursor-pointer' />
            }
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
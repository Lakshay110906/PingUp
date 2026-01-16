import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import moment from 'moment'
import { useAuth, useUser } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const RecentMessages = () => {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const { user } = useUser()
    const { getToken } = useAuth()
    const navigate = useNavigate()

    const fetchRecentMessages = async () => {
        try {
            const token = await getToken()
            const { data } = await api.get('/api/user/recent-messages', {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (data.success) {
                // Backend already returns unique grouped conversations with unreadCount
                setMessages(data.messages)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchRecentMessages()
            const intervalId = setInterval(fetchRecentMessages, 2000) // Poll every 2 seconds
            return () => {
                clearInterval(intervalId) 
            }
        }
    }, [user])

    return (
        <div className='bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow text-xs text-slate-800'>
            <h3 className='font-semibold text-slate-800 mb-4 '>Recent Messages</h3>
            
            <div className='flex flex-col max-h-56 overflow-y-scroll no-scrollbar'>
                {loading && messages.length === 0 ? (
                    <p className="text-gray-400 text-center py-2">Loading...</p>
                ) : messages.length === 0 ? (
                    <p className="text-gray-400 text-center py-2">No recent messages</p>
                ) : (
                    messages.map((message, index) => {
                        // Backend provides 'displayUser' which is the OTHER person in the chat
                        const displayUser = message.displayUser || message.from_user_id;
                        
                        return (
                            <div 
                                onClick={() => navigate(`/messages/${displayUser._id}`)} 
                                key={index} 
                                className='flex items-start gap-2 py-2 hover:bg-slate-100 cursor-pointer transition-colors'
                            >
                                <img className='w-8 h-8 rounded-full object-cover' src={displayUser.profile_picture} alt='' />
                                <div className='w-full overflow-hidden'>
                                    <div className='flex justify-between items-center'>
                                        <p className='font-medium truncate'>{displayUser.full_name}</p>
                                        <p className='text-[10px] text-slate-400 whitespace-nowrap ml-2'>{moment(message.createdAt).fromNow(true)}</p>
                                    </div>
                                    <div className='flex justify-between items-center mt-1'>
                                        <p className='text-gray-500 truncate max-w-[150px]'>
                                            {/* Show "You:" if current user sent the last message */}
                                            {message.from_user_id._id === user.id && 'You: '}
                                            {message.message_type === 'image' ? 'Sent an image' : message.text}
                                            {message.message_type === 'video' ? 'Sent an video' : message.text}
                                        </p>
                                        
                                        {/* Unread Badge - Uses unreadCount from Backend */}
                                        {message.unreadCount > 0 && (
                                            <p className='bg-indigo-500 text-white min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] px-1 font-bold'>
                                                {message.unreadCount}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default RecentMessages
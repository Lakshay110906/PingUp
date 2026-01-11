import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import moment from 'moment'
import { useAuth, useUser } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const RecentMessages = () => {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true) // Added loading state
    const { user } = useUser()
    const { getToken } = useAuth()
    const navigate = useNavigate()

    const fetchRecentMessages = async () => {
        try {
            const token = await getToken()
            // Ensure this endpoint populates both 'from_user_id' and 'to_user_id'
            const { data } = await api.get('/api/user/recent-messages', {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (data.success) {
                const groupMessages = data.messages.reduce((acc, message) => {
                    // FIX: Identify the 'other' user in the conversation
                    // If I sent it, the other person is 'to_user_id'. If they sent it, it's 'from_user_id'.
                    const isMe = message.from_user_id._id === user.id
                    const otherUser = isMe ? message.to_user_id : message.from_user_id
                    
                    // Group by the OTHER user's ID so conversations stay separate
                    const conversationId = otherUser._id

                    // Keep the latest message for this conversation
                    if (!acc[conversationId] || new Date(message.createdAt) > new Date(acc[conversationId].createdAt)) {
                        acc[conversationId] = { 
                            ...message, 
                            displayUser: otherUser // Store the correct user to display
                        }
                    }
                    return acc;
                }, {})

                const sortedMessages = Object.values(groupMessages).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                setMessages(sortedMessages)
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
            // FIX: Capture the interval ID and clear it properly
            const intervalId = setInterval(fetchRecentMessages, 1000)
            return () => {
                clearInterval(intervalId) 
            }
        }
    }, [user])

    return (
        <div className='bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow text-xs text-slate-800'>
            <h3 className='font-semibold text-slate-800 mb-4 '>Recent Messages</h3>
            
            <div className='flex flex-col max-h-56 overflow-y-scroll no-scrollbar'>
                {/* Show Loading or Empty State */}
                {loading && messages.length === 0 ? (
                    <p className="text-gray-400 text-center py-2">Loading...</p>
                ) : messages.length === 0 ? (
                    <p className="text-gray-400 text-center py-2">No recent messages</p>
                ) : (
                    messages.map((message, index) => {
                        // Use the correct 'other' user we calculated earlier
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
                                            {/* Show "You:" if the current user sent the last message */}
                                            {message.from_user_id._id === user.id && 'You: '}
                                            {message.message_type === 'image' ? 'Sent an image' : message.text}
                                        </p>
                                        
                                        {/* Unread Badge Logic */}
                                        {/* Only show badge if I am the receiver AND it's not seen */}
                                        {!message.seen && message.to_user_id._id === user.id && (
                                            <p className='bg-indigo-500 text-white min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] px-1 font-bold'>
                                                1
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
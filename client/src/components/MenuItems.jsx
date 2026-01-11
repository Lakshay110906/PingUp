import React, { useEffect } from 'react'
import { menuItemsData } from '../assets/assets'
import { NavLink } from 'react-router'
import { useSelector, useDispatch } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import { fetchUnreadCount } from '../features/messages/messagesSlice'

const MenuItems = ({setSidebarOpen}) => {
  const { unreadCount } = useSelector((state) => state.messages)
  const dispatch = useDispatch()
  const { getToken } = useAuth()

  // Fetch count on mount and poll periodically
  useEffect(() => {
    const getCount = async () => {
        const token = await getToken()
        if (token) dispatch(fetchUnreadCount(token))
    }
    getCount()
    const interval = setInterval(getCount, 1000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='px-6 text-gray-600 space-y-1 font-medium'>
        {
            menuItemsData.map(({to,label,Icon})=>(
                <NavLink 
                    key={to} 
                    to={to} 
                    end={to==='/'} 
                    onClick={()=> setSidebarOpen(false)}  
                    className={({isActive})=>`relative px-3.5 py-2 flex items-center gap-3 rounded-xl ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                >
                    <Icon className="w-5 h-5"/>
                    {label}
                    
                    {/* NEW: Unread Badge for Messages */}
                    {label === 'Messages' && unreadCount > 0 && (
                        <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </NavLink>
            ))
        }
      
    </div>
  )
}

export default MenuItems
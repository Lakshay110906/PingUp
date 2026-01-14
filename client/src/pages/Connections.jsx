import React, { useEffect, useState } from 'react'
import { Users, UserPlus, UserCheck, UserRoundPen, MessageSquare, UserX } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useSelector, useDispatch } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import { fetchConnections } from '../features/connections/connectionsSlice'
import api from '../api/axios'
import toast from 'react-hot-toast'

const Connections = () => {
  const [currentTab, setCurrentTab] = useState('Followers')
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const dispatch = useDispatch()

  const { connections, pendingConnections, followers, following } = useSelector((state) => state.connections)

  const dataArray = [
    { label: 'Followers', value: followers, icon: Users },
    { label: 'Following', value: following, icon: UserCheck },
    { label: 'Pending', value: pendingConnections, icon: UserRoundPen },
    { label: 'Connections', value: connections, icon: UserPlus },
  ]

  const handleFollow = async (userId) => {
    try {
      const { data } = await api.post('/api/user/follow', { id: userId }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        toast.success(data.message)
        dispatch(fetchConnections(await getToken()))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleUnfollow = async (userId) => {
    try {
      const { data } = await api.post('/api/user/unfollow', { id: userId }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        toast.success(data.message)
        dispatch(fetchConnections(await getToken()))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const acceptConnection = async (userId) => {
    try {
      const { data } = await api.post('/api/user/accept', { id: userId }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        toast.success(data.message)
        dispatch(fetchConnections(await getToken()))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const removeConnection = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this connection?")) return;

    try {
      const { data } = await api.post('/api/user/remove-connection', { id: userId }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        toast.success(data.message)
        dispatch(fetchConnections(await getToken()))
      } else {
        toast(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleRemoveFollower = async (userId) => {
    if (!window.confirm("Remove this user from your followers?")) return;

    try {
      const { data } = await api.post('/api/user/remove-follower', { id: userId }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        toast.success(data.message)
        dispatch(fetchConnections(await getToken()))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const sendConnectionRequest = async (userId) => {
    try {
      const { data } = await api.post('/api/user/connect', { id: userId }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const isConnected = (userId) => {
    return connections.some(connection => connection._id === userId);
  }

  // Check if I am following this user (used in Followers tab)
  const amIFollowing = (userId) => {
    return following.some(u => u._id === userId);
  }

  useEffect(() => {
    getToken().then((token) => {
      dispatch(fetchConnections(token))
    })
  }, [])

  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='max-w-6xl mx-auto p-4 md:p-6'>
        {/* Title */}
        <div className='mb-6 md:mb-8'>
          <h1 className='text-2xl md:text-3xl font-bold text-slate-800 mb-2'>Connections</h1>
          <p className='text-slate-600 text-sm md:text-base'>Manage your network and discover new connection</p>
        </div>

        {/* Stats Counts */}
        <div className='mb-6 md:mb-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6'>
          {dataArray.map((item, index) => (
            <div key={index} className='flex flex-col items-center justify-center gap-1 border border-gray-200 bg-white shadow-sm rounded-lg p-4'>
              <b className='text-lg md:text-xl'>{item.value.length}</b>
              <p className='text-xs md:text-sm text-slate-600 font-medium'>{item.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className='inline-flex flex-wrap items-center border border-gray-200 rounded-lg p-1 bg-white shadow-sm w-full md:w-auto mb-6'>
          {
            dataArray.map((tab) => (
              <button
                onClick={() => setCurrentTab(tab.label)}
                key={tab.label}
                className={`flex-1 md:flex-none flex justify-center cursor-pointer items-center px-3 py-2 text-sm rounded-md transition-colors ${currentTab === tab.label ? 'bg-gray-100 font-semibold text-slate-900' : 'text-gray-500 hover:text-slate-700 hover:bg-gray-50'}`}
              >
                <tab.icon className='w-4 h-4' />
                <span className='ml-2'>{tab.label}</span>
                {tab.value.length > 0 && (
                  <span className='ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold'>{tab.value.length}</span>
                )}
              </button>
            ))
          }
        </div>

        {/* Content Grid - Responsive Layout */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
          {dataArray.find((item) => item.label === currentTab).value.map((user) => (
            <div key={user._id} className='flex flex-col p-4 bg-white shadow rounded-xl border border-gray-100 hover:shadow-md transition-shadow h-full'>
              
              {/* User Header */}
              <div className='flex items-start gap-4 mb-4'>
                <img src={user.profile_picture} alt="" className='rounded-full w-12 h-12 object-cover border border-gray-200' />
                <div className='flex-1 min-w-0'>
                  <h3 className='font-semibold text-slate-900 truncate'>{user.full_name}</h3>
                  <p className='text-sm text-slate-500 truncate'>@{user.username}</p>
                  <p className='text-xs text-slate-600 line-clamp-2 mt-1 break-words'>{user.bio || "No bio available"}</p>
                </div>
              </div>

              {/* Action Buttons - Push to bottom */}
              <div className='mt-auto flex flex-col gap-2'>
                <button
                  onClick={() => navigate(`/profile/${user._id}`)}
                  className='w-full py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors'
                >
                  View Profile
                </button>

                {/* --- FOLLOWERS TAB --- */}
                {currentTab === 'Followers' && (
                  <div className='flex gap-2 w-full'>
                    {!amIFollowing(user._id) && (
                        <button 
                            onClick={() => handleFollow(user._id)} 
                            className='flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors'
                        >
                            Follow Back
                        </button>
                    )}
                    <button
                      onClick={() => handleRemoveFollower(user._id)}
                      className='flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 rounded-lg transition-colors'
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* --- FOLLOWING TAB --- */}
                {currentTab === 'Following' && (
                  <div className='flex gap-2 w-full'>
                    <button
                      onClick={() => handleUnfollow(user._id)}
                      className='flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors'
                    >
                      Unfollow
                    </button>

                    {!isConnected(user._id) && (
                      <button
                        onClick={() => sendConnectionRequest(user._id)}
                        className='flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5'
                      >
                        <UserPlus className='w-4 h-4' /> Connect
                      </button>
                    )}
                  </div>
                )}

                {/* --- PENDING TAB --- */}
                {currentTab === 'Pending' && (
                  <button
                    onClick={() => acceptConnection(user._id)}
                    className='w-full py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors'
                  >
                    Accept Request
                  </button>
                )}

                {/* --- CONNECTIONS TAB --- */}
                {currentTab === 'Connections' && (
                  <div className='flex gap-2 w-full'>
                    <button
                      onClick={() => navigate(`/messages/${user._id}`)}
                      className='flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5'
                    >
                      <MessageSquare className='w-4 h-4' /> Message
                    </button>
                    <button
                      onClick={() => removeConnection(user._id)}
                      className='px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors'
                      title="Remove Connection"
                    >
                      <UserX className='w-5 h-5' />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {dataArray.find((item) => item.label === currentTab).value.length === 0 && (
             <div className="col-span-full py-10 text-center text-gray-500">
                 No users found in {currentTab}.
             </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Connections
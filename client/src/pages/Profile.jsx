import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { dummyPostsData, dummyUserData } from '../assets/assets'
import Loading from '../components/Loading'
import UserProfileInfo from '../components/UserProfileInfo'
import PostCard from '../components/PostCard'
import moment from 'moment'
import ProfileModal from '../components/ProfileModal'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import api from '../api/axios.js'

const Profile = () => {
   const currentUser = useSelector((state)=> state.user.value)

  const { getToken } = useAuth()
  const { profileId } = useParams()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [activeTab, setActiveTab] = useState('posts')
  const [showEdit, setShowEdit] = useState(false)

  const fetchUser = async (profileId) => {
    const token = await getToken()
    try {
      const { data } = await api.post(`/api/user/profiles`, { profileId }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        setUser(data.profile)
        setPosts(data.posts)
      }
      else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(data.message)
    }
  }

  // Remove Post from local state (No reload)
  const removePostFromState = (postId) => {
      setPosts(prev => prev.filter(post => post._id !== postId));
  }

  useEffect(() => {
    if(profileId) {
      fetchUser(profileId)
    }
    else {
      if(currentUser?._id) fetchUser(currentUser._id)
    }
  }, [profileId,currentUser])

  return user ? (
    <div className='relative h-full overflow-y-scroll bg-gray-50 p-4 md:p-6 no-scrollbar'>
      <div className='max-w-3xl mx-auto'>
        {/* Profile Card */}
        <div className='bg-white rounded-2xl shadow overflow-hidden'>
          {/* Cover Photo */}
          <div className='h-40 md:h-56 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200'>
            {user.cover_photo && <img src={user.cover_photo} alt='' className='w-full h-full object-cover' />}
          </div>
          {/* User Info */}
          <UserProfileInfo user={user} posts={posts} profileId={profileId} setShowEdit={setShowEdit} />
        </div>

        {/* Tabs */}
        <div className='mt-6'>
          <div className='bg-white rounded-xl shadow p-1 flex max-w-md mx-auto'>
            {['posts', 'media', 'likes'].map((tab) => (
              <button onClick={() => setActiveTab(tab)} key={tab} className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {/* posts */}
          {
            activeTab === 'posts' && (
              <div className='mt-6 flex flex-col items-center gap-6'>
                {posts.map((post) => (
                    <PostCard 
                        key={post._id} 
                        post={post} 
                        onDelete={removePostFromState} 
                    />
                ))}
              </div>
            )
          }

          {/* Media */}
          {
            activeTab === 'media' && (
              <div className='flex flex-wrap mt-6 max-w-6xl gap-2 justify-center sm:justify-start'>
                {
                  posts.filter((post) => post.image_urls.length > 0).map((post) => (
                    <React.Fragment key={post._id}>
                      {post.image_urls.map((image, index) => (
                        <Link target='_blank' to={image} key={index} className='relative group'>
                          <img src={image} className='w-32 h-32 sm:w-64 sm:h-36 object-cover rounded shadow-sm' alt="" />
                          <p className='absolute bottom-0 right-0 text-xs p-1 px-3 backdrop-blur-xl text-white opacity-0 group-hover:opacity-100 transition duration-300'>Posted {moment(post.createdAt).fromNow()}</p>
                        </Link>
                      ))}
                    </React.Fragment>
                  ))
                }
              </div>

            )
          }
        </div>
      </div>
      {/* Edit Profile Modal */}
      {showEdit && <ProfileModal setShowEdit={setShowEdit} />}
    </div>
  ) : (<Loading />)
}

export default Profile
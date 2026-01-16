import React, { useState } from 'react'
import { Image, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import api from '../api/axios'
import { useNavigate } from 'react-router'

const CreatePost = () => {
  const navigate = useNavigate()
  
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState([]) // Stores both images and videos
  const [loading, setLoading] = useState(false)

  const user = useSelector((state)=> state.user.value )
  const {getToken} = useAuth()

  // Handle File Selection
  const handleFileChange = (e) => {
      const files = Array.from(e.target.files);
      
      // Enforce 4 files limit
      if (mediaFiles.length + files.length > 4) {
          toast.error("You can upload a maximum of 4 media items.");
          return;
      }
      
      setMediaFiles([...mediaFiles, ...files]);
  }

  const handleSumbit = async () => {
      if(!mediaFiles.length && !content){
        return toast.error('Please add at least one media or text')
      }

      setLoading(true)

      try {
        const formData = new FormData()
        formData.append('content', content)
        
        // Append all files to 'images' key (backend handles separation)
        mediaFiles.forEach((file) => {
          formData.append('images', file)
        })

        const {data} = await api.post('/api/post/add', formData, {
          headers: {
            Authorization : `Bearer ${await getToken()}`
          }
        })

        if(data.success){
          navigate('/')
        }
        else{
          console.log(data.message)
          throw new Error(data.message)
        }
      } catch (error) {
        console.log(error)
        toast.error(error.message)
      }
      setLoading(false)
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>
      <div className='max-w-6xl mx-auto p-6'>
        {/* Title */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-slate-800 mb-2'>Create Post</h1>
          <p className='text-slate-600'>Share your thoughts with the world </p>
        </div>

        {/* Form */}
        <div className='max-w-xl bg-white p-4 sm:p-8 sm:pb-3 rounded-xl shadow-md space-y-4'>
          {/* Header  */}
          <div className='flex items-center gap-3'>
            <img src={user.profile_picture} className='w-12 h-12 rounded-full shadow' alt="" />
            <div>
              <h2 className='font-semibold'>{user.full_name}</h2>
              <p className='text-sm text-gray-500'>@{user.username}</p>
            </div>
          </div>

          {/* Text Area  */}
          <textarea 
            className='w-full resize-none max-h-20 mt-4 text-sm outline-none placeholder-gray-400' 
            placeholder="What's happening?" 
            onChange={(e)=>setContent(e.target.value)} 
            value={content} 
          />

          {/* Media Previews */}
          {mediaFiles.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-4'>
              {mediaFiles.map((file, i) => (
                <div key={i} className='relative group'>
                  {file.type.startsWith('video/') ? (
                      <video src={URL.createObjectURL(file)} className='h-20 rounded-md bg-black object-cover' muted />
                  ) : (
                      <img src={URL.createObjectURL(file)} className='h-20 rounded-md object-cover' alt="" />
                  )}
                  
                  <div 
                    onClick={() => setMediaFiles(mediaFiles.filter((_, index) => index !== i))} 
                    className='absolute hidden group-hover:flex justify-center items-center top-0 right-0 bottom-0 left-0 bg-black/40 rounded-md cursor-pointer'
                  >
                    <X className='w-6 h-6 text-white'/>
                  </div>
                </div>
              ))}
            </div>
          )}

           {/* Bottom Bar */}
           <div className='flex items-center justify-between pt-3 border-t border-gray-300'>
            <label htmlFor="media" className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer'>
              <Image className='size-6'/>
              <span className='text-xs'>Photo/Video</span>
            </label> 

            {/* Accept both images and videos */}
            <input 
                type="file" 
                id='media' 
                accept='image/*, video/*' 
                hidden 
                multiple 
                onChange={handleFileChange}
            />

            <button 
                disabled={loading} 
                onClick={() => toast.promise(
                    handleSumbit(), {
                        loading : 'uploading...',
                        success : <p>Post Added</p>,
                        error: <p>Post Not Added</p>,
                    }
                )} 
                className='text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition text-white font-medium px-8 py-2 rounded-md cursor-pointer disabled:opacity-70'
            >
              Publish Post
            </button>

           </div>

        </div>
      </div>

    </div>
  )
}

export default CreatePost
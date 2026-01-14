import { BadgeCheck, Heart, MessageCircle, Share2, Trash2 } from 'lucide-react'
import moment from 'moment'
import React, { useState } from 'react'
import { dummyUserData } from '../assets/assets'
import { useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const PostCard = ({ post, onDelete }) => {
    const postWithHashtags = post.content.replace(/(#\w+)/g, '<span class ="text-indigo-600">$1 </span>' )

    const [likes,setLikes] = useState(post.likes_count);
    const currentUser = useSelector((state) => state.user.value)
    const {getToken} = useAuth()
    
    const handleLike = async ()=>{
        try {
            const {data} = await api.post('/api/post/like' , {postId: post._id}, {headers : {Authorization : `Bearer ${await getToken()}`}})

            if(data.success) {
                toast.success(data.message)
                setLikes(prev=> {
                    if(prev.includes(currentUser._id)){
                        return prev.filter(id=> id != currentUser._id)
                    }
                    else{
                        return [...prev , currentUser._id]
                    }
                })
            }
            else{
                toast(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Delete this post?")) return;

        try {
            const token = await getToken();
            const { data } = await api.delete(`/api/post/delete/${post._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                toast.success("Post deleted");
                // Update Parent State (No Reload)
                if (onDelete) onDelete(post._id);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete post");
        }
    }
   
    const navigate = useNavigate()
    const isOwner = currentUser?._id === post.user?._id;

    return (
        <div className='bg-white rounded-xl shadow p-3 space-y-3 w-full max-w-2xl relative'>
            {/* Header: User Info & Delete Option */}
            <div className="flex justify-between items-start">
                <div onClick={()=> navigate('/profile/' + post.user._id)} className='inline-flex items-center gap-3 cursor-pointer'>
                    <img src={post.user.profile_picture} alt="" className='w-10 h-10 rounded-full shadow object-cover' />
                    <div>
                        <div className='flex items-center space-x-1'>
                            <span className='font-medium text-gray-900'>{post.user.full_name}</span>
                            <BadgeCheck className='w-4 h-4 text-blue-500' />
                        </div>
                        <div className='text-gray-500 text-sm'>
                            @{post.user.username} • {moment(post.createdAt).fromNow()}
                        </div>
                    </div>
                </div>

                {/* Delete Button (Only for Owner) */}
                {isOwner && (
                    <button 
                        onClick={handleDelete}
                        className='p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer'
                        title="Delete Post"
                    >
                        <Trash2 className='w-4 h-4' />
                    </button>
                )}
            </div>

            {/* content */}
            {post.content && <div className='text-gray-800 text-sm whitespace-pre-line pl-1' dangerouslySetInnerHTML={{__html : postWithHashtags}}/>}

            {/* images */}
            <div className='grid grid-cols-2 gap-2'>
                {post.image_urls.map((img,index)=>(
                    <img src={img} key={index} className={`w-full aspect-4/3 object-contain rounded-lg bg-gray-50 ${post.image_urls.length===1 && 'col-span-2 '}`}/>
                ))}

            </div>


            {/* actions */}
            <div className='flex items-center gap-6 text-gray-600 text-sm pt-2 border-t border-gray-100 mt-2'>
                <div className='flex items-center gap-2 hover:text-red-500 transition-colors'>
                    <Heart className={`w-5 h-5 cursor-pointer ${likes.includes(currentUser._id) && 'text-red-500 fill-red-500'}`} onClick={handleLike}/>
                    <span>{likes.length}</span>
                </div>
                <div className='flex items-center gap-2 hover:text-indigo-600 transition-colors'>
                    <MessageCircle className='w-5 h-5 cursor-pointer'/>
                    <span>{12}</span>
                </div>
                <div className='flex items-center gap-2 hover:text-green-600 transition-colors'>
                    <Share2 className='w-5 h-5 cursor-pointer'/>
                    <span>{7}</span>
                </div>
            </div>
        </div>
    )
}

export default PostCard
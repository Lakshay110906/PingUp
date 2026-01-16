import { BadgeCheck, Heart, MessageCircle, Share2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import moment from 'moment'
import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const PostCard = ({ post, onDelete }) => {
    const navigate = useNavigate()
    const { getToken } = useAuth()
    const currentUser = useSelector((state) => state.user.value)

    // State for Carousel
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [likes, setLikes] = useState(post.likes_count);

    // --- MEDIA EXTRACTION LOGIC ---
    // Combine images and videos into a single list for the carousel
    const mediaItems = [];

    // 1. Add Images
    if (post.image_urls && post.image_urls.length > 0) {
        post.image_urls.forEach(url => {
            mediaItems.push({ type: 'image', url: url });
        });
    }

    // 2. Add Videos (Support both new Array format and old String format)
    if (post.video_urls && post.video_urls.length > 0) {
        post.video_urls.forEach(video => {
            // Check if it's an object with 'url' or just a string (safety)
            const url = typeof video === 'object' ? video.url : video;
            if (url) mediaItems.push({ type: 'video', url: url });
        });
    } else if (post.video_url) {
        // Fallback for old posts
        mediaItems.push({ type: 'video', url: post.video_url });
    }
    // -----------------------------

    const hasMultipleMedia = mediaItems.length > 1;

    const nextSlide = (e) => {
        e.stopPropagation();
        setCurrentMediaIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        setCurrentMediaIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
    };

    const postWithHashtags = post.content 
        ? post.content.replace(/(#\w+)/g, '<span class ="text-indigo-600 font-medium">$1 </span>') 
        : '';

    const handleLike = async () => {
        try {
            // Optimistic Update
            const isLiked = likes.includes(currentUser._id);
            setLikes(prev => isLiked ? prev.filter(id => id !== currentUser._id) : [...prev, currentUser._id]);

            const { data } = await api.post('/api/post/like', { postId: post._id }, { headers: { Authorization: `Bearer ${await getToken()}` } })

            if (!data.success) {
                toast.error(data.message)
                // Revert
                setLikes(prev => isLiked ? [...prev, currentUser._id] : prev.filter(id => id !== currentUser._id));
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
                if (onDelete) onDelete(post._id);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete post");
        }
    }

    const isOwner = currentUser?._id === post.user?._id;

    return (
        <div className='bg-white rounded-xl shadow p-3 space-y-3 w-full max-w-2xl relative mb-4'>
            {/* Header */}
            <div className="flex justify-between items-start">
                <div onClick={() => navigate('/profile/' + post.user._id)} className='inline-flex items-center gap-3 cursor-pointer'>
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

            {/* Post Content (Text) */}
            {post.content && <div className='text-gray-800 text-sm whitespace-pre-line pl-1' dangerouslySetInnerHTML={{ __html: postWithHashtags }} />}

            {/* Media Carousel (Handles Images, Videos, and Mixed) */}
            {mediaItems.length > 0 && (
                <div className='relative w-full aspect-4/3 bg-black rounded-lg overflow-hidden group'>
                    
                    {/* Media Display */}
                    <div className='w-full h-full flex items-center justify-center'>
                        {mediaItems[currentMediaIndex].type === 'image' ? (
                            <img 
                                src={mediaItems[currentMediaIndex].url} 
                                className='w-full h-full object-contain' 
                                alt="Post media" 
                            />
                        ) : (
                            <video
                                src={mediaItems[currentMediaIndex].url}
                                controls
                                className='w-full h-full object-contain'
                            />
                        )}
                    </div>

                    {/* Controls (Only if > 1 item) */}
                    {hasMultipleMedia && (
                        <>
                            <button 
                                onClick={prevSlide}
                                className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10'
                            >
                                <ChevronLeft size={20} />
                            </button>
                            
                            <button 
                                onClick={nextSlide}
                                className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10'
                            >
                                <ChevronRight size={20} />
                            </button>

                            {/* Dots */}
                            <div className='absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10'>
                                {mediaItems.map((_, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${
                                            idx === currentMediaIndex ? 'bg-white scale-125' : 'bg-white/50'
                                        }`} 
                                    />
                                ))}
                            </div>
                            
                            {/* Counter Badge */}
                            <div className='absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm'>
                                {currentMediaIndex + 1}/{mediaItems.length}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className='flex items-center gap-6 text-gray-600 text-sm pt-2 border-t border-gray-100 mt-2'>
                <div className='flex items-center gap-2 hover:text-red-500 transition-colors'>
                    <Heart className={`w-5 h-5 cursor-pointer ${likes.includes(currentUser._id) && 'text-red-500 fill-red-500'}`} onClick={handleLike} />
                    <span>{likes.length}</span>
                </div>
                <div className='flex items-center gap-2 hover:text-indigo-600 transition-colors'>
                    <MessageCircle className='w-5 h-5 cursor-pointer' />
                    <span>{12}</span>
                </div>
                <div className='flex items-center gap-2 hover:text-green-600 transition-colors'>
                    <Share2 className='w-5 h-5 cursor-pointer' />
                    <span>{7}</span>
                </div>
            </div>
        </div>
    )
}

export default PostCard
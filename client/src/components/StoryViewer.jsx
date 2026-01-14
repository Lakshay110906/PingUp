import { BadgeCheck, X, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const StoryViewer = ({ viewStory, setViewStory, removeStoryFromState }) => {
    const [progress,setProgress] = useState(0);
    const currentUser = useSelector((state) => state.user.value);
    const { getToken } = useAuth();

    useEffect(()=>{
        let timer,progressInterval;

        if(viewStory && viewStory.media_type!=='video'){
            setProgress(0)

            const duration=10000;
            const setTime=100;
            let elapsed=0;

            progressInterval= setInterval(()=>{
                elapsed += setTime;
                setProgress ((elapsed / duration)*100);
            },setTime);

            timer=setTimeout(()=>{
                setViewStory(null)
            },duration)

            return ()=>{
                clearTimeout(timer);
                clearInterval(progressInterval);
            }
        }
    },[viewStory,setViewStory])

    const handleClose = ()=>{
        setViewStory(null)
    }

    const handleDelete = async () => {
        if(!window.confirm("Delete this story?")) return;

        try {
            const token = await getToken();
            const { data } = await api.delete(`/api/story/delete/${viewStory._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                toast.success("Story deleted");
                if (removeStoryFromState) removeStoryFromState(viewStory._id);
                setViewStory(null);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete story");
        }
    }
    
    if(!viewStory) return null;
    
    const renderContent = ()=>{
        switch (viewStory.media_type) {
            case 'image':
                return(
                    <img src={viewStory.media_url} alt="" className='max-w-full max-h-[85vh] object-contain' />
                );
                
            case 'video':
                return(
                    <video onEnded={()=>setViewStory(null)} src={viewStory.media_url}  className='max-h-[85vh] max-w-full' controls autoPlay />
                );
            case 'text':
                return(
                    <div className='w-full h-full flex items-center justify-center p-8 text-white text-2xl text-center break-words'>
                        {viewStory.content}
                    </div>
                );
        
            default:
                return null;
        }
    }

    const isOwner = currentUser?._id === viewStory.user?._id || currentUser?._id === viewStory.user;

    return (
        // Updated z-index to z-[9999] to cover sidebar buttons
        <div className='fixed inset-0 h-[100dvh] w-screen bg-black bg-opacity-90 z-[9999] flex items-center justify-center' style={{ backgroundColor: viewStory.media_type === 'text' ? viewStory.background_color : "#000000" }} >
            {/* Progress Bar */}
            <div className='absolute top-0 left-0 w-full h-1 bg-gray-700 z-50'>
                <div className='h-full bg-white transition-all duration-100 linear' style={{ width: `${progress}%` }}>
                </div>
            </div>

            {/* User Info - Top Left */}
            <div className='absolute top-5 left-4 z-50 flex items-center space-x-3 p-2 px-4 backdrop-blur-md rounded-full bg-black/40'>
                <img src={viewStory.user?.profile_picture} alt=""  className='size-8 sm:size-9 rounded-full object-cover border border-white' />
                <div className='text-white font-medium flex items-center gap-1.5 text-sm sm:text-base'>
                    <span>{viewStory.user?.full_name}</span>
                    <BadgeCheck size={18}/>
                </div>
            </div>

            {/* Controls - Top Right */}
            {/* Adjusted top position to top-5 to avoid crowding */}
            <div className='absolute top-5 right-4 z-50 flex items-center gap-4'>
                {isOwner && (
                    <button onClick={handleDelete} className='text-white/80 hover:text-red-500 transition cursor-pointer p-1'>
                        <Trash2 className='w-6 h-6 sm:w-7 sm:h-7' />
                    </button>
                )}
                
                <button onClick={handleClose} className='text-white font-bold focus:outline-none p-1'>
                    <X className='w-8 h-8 sm:w-9 sm:h-9 hover:scale-110 transition cursor-pointer'/>
                </button>
            </div>

            {/* Content Wrapper */}
            <div className='max-w-[100vw] max-h-[100vh] flex items-center justify-center p-2'>
                {renderContent()}
            </div>
        </div>
    )
}

export default StoryViewer
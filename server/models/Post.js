import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    user: {type: String, ref: 'User', required : true},
    content: {type: String},
    image_urls: [{type: String}],
    
    // Video URLs as array of objects
    video_urls: [
        {
            url: { type: String, required: true }
        }
    ],

    // Updated Enums to support mixed media
    post_type: {
        type: String, 
        enum: ['text', 'image', 'text_with_image', 'video', 'text_with_video', 'mixed', 'text_with_mixed'], 
        required: true
    },
    
    likes_count: [{type: String, ref: 'User'}],
}, {timestamps: true, minimize: false})

const Post = mongoose.model('Post', postSchema)

export default Post
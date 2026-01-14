import fs from 'fs'
import imagekit from '../config/imageKit.js'
import { profile } from 'console'
import Post from '../models/Post.js'
import User from '../models/User.js'


//Add Post
export const addPost = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { content, post_type } = req.body
        const images = req.files || []

        let image_urls = []

        if (images.length > 0) {
            image_urls = await Promise.all(
                images.map(async (image) => {
                    const fileBuffer = fs.readFileSync(image.path)

                    const response = await imagekit.upload({
                        file: fileBuffer,
                        fileName: image.originalname,
                        folder: 'posts',
                    })

                    return imagekit.url({
                        path: response.filePath,
                        transformation: [
                            { quality: 'auto' },
                            { format: 'webp' },
                            { width: '1280' }
                        ]
                    })
                })
            )
        }

        await Post.create({
            user: userId,
            content,
            image_urls,
            post_type
        })

        res.json({ success: true, message: 'Post created successfully' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

//get posts
export const getFeedPosts = async (req,res) =>{
    try {
        const {userId} = req.auth()
        const user = await User.findById(userId)

        //User connections and followings
        const userIds = [userId, ...user.connections, ...user.following]
        const posts = await Post.find({user: {$in: userIds}}).populate('user').sort({createdAt: -1})

        res.json({success: true, posts})
        
    } catch (error) {
        console.log(error)
        res.json({success: false , message: error.message})
    }
}

//like post
export const likePost = async (req,res) =>{
    try {
        const {userId} = req.auth()
        const {postId} = req.body

        const post = await Post.findById(postId)

        if(post.likes_count.includes(userId)){
            post.likes_count = post.likes_count.filter(user=> user != userId)
            await post.save()
            res.json({success: true, message: 'Post unliked'})
        }
        else{
            post.likes_count.push(userId)
            await post.save()
            res.json({success: true, message: 'Post liked'})
        }
        
    } catch (error) {
        console.log(error)
        res.json({success: false , message: error.message})
    }
}

// Delete Post
export const deletePost = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { id } = req.params;

        const post = await Post.findById(id);
        if (!post) {
            return res.json({ success: false, message: "Post not found" });
        }

        // Check if the requesting user is the owner of the post
        if (post.user.toString() !== userId) {
            return res.json({ success: false, message: "Unauthorized action" });
        }

        await Post.findByIdAndDelete(id);

        res.json({ success: true, message: "Post deleted successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}
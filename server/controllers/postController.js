import fs from 'fs'
import imagekit from '../config/imageKit.js'
import Post from '../models/Post.js'
import User from '../models/User.js'

// Add Post
export const addPost = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { content } = req.body
        const files = req.files || []

        let image_urls = []
        let video_urls = []

        // Process all files
        if (files.length > 0) {
            await Promise.all(
                files.map(async (file) => {
                    const fileBuffer = fs.readFileSync(file.path)
                    const isVideo = file.mimetype.startsWith('video/')
                    
                    const response = await imagekit.upload({
                        file: fileBuffer,
                        fileName: file.originalname,
                        folder: isVideo ? 'posts_videos' : 'posts',
                    })

                    if (isVideo) {
                        video_urls.push({ url: response.url })
                    } else {
                        const optimizedUrl = imagekit.url({
                            path: response.filePath,
                            transformation: [
                                { quality: 'auto' },
                                { format: 'webp' },
                                { width: '1280' }
                            ]
                        })
                        image_urls.push(optimizedUrl)
                    }
                })
            )
        }

        // Determine Post Type
        let post_type = 'text';
        if (image_urls.length > 0 && video_urls.length > 0) {
            post_type = content ? 'text_with_mixed' : 'mixed';
        } else if (image_urls.length > 0) {
            post_type = content ? 'text_with_image' : 'image';
        } else if (video_urls.length > 0) {
            post_type = content ? 'text_with_video' : 'video';
        }

        await Post.create({
            user: userId,
            content: content || '',
            image_urls,
            video_urls,
            post_type
        })

        res.json({ success: true, message: 'Post created successfully' })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// Get Feed Posts
export const getFeedPosts = async (req,res) =>{
    try {
        const {userId} = req.auth()
        const user = await User.findById(userId)

        const userIds = [userId, ...user.connections, ...user.following]
        const posts = await Post.find({user: {$in: userIds}}).populate('user').sort({createdAt: -1})

        res.json({success: true, posts})
        
    } catch (error) {
        console.log(error)
        res.json({success: false , message: error.message})
    }
}

// Like Post (UPDATED: FIXED VersionError)
export const likePost = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { postId } = req.body

        const post = await Post.findById(postId)
        if (!post) {
            return res.json({ success: false, message: 'Post not found' })
        }

        // Check if user already liked the post
        if (post.likes_count.includes(userId)) {
            // Atomic Pull (Unlike)
            await Post.findByIdAndUpdate(postId, { $pull: { likes_count: userId } })
            res.json({ success: true, message: 'Post unliked' })
        } else {
            // Atomic AddToSet (Like) - prevents duplicates automatically
            await Post.findByIdAndUpdate(postId, { $addToSet: { likes_count: userId } })
            res.json({ success: true, message: 'Post liked' })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
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
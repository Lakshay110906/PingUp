import express from 'express'
import { upload } from '../config/multer.js'
import { addPost, getFeedPosts, likePost, deletePost } from '../controllers/postController.js'
import { protect } from '../middlewares/auth.js'

const postRouter = express.Router()

postRouter.post('/add', upload.array('images', 4), protect, addPost)
postRouter.get('/feed', protect, getFeedPosts)
postRouter.post('/like', protect, likePost)
postRouter.delete('/delete/:id', protect, deletePost) // Added delete route


export default postRouter
import express from 'express'
import { clearChat, deleteMessage, getChatMessages, getGlobalUnreadCount, getUserRecentMessges, sendMessage, sseController } from '../controllers/messageController.js'
import { protect } from '../middlewares/auth.js'
import { upload } from '../config/multer.js'

const messageRouter = express.Router()

messageRouter.get('/:userId', sseController)
messageRouter.post('/send', upload.single('image'), protect, sendMessage)
messageRouter.post('/history', protect, getChatMessages)
messageRouter.post('/delete', protect, deleteMessage)
messageRouter.get('/unread/count', protect, getGlobalUnreadCount)
messageRouter.get('/recent', protect, getUserRecentMessges)
messageRouter.post('/clear', protect, clearChat)
export default messageRouter

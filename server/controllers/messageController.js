import fs from 'fs'
import imagekit from '../config/imageKit.js'
import Message from '../models/Message.js'

// ... (Keep existing imports and connections object)
const connections = {}

export const sseController = (req, res) => {
    // ... (Keep existing sseController code)
    const { userId } = req.params
    console.log('New client coonected : ', userId)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    connections[userId] = res
    res.write('log: Connected to SSE stream\n\n')
    req.on('close', () => {
        delete connections[userId]
        console.log('Client disconnected')
    })
}

export const sendMessage = async (req, res) => {
    // ... (Keep existing sendMessage code)
    try {
        const { userId } = req.auth();
        const { to_user_id, text } = req.body
        const image = req.file

        let media_url = ''
        let message_type = image ? 'image' : 'text'

        if (message_type === 'image') {
            const fileBuffer = fs.readFileSync(image.path)
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: image.originalname,
            })
            media_url = imagekit.url({
                path: response.filePath,
                transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '1280' }]
            })
        }

        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url
        })

        res.json({ success: true, message })

        const messageWithUserdata = await Message.findById(message._id).populate('from_user_id')

        if (connections[to_user_id]) {
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserdata)}\n\n`)
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export const getChatMessages = async (req, res) => {
    // ... (Keep existing getChatMessages code)
    try {
        const { userId } = req.auth();
        const { to_user_id } = req.body

        const messages = await Message.find({
            $or: [
                { from_user_id: userId, to_user_id },
                { from_user_id: to_user_id, to_user_id: userId },
            ],
            deleted_for: { $ne: userId }
        }).sort({ createdAt: 1 })

        await Message.updateMany({ from_user_id: to_user_id, to_user_id: userId }, { seen: true })

        res.json({ success: true, messages })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export const deleteMessage = async (req, res) => {
    // ... (Keep existing deleteMessage code)
    try {
        const { userId } = req.auth();
        const { messageId, type } = req.body;

        const message = await Message.findById(messageId);
        if (!message) return res.json({ success: false, message: "Message not found" });

        if (type === 'me') {
            if (!message.deleted_for.includes(userId)) {
                message.deleted_for.push(userId);
                await message.save();
            }
        } else if (type === 'everyone') {
            if (message.from_user_id.toString() !== userId) {
                return res.json({ success: false, message: "Unauthorized" });
            }
            message.is_deleted_everyone = true;
            message.text = "This message was deleted";
            message.media_url = "";
            message.message_type = "text";
            await message.save();

            const receiverId = message.to_user_id.toString();
            if (connections[receiverId]) {
                const updatedMsg = await Message.findById(messageId).populate('from_user_id');
                connections[receiverId].write(`data: ${JSON.stringify(updatedMsg)}\n\n`);
            }
        }
        res.json({ success: true, message });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// UPDATED: Get recent messages with UNREAD COUNTS
export const getUserRecentMessges = async (req, res) => {
    try {
        const { userId } = req.auth();

        // 1. Get all messages involving the user (sent or received)
        const messages = await Message.find({
            $or: [{ from_user_id: userId }, { to_user_id: userId }],
            deleted_for: { $ne: userId } // Exclude messages deleted by the user
        })
        .sort({ createdAt: -1 })
        .populate('from_user_id', 'full_name profile_picture username')
        .populate('to_user_id', 'full_name profile_picture username');

        const uniqueConversations = {};

        messages.forEach(msg => {
            // Safety Check: If a user was deleted, from/to might be null. Skip these.
            if (!msg.from_user_id || !msg.to_user_id) return;

            // 2. Identify the "Other" person in the conversation
            // We use .toString() to ensure we are comparing Strings, not Objects
            const otherUser = msg.from_user_id._id.toString() === userId 
                ? msg.to_user_id 
                : msg.from_user_id;

            const otherId = otherUser._id.toString();

            // 3. Initialize the conversation entry if it doesn't exist
            if (!uniqueConversations[otherId]) {
                uniqueConversations[otherId] = {
                    _id: msg._id,
                    text: msg.text,
                    message_type: msg.message_type,
                    createdAt: msg.createdAt,
                    // IMPORTANT: The frontend expects 'displayUser' or 'from_user_id'
                    // We attach 'displayUser' to make it easy for the frontend
                    displayUser: otherUser, 
                    unreadCount: 0,
                    // Keep original fields just in case
                    from_user_id: msg.from_user_id,
                    to_user_id: msg.to_user_id
                };
            }

            // 4. Count Unread Messages
            // Logic: If I am the receiver (to_user_id === me) AND it's not seen
            if (msg.to_user_id._id.toString() === userId && !msg.seen) {
                uniqueConversations[otherId].unreadCount += 1;
            }
        });

        // 5. Convert object back to array and sort by date
        const results = Object.values(uniqueConversations).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json({ success: true, messages: results });

    } catch (error) {
        console.error("Recent Messages Error:", error);
        res.json({ success: false, message: error.message });
    }
}

// NEW: Global Unread Count for Sidebar
export const getGlobalUnreadCount = async (req, res) => {
    try {
        const { userId } = req.auth();
        const count = await Message.countDocuments({
            to_user_id: userId,
            seen: false,
            deleted_for: { $ne: userId }
        });
        res.json({ success: true, count });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}
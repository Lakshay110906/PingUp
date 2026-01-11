import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios";

const initialState = {
    messages: [],
    unreadCount: 0 // Added for the badge
}

export const fetchMessages = createAsyncThunk('messages/fetchMessages', async ({ token, userId }) => {
    const { data } = await api.post('/api/message/history', { to_user_id: userId }, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return data.success ? data : null
})

// NEW: Fetch global unread count for the badge
export const fetchUnreadCount = createAsyncThunk('messages/fetchUnreadCount', async (token) => {
    const { data } = await api.get('/api/message/unread/count', {
        headers: { Authorization: `Bearer ${token}` }
    })
    return data.success ? data.count : 0
})

const messagesSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload
        },
        // UPDATED: Handles both NEW messages and UPDATES (live delete)
        addMessage: (state, action) => {
            const index = state.messages.findIndex(m => m._id === action.payload._id);
            if (index !== -1) {
                // If message exists, update it (e.g. "This message was deleted")
                state.messages[index] = action.payload;
            } else {
                // If it's new, add it
                state.messages.push(action.payload);
            }
        },
        resetMessages: (state) => {
            state.messages = []
        },
        // UPDATED: Handles local deletion immediately
        deleteMessageFromState: (state, action) => {
            const { messageId, type } = action.payload;
            if (type === 'me') {
                state.messages = state.messages.filter(m => m._id !== messageId);
            } else if (type === 'everyone') {
                const msg = state.messages.find(m => m._id === messageId);
                if (msg) {
                    msg.text = "This message was deleted";
                    msg.message_type = "text";
                    msg.media_url = "";
                    msg.is_deleted_everyone = true;
                }
            }
        }
    },

    extraReducers: (builder) => {
        builder.addCase(fetchMessages.fulfilled, (state, action) => {
            if (action.payload) {
                state.messages = action.payload.messages
            }
        })
        // Handle unread count
        builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
            state.unreadCount = action.payload
        })
    }
})
export const { setMessages, addMessage, resetMessages, deleteMessageFromState } = messagesSlice.actions
export default messagesSlice.reducer
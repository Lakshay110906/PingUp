import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    from_user_id: { type: String, ref: 'User', required: true },
    to_user_id: { type: String, ref: 'User', required: true },
    text: { type: String, trim: true },
    message_type: {type: String, enum: ['text', 'image']},
    media_url: {type: String,},
    seen: {type: Boolean, default: false},
    // ADDED: Track deletions
    deleted_for: [{ type: String }], // Array of user IDs who deleted this message for themselves
    is_deleted_everyone: { type: Boolean, default: false }

}, {timestamps: true, minimize: false})

const Message = mongoose.model('Message', messageSchema)

export default Message
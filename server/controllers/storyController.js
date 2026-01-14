import fs from 'fs'
import imagekit from '../config/imageKit.js';
import Story from '../models/Story.js';
import User from '../models/User.js';
import { inngest } from '../inngest/index.js';
//Add User Story
export const addUserStory = async (req,res) => {
    try {
        const {userId} = req.auth();
        const {content , media_type, background_color} = req.body
        const media = req.file
        let media_url = ''

        //upload media to imagekit
        if(media_type === 'image' || media_type === 'video'){
            const fileBuffer = fs.readFileSync(media.path)
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: media.originalname,
            })
            media_url = response.url
        }

        //create story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color
        })

        // schedule story deletion after 24 hours
        await inngest.send({
            name: 'app/story.delete',
            data: { storyId: story._id}
        })

        res.json({success: true})

    } catch (error) {
        console.log(error)
        res.json({success: false , message: error.message})
    }
}

export const getStories = async(req,res) => {
    try {
        const {userId} = req.auth()
        const user = await User.findById(userId)

        //User connections and followings
        const userIds = [userId, ...user.connections, ...user.following]

        const stories = await Story.find({
            user: {$in: userIds}
        }).populate('user').sort({ createdAt: -1});

        res.json({success: true , stories})

    } catch (error) {
        console.log(error)
        res.json({success: false , message: error.message})
    }
}

// Delete Story
export const deleteStory = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { id } = req.params;

        const story = await Story.findById(id);

        if (!story) {
            return res.json({ success: false, message: "Story not found" });
        }

        // Check if the current user is the owner of the story
        // Assuming userId (req.auth) matches the story.user reference (which might be an ID or populated object)
        // If story.user is populated, we check story.user._id
        const storyOwnerId = story.user._id ? story.user._id.toString() : story.user.toString();

        if (storyOwnerId !== userId) {
            return res.json({ success: false, message: "You are not authorized to delete this story" });
        }

        await Story.findByIdAndDelete(id);

        res.json({ success: true, message: "Story deleted successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}
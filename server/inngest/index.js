import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connections.js";
import sendEmail from "../config/nodeMailer.js";
import Story from "../models/Story.js";
import Message from "../models/Message.js";


// Create a client to send and receive events
export const inngest = new Inngest({ id: "pingup-app" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data
        let username = email_addresses[0].email_address.split('@')[0]

        // check availability of username
        const user = await User.findOne({ username })

        if (user) {
            username = username + Math.floor(Math.random() * 10000)
        }

        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            full_name: first_name + " " + last_name,
            profile_picture: image_url,
            username

        }

        await User.create(userData)
    }
)

// Inngest function to update user data in database

const updateUserCreation = inngest.createFunction(
    { id: 'update-user-from-clerk' },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data

        const updatedUserData = {
            email: email_addresses[0].email_address,
            full_name: first_name + " " + last_name,
            profile_picture: image_url,


        }

        await User.findByIdAndUpdate(id, updatedUserData)
    }
)

//Inngest Function to delete user from database
const deleteUserCreation = inngest.createFunction(
    { id: 'delete-user-with-clerk' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { id } = event.data

        await User.findByIdAndDelete(id)

    }
)

// Inngest Function to send Reminder when a new connection request is added
const sendNewConnectionRequestReminder = inngest.createFunction(
    { id: "send-new-connection-request-reminder" },
    { event: "app/connection-request" },
    async ({ event, step }) => {
        const { connectionId } = event.data

        // STEP 1: Send Initial Email
        await step.run('send-connection-request-mail', async () => {
            const connection = await Connection.findById(connectionId).populate('from_user_id to_user_id')

            // --- SAFETY CHECK ---
            if (!connection) {
                return { message: "Connection not found (deleted?), email skipped." };
            }
            // --------------------

            const subject = `New Connection Request`
            const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2> Hi ${connection.to_user_id.full_name}, </h2>
              <p> You have a new connection request from ${connection.from_user_id.full_name}</p>
              <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a> to accept/reject.</p>
              <br/>
              <p>Thanks,<br/>PingUp</p>
            </div>`;

            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                body
            })
            return { sent: true }
        })

        // STEP 2: Wait (Use 10 seconds for testing, 24h for production)
        const waitTime = new Date(Date.now() + 24 * 60 * 60 * 1000); 
        await step.sleepUntil('wait-for-24-hours', waitTime)

        // STEP 3: Send Reminder
        await step.run('send-connection-request-reminder', async() => {
            const connection = await Connection.findById(connectionId).populate('from_user_id to_user_id')

            // --- SAFETY CHECK (Crucial here too!) ---
            if (!connection) {
                return { message: "Connection not found (deleted?), reminder skipped." };
            }
            // ----------------------------------------

            if(connection.status === 'accepted'){
                return {message: 'Already accepted'}
            }

            const subject = `Reminder: New Connection Request`
            const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2> Hi ${connection.to_user_id.full_name}, </h2>
              <p> You still have a pending connection request from ${connection.from_user_id.full_name}.</p>
              <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a> to accept/reject.</p>
              <br/>
              <p>Thanks,<br/>PingUp</p>
            </div>`;

            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                body
            })

            return {message : "Reminder sent."}
        })
    }
)
// Inngest function to delete story after 24 hours
const deleteStory = inngest.createFunction(
    { id: 'story-delete' },
    { event: 'app/story.delete' },
    async ({ event, step }) => {
        const { storyId } = event.data
        const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await step.sleepUntil('wait-for-24-hours', in24Hours)
        await step.run('delete-story', async () => {
            await Story.findByIdAndDelete(storyId)
            return { message: "Story deleted" }
        })
    }
)

const sendNotificationOfUnseenMessages = inngest.createFunction(
    {
        id: 'send-unseen-messages-notification'
    },
    { cron: 'TZ=America/New_York 0 9 * * *' }, // Every day 9 AM
    async ({ step }) => {
        const messages = await Message.find({ seen: false }).populate('to_user_id')
        const unseenCount = {}

        messages.map(message => {
            unseenCount[message.to_user_id._id] = (unseenCount[message.to_user_id._id] || 0) + 1
        })

        for (const userId in unseenCount) {
            const user = await User.findById(userId);
            const subject = `📪 You have ${unseenCount[userId]} unseen messages`;
            const body = ` <div style = 'font-family: Arial, sans-serif; padding: 20px;'>
            <h2> Hi ${user.full_name}, </h2>
            <p> You have ${unseenCount[userId]} unseen messages </p>
            <p> Click <a href = '${process.env.FRONTEND_URL}/messages' style = 'color: #10b981;' > here </a> to view them </p>
            <br/>
            <p> Thanks, <br/>PingUp - Stay Connected</p>
            </div>
            `

            await sendEmail({
                to: user.email,
                subject,
                body
            })
        }
        return { message: "Notification sent" }
    }
)

const deleteExpiredStories = inngest.createFunction(
    { id: 'delete-expired-stories' },
    { cron: '0 * * * *' }, // Runs every hour at minute 0
    async ({ step }) => {
        await step.run('delete-old-stories-from-db', async () => {
            // Calculate the timestamp for 24 hours ago
            const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Delete all stories where 'createdAt' is older than the expiration time
            const result = await Story.deleteMany({
                createdAt: { $lt: expirationTime }
            });

            return { 
                message: `Cleanup run successful. Deleted ${result.deletedCount} expired stories.` 
            };
        })
    }
)
// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, updateUserCreation, deleteUserCreation, sendNewConnectionRequestReminder,deleteExpiredStories , sendNotificationOfUnseenMessages]; 
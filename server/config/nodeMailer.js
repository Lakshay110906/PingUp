import nodemailer from 'nodemailer';

// ADD THIS LOG to check if variables are loaded
console.log("Nodemailer Config Loading...");
console.log("User:", process.env.SMTP_USER ? "Loaded" : "MISSING");
console.log("Pass:", process.env.SMTP_PASS ? "Loaded" : "MISSING");

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth:{
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async ({to,subject,body}) => {
    try {
        console.log(`Sending email to: ${to}`);
        
        const response = await transporter.sendMail({ // Make sure this is sendMail
            from: process.env.SENDER_EMAIL, 
            to,
            subject,
            html: body,
        })
        console.log("Email sent successfully!");
        return response
    } catch (error) {
        console.error("EMAIL ERROR:", error); // Check your terminal for this!
        throw error;
    }
}

export default sendEmail
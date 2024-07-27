const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

const User = require('./models/User');

const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');


mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.once('open', () => {
    console.log('Connected to Database');
});

mongoose.connection.on('error', (err) => {
    console.error('Database connection error:', err);
});


app.get('/', (req, res) => {
    res.render('form');
});

app.post('/submit', async (req, res) => {
    const { username, email, dob } = req.body;
    const user = new User({ username, email, dob });
    await user.save();
    res.send('Data submitted successfully!');
});

cron.schedule('0 7 * * *', async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const users = await User.find({
        dob: {
            $expr: {
                $and: [
                    { $eq: [{ $month: "$dob" }, month] },
                    { $eq: [{ $dayOfMonth: "$dob" }, day] }
                ]
            }
        }
    });

    for (const user of users) {
        sendBirthdayEmail(user.email, user.username);
    }
});


async function sendBirthdayEmail(email, username) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_ACCT,
            pass: process.env.PASS_WORD
        }
    });

    let info = await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Happy Birthday!',
        text: `Dear ${username},\n\nWishing you a very happy birthday! Have a great day!\n\nBest Regards,\nYour Company`
    });

    console.log('Message sent: %s', info.messageId);
}


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

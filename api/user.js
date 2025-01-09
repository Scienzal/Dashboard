const express = require('express');
const app = express.Router();

const lib = require('../lib');
const db = require('../db');

const mail = require('../mail');

app.get('/userinfo', async (req, res) => {
    var user = await db.User.findOne({
        _id: req.session.user._id
    });
    res.json({
        email: user.email,
        isVerified: user.mailVerified,
        verifyMailSent: user.mailSent,
        credits: user.credits,

        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        phoneNumber: user.phoneNumber,
        address: user.address,

        isFree: user.isFree
    });
});

app.get('/sendverifymail', async (req, res) => {
    return res.status(404).json({ ok: false, error: 'Email verify temporary disabled!' });

    var user = await db.User.findOne({
        _id: req.session.user._id
    });
    var email = user.email;

    if (user.mailSent == true) return res.json({ ok: false, error: 'Email already sent!' });

    var mailRes = await mail.sendMail({
        to: email,
        subject: `[Meegie] Verify your email`, // Todo: env var with app name

        text: `Hello. Use the following code to verify your email at Meegie: ${user.verifyToken}\n\nIf you did not make an account at Meegie, you can ignore this email.`
    });

    console.log(mailRes);
    user.mailSent = true;
    await user.save();

    res.json({
        ok: true
    });
});

app.get('/verifyuser', async (req, res) => {
    var user = await db.User.findOne({
        _id: req.session.user._id
    });
    var token = req.query.key;

    if (!token) return res.status(404).json({ ok: false, error: 'No key!' });

    if (user.mailSent == false) return res.json({ ok: false, error: 'Email not sent!' });

    if (user.mailVerified == true ) return res.status(200).json({ ok: true, message: 'Already verified!' });

    if (token != user.verifyToken) return res.status(401).json({ ok: false, error: 'Invalid token!' });
    
    user.mailVerified = true;
    await user.save();

    res.json({
        ok: true,
        message: 'User is now verified!'
    });
});

app.post('/updatedetails', express.json(), async (req, res) => {
    const { firstName, lastName, country, address, phoneNumber } = req.body;

    if (!firstName || !lastName || !country || !address || !phoneNumber) return lib.error(res, 400, 'firstName, lastName, country, address, phoneNumber are required');

    const user = await db.User.findOne({
        _id: req.session.user._id
    });

    user.firstName = firstName;
    user.lastName = lastName;
    user.address = address;
    user.country = country;
    user.phoneNumber = phoneNumber;
    await user.save();

    res.json({
        ok: true
    });
});

app.post('/user/delete', async (req, res) => {
    const clients = await db.Client.find({
        userID: req.session.user._id
    });
    clients.forEach(async (client) => {
        await client.delete();
    });

    const jobs = await db.Job.find({
        userID: req.session.user._id
    });
    jobs.forEach(async (job) => {
        await db.Log.deleteMany({ jobID: job._id });
        await job.delete();
    });

    const tickets = await db.Ticket.find({ userID: req.session.user._id });
    tickets.forEach(async (ticket) => {
        await db.TicketMessage.deleteMany({ ticketID: ticket._id });
        await ticket.delete();
    });

    await db.Deposit.deleteMany({ userID: req.session.user._id });

    await db.User.deleteOne({ _id: req.session.user._id });

    req.session.destroy(function(err) {
        if(err) {
            console.error('Error destroying session:', err);
        }
    });

    res.json({
        ok: true,
        message: 'User (and clients, jobs, jobLogs, tickets, ticketMessages) deleted successfully!'
    });
});

app.get('/user/logout', (req, res) => {
    req.session.destroy(function(err) {
        if(err) {
            console.error('Error destroying session:', err);
        }
    });

    res.redirect('/');
});

app.get('/user/data', async (req, res) => {
    // get all account data and return it
    const user = await db.User.findOne({
        _id: req.session.user._id
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const data = {
        clients: [],
        jobs: [],
        tickets: [],
        deposits: [],
        user: {}
    };

    data.user = {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        phoneNumber: user.phoneNumber,
        address: user.address,
        credits: user.credits,
        mailVerified: user.mailVerified,
        mailSent: user.mailSent,
        verifyToken: user.verifyToken
    };

    const clients = await db.Client.find({
        userID: req.session.user._id
    });

    for(let i = 0; i < clients.length; i++) {
        data.clients.push(clients[i].toObject());
    }

    const jobs = await db.Job.find({
        userID: req.session.user._id
    });

    for(let i = 0; i < jobs.length; i++) {
        var msg = await db.Log.find({ jobID: jobs[i]._id })
        var job = jobs[i].toObject();
        job.log = msg;
        data.jobs.push(job);
    }

    const tickets = await db.Ticket.find({ userID: req.session.user._id });

    for(let i = 0; i < tickets.length; i++) {
        var msg = await db.TicketMessage.find({ ticketID: tickets[i]._id })
        var tick = tickets[i].toObject();
        tick.messages = msg;
        data.tickets.push(tick);
    }

    const deposits = await db.Deposit.find({
        userID: req.session.user._id
    });

    for(let i = 0; i < deposits.length; i++) {
        data.deposits.push(deposits[i].toObject());
    }

    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment;filename=data_${user._id}.json`);

    res.send(JSON.stringify(data, null, 4));
})

module.exports = app;
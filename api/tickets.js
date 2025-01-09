const express = require('express');
const app = express.Router();

const lib = require('../lib');
const db = require('../db');

const mail = require('../mail');

app.get('/tickets', async (req, res) => {
    var user = await lib.getUser(req, res);

    var tickets = await db.Ticket.find({
        userID: user._id
    });

    res.json(tickets);
});

app.get('/ticket/:id', async (req, res) => {
    var user = await lib.getUser(req, res);
    var { id } = req.params;

    var ticket = await db.Ticket.findOne({
        userID: user._id,
        ticketID: id
    });
    if (!ticket) return res.status(404).json({ error: 'Invalid ticket' });

    var messages = await db.TicketMessage.find({
        ticketID: ticket._id
    });

    res.json({
        ticket,
        messages
    });
});

app.post('/ticket/:id/message', express.json(), async (req, res) => {
    var user = await lib.getUser(req, res);
    var { id } = req.params;
    var { msg } = req.body;

    if (!msg) return res.status(400).json({ error: 'No content' });

    var ticket = await db.Ticket.findOne({
        userID: user._id,
        ticketID: id
    });
    if (!ticket) return res.status(404).json({ error: 'Invalid ticket' });

    var message = new db.TicketMessage({
        ticketID: ticket._id,
        user: 1,
        content: msg,
        date: Date.now()
    });
    await message.save();

    ticket.lastAction = Date.now();
    await ticket.save();

    res.json({
        ok: true
    });
});

app.post('/ticket/new', express.json(), async (req, res) => {
    var user = await lib.getUser(req, res);
    var { subject, msg } = req.body;

    if (!msg || !subject) return res.status(400).json({ error: 'No content' });
    
    var id = Date.now().toString();

    var ticket = new db.Ticket({
        userID: user._id,
        ticketID: id,
        status: 'open',
        subject,
        lastAction: Date.now()
    });
    await ticket.save();

    var message = new db.TicketMessage({
        ticketID: ticket._id,
        user: 1,
        content: msg,
        date: Date.now()
    });
    await message.save();

    // try {
    //     mail.sendMail({
    //         to: user.email,
    //         subject: `[Meegie] Ticket #${id} created`, // Todo: env var with app name

    //         text: `Hello.\n\nYour ticket ${id} at Meegie has been created.\nTicket ID: #${id}\nView ticket: https://my.meegie.net/tickets/view/${id}`
    //     });
    // } catch(e) {
    //     return console.log('Sending ticket email failed', e);
    // }

    res.json({
        ok: true,
        ticketID: id
    });
});

app.get('/tickets/open', async (req, res) => {
    var user = await lib.getUser(req, res);

    var tickets = await db.Ticket.find({
        userID: user._id
    }).or([{ status: 'open' }, { status: 'replied' }]).exec();

    res.type('txt').send(tickets.length.toString());
});

app.get('/ticket/:id/close', async (req, res) => {
    var user = await lib.getUser(req, res);
    var { id } = req.params;

    var ticket = await db.Ticket.findOne({
        userID: user._id,
        ticketID: id
    });
    if (!ticket) return res.status(404).json({ error: 'Invalid ticket' });

    ticket.status = 'closed';
    await ticket.save();

    var message = new db.TicketMessage({
        ticketID: ticket._id,
        user: 0,
        content: `Ticket marked as closed.`,
        date: Date.now()
    });
    await message.save();

    res.json({
        ok: true,
        status: ticket.status
    });
});

module.exports = app;
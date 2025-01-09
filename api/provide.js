const express = require('express');
const app = express.Router();

const lib = require('../lib');
const db = require('../db');

function generateCode(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }

    return result;
}

app.post('/', express.json(), async (req, res) => {
    try {
        const {
            name,
            ramLimit,
            cpuLimit,
            cpu
        } = req.body;

        if (
            !name ||
            !ramLimit ||
            !cpuLimit ||
            !cpu
        ) return res.status(400).json({ error: 'Some params are missing' });

        const type = 'docker';

        if (typeof ramLimit != 'number' || typeof cpuLimit != 'number') {
            console.log(req.body, typeof ramLimit, typeof cpuLimit, typeof timeLimit);
            return res.status(400).json({ error: 'CPU and RAM need to be numbers' });
        }

        if (ramLimit <= 0 || cpuLimit <= 0) return res.status(400).json({ error: 'CPU, RAM needs to be greater than zero.' });

        // cpu
        if (cpu != 'x86' && cpu != 'arm') {
            return res.status(400).json({ error: 'CPU needs to be x86 or arm' });
        }

        const code = generateCode(9);

        var newClient = new db.Client({
            userID: req.session.user._id,
            name,
            status: 'offline',
            type: 'docker',
            reputation: 0,
            lastPing: 0,

            code,

            maxRAM: ramLimit,
            maxCPU: cpuLimit,
            cpu: cpu
        });
        await newClient.save();

        res.json({
            message: 'Created! ID: ' + newClient._id,
            id: newClient._id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const client = await db.Client.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });

        if (client.status != 'offline') return res.status(404).json({ error: 'Client needs to be offline.' });

        await db.Job.updateMany({
            clientID: id
        }, {
            status: 'waiting'
        });

        await db.Client.deleteOne({
            _id: id
        });

        res.json({ message: 'Deleted!' });
    } catch (error) {
        console.error('Error in DELETE /:id route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', async (req, res) => {
    try {
        const client = await db.Client.find({
            userID: req.session.user._id
        });

        if (!client) {
            return res.status(404).json({ error: 'No clients found' });
        }

        var l = [];
        for(let i = 0; i<client.length; i++) {
            var j = client[i];
            l.push(j);
        }
        res.json(l);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = app;
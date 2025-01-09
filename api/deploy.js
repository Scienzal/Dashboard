const express = require('express');
const app = express.Router();

const lib = require('../lib');
const db = require('../db');

app.post('/:id/resources', express.json(), async (req, res) => {
    let { id } = req.params;
    let { ram, cpu, time } = req.body;
    try {
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) return res.status(404).json({ error: 'Function not found' });

        ram = parseInt(ram);
        cpu = parseFloat(cpu);
        time = parseInt(time);

        if (isNaN(ram) || isNaN(cpu) || isNaN(time)) {
            return res.status(400).json({ error: 'Ram, CPU, and time need to be numbers' });
        }

        job.ramRequired = ram;
        job.cpuRequired = cpu;
        job.timeLimit = time*60;
        await job.save();   

        res.json({ message: 'Updated!' });
    } catch (error) {
        console.error('Error in DELETE /:id route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/:id/basecommand', express.json(), async (req, res) => {
    let { id } = req.params;
    let { command } = req.body;
    try {
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) return res.status(404).json({ error: 'Function not found' });

        if (!command) return res.status(404).json({ error: 'Command not found in body.' });

        job.baseCommand = command;
        await job.save();   

        res.json({ message: 'Updated!' });
    } catch (error) {
        console.error('Error in DELETE /:id route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/:id/command', express.json(), async (req, res) => {
    let { id } = req.params;
    let { command } = req.body;
    try {
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) return res.status(404).json({ error: 'Function not found' });

        if (!command) return res.status(404).json({ error: 'Command not found in body.' });

        job.command = command;
        await job.save();   

        res.json({ message: 'Updated!' });
    } catch (error) {
        console.error('Error in DELETE /:id route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/', express.json(), async (req, res) => {
    try {
        var {
            name,
            reliability,

            baseImage,
            baseCommand,
            cmd,

            ramLimit,
            cpuLimit,
            timeLimit,

            cpu
        } = req.body;
        if (
            !reliability ||

            !baseImage ||
            !baseCommand ||
            !cmd ||

            !ramLimit ||
            !cpuLimit ||
            !timeLimit ||

            !cpu
        ) return res.status(400).json({ error: 'Some params are missing' });

        const type = 'docker';

        switch (baseImage) {
            // Debian
            case 'debian-12':
                break;

            // Ubuntu
            case 'ubuntu-24':
                break;

            // Alpine
            case 'alpine-3.20':
                break;

            // Invalid images
            default:
                return res.status(400).json({ error: `Invalid base image: ${baseImage}` });
        }

        if (!name) {
            name = `job-${Date.now()}`;
        }

        if (typeof ramLimit != 'number' || typeof cpuLimit != 'number' || typeof timeLimit != 'number') {
            console.log(req.body, typeof ramLimit, typeof cpuLimit, typeof timeLimit);
            return res.status(400).json({ error: 'CPU, RAM and timeLimit need to be numbers' });
        }

        if (ramLimit <= 0 || cpuLimit <= 0 || timeLimit < 5) return res.status(400).json({ error: 'CPU, RAM needs to be greater than zero. Timelimit needs to be at least 5' });

        timeLimit = timeLimit * 60;

        if (type != 'docker') {
            return res.status(400).json({ error: 'Type needs to be docker' });
        }
        // reliable
        if (reliability != 'none' && reliability != 'stable' && reliability != 'verified') {
            return res.status(400).json({ error: 'Reliability needs to be none / stable / verified' });
        }

        // cpu
        if (cpu != 'x86' && cpu != 'arm') {
            return res.status(400).json({ error: 'CPU needs to be x86 or arm' });
        }
        if (cpu == 'arm') {
            return res.status(400).json({ error: 'ARM CPUs are currently not available, sorry.' });
        }

        let minReliability = 0;
        if (reliability == 'stable') minReliability = 1;
        if (reliability == 'verified') minReliability = 2;

        const user = await db.User.findOne({
            _id: req.session.user._id
        });
        if (user.credits <= 0) {
            return res.status(400).json({ error: 'Your balance needs to be greater than 0.' });
        }

        var GBs = (ramLimit / 1024) * timeLimit;
        var CPUs = cpuLimit * timeLimit;

        var GBCost = GBs * 1;
        var CPUCost = CPUs * 5;

        if (cpu == 'arm') {
            // ARM is 30% cheaper
            GBCost = GBCost * 0.7;
            CPUCost = CPUCost * 0.7;
        }

        if (user.credits < ((GBCost + CPUCost) / 10)) {
            return res.status(400).json({ error: 'Insufficient balance. Balance needed: ' + ((GBCost + CPUCost) / 10) + ' credits! Current balance: ' + user.credits });
        }

        const newDeployment = new db.Function({

            userID: req.session.user._id,

            name,
            type,

            baseImage,
            baseCommand,
            command: cmd,

            ramRequired: ramLimit,
            cpuRequired: cpuLimit,
            timeLimit: timeLimit,

            reputation: minReliability

        });
        await newDeployment.save();

        res.json({
            message: 'Created! ID: ' + newDeployment._id,
            id: newDeployment._id
        });
    } catch (error) {
        console.error('Error in POST / route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        const job = await db.Job.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) return res.status(404).json({ error: 'Job not found' });

        if (job.status != 'waiting') return res.status(400).json({ error: 'Job is already processing.' });

        await db.Log.deleteMany({ jobID: id });

        await db.Job.deleteOne({
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
        const job = await db.Function.find({
            userID: req.session.user._id
        });

        var l = [];
        for (let i = 0; i < job.length; i++) {
            var j = job[i];
            l.push(j);
        }
        res.json(l);
    } catch (error) {
        console.error('Error in / route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/:id/jobs', async (req, res) => {
    const { id } = req.params;
    try {
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) return res.status(404).json([
            {
                date: Date.now(),
                message: 'Job not found!'
            }
        ]);

        const logs = await db.Job.find({
            functionID: id
        }, null, {
            sort: {
                createDate: -1
            }
        });

        var l = [];
        for (let i = 0; i < logs.length; i++) {
            l.push(logs[i].toObject());
        }
        res.json(l);
    } catch (error) {
        console.error('Error in /jobs/:id route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/:id/trigger', express.raw({ type: "*/*" }), async (req, res) => {
    const { id } = req.params;
    const data = String(req.body);
    try {
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) return res.status(404).json([
            {
                date: Date.now(),
                message: 'Job not found!'
            }
        ]);

        var newJob = new db.Job({
            userID: req.session.user._id,
            functionID: job._id,

            name: `job-${Date.now()}`,
            type: job.type,
            status: 'waiting',

            baseImage: job.baseImage,
            baseCommand: job.baseCommand,
            command: job.command,

            data: data,

            ramRequired: job.ramRequired,
            cpuRequired: job.cpuRequired,
            timeLimit: job.timeLimit,

            reputation: job.reputation,

            clientID: null,
            start: null,
            end: null,
            time: null,

            createDate: Date.now(),

            cpu: 'x86'
        });
        await newJob.save();

        const log = new db.Log({
            jobID: newJob._id,
            date: Date.now(),
            message: '[SYSTEM] Job created!'
        });
        await log.save();

        res.json({
            jobID: newJob._id
        });
    } catch (error) {
        console.error('Error in /jobs/:id route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/logs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const job = await db.Job.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) return res.status(404).json([
            {
                date: Date.now(),
                message: 'Job not found!'
            }
        ]);

        const logs = await db.Log.find({
            jobID: id
        });

        var l = [];
        for (let i = 0; i < logs.length; i++) {
            l.push(logs[i].message);
        }
        res.json(l);
    } catch (error) {
        console.error('Error in /logs/:id route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/counts', async (req, res) => {
    try {
        var noneCount = await db.Client.countDocuments({
            status: 'process',
            reputation: { $gte: 0 }
        });

        var stableCount = await db.Client.countDocuments({
            status: 'process',
            reputation: { $gte: 1 }
        });

        var verifiedCount = await db.Client.countDocuments({
            status: 'process',
            reputation: { $gte: 2 }
        });

        res.json({
            none: noneCount,
            stable: stableCount,
            verified: verifiedCount
        });
    } catch (error) {
        console.error('Error in /counts route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = app;
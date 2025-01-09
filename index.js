require('dotenv').config();
const { env } = process;

const express = require('express');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
const morgan = require('morgan');
const cors = require('cors');
const frameguard = require("frameguard");

const allowed = require('./allowed');
const db = require('./db');

const app = express();

app.use(cors({
    origin: ['https://my.meegie.net'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']
}));

app.use(frameguard({ action: "sameorigin" }));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,

    store: new FileStore({
        reapAsync: true,
        reapSyncFallback: true
    })
}));

app.use(morgan('dev'));

app.set('view engine', 'ejs');

app.use('/assets', express.static(__dirname + '/assets'));

app.use('/api/auth', require('./api/auth'));

app.get('/metrics', async (req, res) => {
    var noneCount = await db.Client.countDocuments({
        status: 'process',
        reputation: 0
    });

    var stableCount = await db.Client.countDocuments({
        status: 'process',
        reputation: 1
    });

    var verifiedCount = await db.Client.countDocuments({
        status: 'process',
        reputation: 2
    });

    var stats = [];

    // Type clients
    stats.push(`meegie_clients{rep="none"} ${noneCount}`);
    stats.push(`meegie_clients{rep="stable"} ${stableCount}`);
    stats.push(`meegie_clients{rep="verified"} ${verifiedCount}`);

    // Client status
    stats.push(`meegie_clients_ping{status="offline"} ${await db.Client.countDocuments({ status: 'offline' })}`);
    stats.push(`meegie_clients_ping{status="active"} ${await db.Client.countDocuments({ status: 'process' })}`);

    // Functions
    stats.push(`meegie_functions ${await db.Function.countDocuments({})}`);

    // Jobs
    stats.push(`meegie_jobs{status="waiting"} ${await db.Job.countDocuments({ status: 'waiting' })}`);
    stats.push(`meegie_jobs{status="process"} ${await db.Job.countDocuments({ status: 'process' })}`);
    stats.push(`meegie_jobs{status="completed"} ${await db.Job.countDocuments({ status: 'completed' })}`);

    // Users
    stats.push(`meegie_users ${await db.User.countDocuments({})}`);

    res.type('txt').send(stats.join('\n'));
});

app.use(async (req, res, next) => {
    try {
        if (req.query.token) {
            var token = await db.Token.findOne({
                token: req.query.token
            });
            if (!token) return res.status(400).json({ error: 'Invalid API token' });

            var user = await db.User.findOne({
                _id: token.userID
            });

            req.session.user = user;
        }

        if (!req.session.user && !allowed.includes(req.path) && !String(req.path).startsWith('/assets')) {
            return res.redirect('/login');
        }

        next();
    } catch (error) {
        console.error('Error in middleware:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/', (req, res) => res.render('dashboard', {req, res}));
app.get('/login', (req, res) => res.render('login', {req, res}));
app.get('/register', (req, res) => res.render('register', {req, res}));
app.get('/profile', (req, res) => res.render('profile', {req, res}));
app.get('/verify', (req, res) => res.render('verify', {req, res}));

app.get('/billing', (req, res) => res.render('billing', {req, res}));

app.get('/tickets', (req, res) => res.render('tickets', {req, res}));
app.get('/tickets/view/:id', (req, res) => res.render('ticket-view', {req, res}));
app.get('/tickets/new', (req, res) => res.render('ticket-new', {req, res}));

// app.get('/deploy', (req, res) => res.render('deploy/list', {req, res}));
app.get('/deploy', async (req, res) => {
    try {
        const job = await db.Function.find({
            userID: req.session.user._id
        });
    
        var l = [];
        for(let i = 0; i<job.length; i++) {
            var j = job[i];
            l.push(j);
        }
        res.render('deploy/list', {
            req, res, jobs: l
        })
    } catch(e) {
        res.type('txt').send(String(e));
    }
});
app.get('/deploy/create', (req, res) => res.render('deploy/create', {req, res}));
app.get('/deploy/job/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await db.Job.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) {
            return res.redirect('/deploy');
        }
        res.render('deploy/viewjob', {
            req, res, job
        })
    } catch(e) {
        res.type('txt').send(String(e));
    }
});

app.get('/deploy/function/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) {
            return res.redirect('/deploy');
        }
        res.render('deploy/view', {
            req, res, job
        })
    } catch(e) {
        res.type('txt').send(String(e));
    }
});

app.get('/deploy/function/:id/trigger', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) {
            return res.redirect('/deploy');
        }
        res.render('deploy/trigger', {
            req, res, job
        })
    } catch(e) {
        res.type('txt').send(String(e));
    }
});

app.get('/deploy/function/:id/resources', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await db.Function.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!job) {
            return res.redirect('/deploy');
        }
        res.render('deploy/resources', {
            req, res, job
        })
    } catch(e) {
        res.type('txt').send(String(e));
    }
});

/* Provide */
app.get('/provide', async (req, res) => {
    try {
        const client = await db.Client.find({
            userID: req.session.user._id
        });
    
        var l = [];
        for(let i = 0; i<client.length; i++) {
            var j = client[i];
            l.push(j);
        }
        res.render('provide/list', {
            req, res, clients: l
        })
    } catch(e) {
        res.type('txt').send(String(e));
    }
});
app.get('/provide/create', (req, res) => res.render('provide/create', {req, res}));
app.get('/provide/client/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await db.Client.findOne({
            userID: req.session.user._id,
            _id: id
        });
        if (!client) {
            return res.redirect('/provide');
        }
        res.render('provide/view', {
            req, res, clients: client
        });
    } catch(e) {
        res.type('txt').send(String(e));
    }
});

app.use('/api', require('./api/user'));
app.use('/api', require('./api/billing'));
app.use('/api', require('./api/tickets'));
app.use('/api/deploy', require('./api/deploy'));
app.use('/api/provide', require('./api/provide'));

app.listen(env.PORT, env.HOST, () => {
    console.log('App online on port ' + env.PORT);
})
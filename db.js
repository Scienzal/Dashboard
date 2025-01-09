const mongoose = require('mongoose');
mongoose.connect(process.env.DB);

const User = mongoose.model('User', {
    email: String,
    password: String,

    mailVerified: Boolean,
    verifyToken: String,
    mailSent: Boolean,

    firstName: String,
    lastName: String,
    country: String,
    phoneNumber: String,
    address: String,

    isFree: Boolean,
    isAdmin: Boolean,

    credits: Number
});

const Token = mongoose.model('Token', {
    userID: String,
    token: String
});

const Deposit = mongoose.model('Deposit', {
    userID: String,
    amount: Number,
    name: String,
    mail: String,
    paymentID: String,
    date: Number // Unix timestamp
});

/* SUPPORT */
const Ticket = mongoose.model('Ticket', {
    userID: String,

    subject: String,
    status: String, // open | closed

    ticketID: String,
    lastAction: Number
});
const TicketMessage = mongoose.model('TicketMessage', {
    ticketID: String,

    user: Number,
    /*
        0 = system
        1 = user
        2 = support
    */

    content: String,

    date: Number // Unix timestamp (ms)
});

// Functions
const Function = mongoose.model('Function', {
    userID: String,

    name: String,
    type: String,

    baseImage: String,
    baseCommand: String,
    command: String,

    ramRequired: Number,
    cpuRequired: Number,
    timeLimit: Number,

    reputation: Number,
});

/* Serverless */
const Job = mongoose.model('Job', {
    userID: String,
    functionID: String,

    name: String,
    type: String, // browser | docker
    status: String,

    baseImage: String,
    baseCommand: String,
    command: String,
    data: String,

    createDate: Number,
    exitCode: Number,

    ramRequired: Number,
    cpuRequired: Number,
    timeLimit: Number,

    clientID: String,

    start: Number,
    end: Number,
    time: Number,

    cost: Number,
    initalCost: Number,
    needsKill: Boolean,

    reputation: Number,
    cpu: String
});
const Log = mongoose.model('Log', {
    jobID: String,

    message: String
});

const Client = mongoose.model('Client', {
    userID: String,

    name: String,
    type: String, // browser | docker
    cpu: String, // x86 | arm
    status: String,
    code: String,

    lastPing: Number,
    reputation: Number, // none = 0, verified = 1, datacenter = 2

    maxRAM: Number,
    maxCPU: Number,
    maxTime: Number,

    cpu: String // x86 or arm
});

module.exports = {
    User,
    Token,
    Deposit,

    Ticket,
    TicketMessage,

    Job,
    Function,

    Client,
    Log
};
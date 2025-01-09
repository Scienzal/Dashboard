const express = require('express');
const app = express.Router();

const lib = require('../lib');
const db = require('../db');

const argon2 = require('argon2');
function genToken(length){
    //edit the token allowed characters
    var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    var b = [];  
    for (var i=0; i<length; i++) {
        var j = (Math.random() * (a.length-1)).toFixed(0);
        b[i] = a[j];
    }
    return b.join("");
}

app.post('/login', express.json(), async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return lib.error(res, 400, 'email and password are required');

    const user = await db.User.findOne({
        email
    });

    if (!user) return lib.error(res, 404, 'invalid user');

    var isMatch = await argon2.verify(user.password, password);

    if (!isMatch) return lib.error(res, 403, 'Invalid password');

    req.session.user = user;

    res.json({
        ok: true
    });
});

app.post('/register', express.json(), async (req, res) => {
    const { email, password, firstName, lastName, country, address, phoneNumber } = req.body;

    if (!email || !password || !firstName || !lastName || !country || !address || ! phoneNumber) return lib.error(res, 400, 'email, password, firstName, lastName, country, address, phoneNumber are required');

    const user = await db.User.findOne({
        email
    });

    if (user) return lib.error(res, 404, 'User already exists');

    var pass = await await argon2.hash(password);

    var newUser = new db.User({
        email,
        password: pass,

        mailVerified: false,
        verifyToken: genToken(6),
        mailSent: false,

        firstName,
        lastName,
        address,
        country,
        phoneNumber,

        credits: 100_000,
        isAdmin: false,
        isFree: true
    });
    await newUser.save();

    req.session.user = newUser;

    res.json({
        ok: true,
        user: newUser
    });
});

module.exports = app;
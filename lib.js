const lib = {};

const db = require('./db');

lib.error = (res, status, msg) => {
    res.status(status);
    res.json({
        error: msg
    });
};

lib.getUser = async (req, res) => {
    const user = await db.User.findOne({
        _id: req.session.user._id
    });
    if (!user) return res.status(500).json({ error: 'User not found' });

    return user;
};

module.exports = lib;
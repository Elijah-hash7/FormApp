const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    airtableUserId: {
        type: String,
        required: true,
        unique: true
    },
    email : {
        type: String,
        required: true,
    },
    accessToken: {
        type: String,
        required: true,
    },
    refreshToken: String,
    loginAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
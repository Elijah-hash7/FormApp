const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true,
        index: true
    },
    airtableRecordId: {
        type: String,
        required: true,
        index: true
    },
    answers: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    deletedInAirtable: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true  
});

module.exports = mongoose.model('Response', responseSchema);
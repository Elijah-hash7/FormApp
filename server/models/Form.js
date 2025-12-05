const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
    questionKey: { type: String, required: true },
    operator: { type: String, enum: ['equals', 'notEquals', 'contains'], required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const questionSchema = new mongoose.Schema({
    questionKey: { type: String, required: true },
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String,
        enum: ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelects', 'multipleAttachments'],
        required: true
    },
    required: { type: Boolean, default: false },
    options: [String],
    conditionalRules: {
        logic: { type: String, enum: ['AND', 'OR'] },
        conditions: [conditionSchema]
    }
});

const formSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    airtableBaseId: { type: String, required: true },
    airtableTableId: { type: String, required: true },
    ownerAccessToken: { type: String, required: true }, 
    ownerRefreshToken: { type: String },
    questions: [questionSchema],

    webhookId: { type: String },
    webhookSecret: { type: String },
    webhookUrl: { type: String },
    webhookExpires: { type: Date },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Form', formSchema);
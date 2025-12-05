const express = require('express');
const Response = require('../models/Response');
const Form = require('../models/Form');
const User = require('../models/User');
const crypto = require('crypto');
const { callAirtableAPI } = require('../utils/airtableAPI');

const router = express.Router();

router.post('/airtable', async (req, res) => {
    try {
        console.log('Webhook received from Airtable');
        console.log('Body:', JSON.stringify(req.body, null, 2));

        const { webhook, base } = req.body;

        if (!webhook || !base) {
            console.log('✅ Test webhook - responding OK');
            return res.status(200).send('OK');
        }

        const form = await Form.findOne({ webhookId: webhook.id });
        if (!form) {
            console.log('No form found for webhook:', webhook.id);
            return res.status(200).send('OK');
        }

        const signature = req.headers['x-airtable-content-mac'];
        if (signature && form.webhookSecret) {
            const payload = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac('sha256', form.webhookSecret)
                .update(payload)
                .digest('base64');

            if (signature !== expectedSignature) {
                console.log('❌ Invalid signature');
                return res.status(401).send('Invalid signature');
            }
        }

        // ONLY HANDLE UPDATES (not new records)
        if (req.body.changedTablesById) {
            const changedTables = req.body.changedTablesById;
            const tableId = form.airtableTableId;

            if (changedTables[tableId]) {
                const changes = changedTables[tableId];

                if (changes.changedRecordsById) {
                    const recordIds = Object.keys(changes.changedRecordsById);

                    console.log(`🔄 Processing ${recordIds.length} updated records`);

                    for (const recordId of recordIds) {
                        console.log(`Looking for record: ${recordId}`);

                        const response = await Response.findOne({ airtableRecordId: recordId });
                        if (!response) {
                            console.log(`❌ No response found for record ${recordId} - skipping`);
                            continue;
                        }

                        try {
                            // Get User object and use callAirtableAPI
                            const user = await User.findById(form.ownerId);
                            if (!user) {
                                console.log('User not found for form owner');
                                continue;
                            }

                            const airtableRes = await callAirtableAPI(
                                user,
                                'get',
                                `https://api.airtable.com/v0/${form.airtableBaseId}/${tableId}/${recordId}`
                            );

                            const updatedAnswers = {};
                            for (const q of form.questions) {
                                updatedAnswers[q.questionKey] = airtableRes.data.fields[q.fieldId];
                            }

                            // Update in DB
                            response.answers = updatedAnswers;
                            response.updatedAt = new Date();
                            await response.save();

                            console.log(`✅ Updated response ${response._id}`);
                        } catch (error) {
                            console.error(`Error fetching record ${recordId}:`, error.message);
                        }
                    }
                }
            }
        }

        // Handle deletions
        if (req.body.destroyedTablesById) {
            const destroyedTables = req.body.destroyedTablesById;
            const tableId = form.airtableTableId;

            if (destroyedTables[tableId]) {
                const destroys = destroyedTables[tableId];

                if (destroys.destroyedRecordIds) {
                    const deletedIds = destroys.destroyedRecordIds;

                    for (const recordId of deletedIds) {
                        console.log(`Marking record as deleted: ${recordId}`);

                        const response = await Response.findOne({ airtableRecordId: recordId });
                        if (response) {
                            response.deletedInAirtable = true;
                            response.deletedAt = new Date();
                            await response.save();

                            console.log(`🗑️ Marked response ${response._id} as deleted`);
                        } else {
                            console.log(`No response found for deleted record ${recordId}`);
                        }
                    }
                }
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        res.status(200).send('Error processed');
    }
});

// GET endpoint for testing
router.get('/airtable', (req, res) => {
    res.json({ status: 'Webhook endpoint is active', timestamp: new Date() });
});

module.exports = router;
const express = require('express');
const Form = require('../models/Form');
const User = require('../models/User');
const Response = require('../models/Response');
const { getCurrentUser } = require('../middleware/authMiddleware');
const { callAirtableAPI } = require('../utils/airtableAPI');

const router = express.Router();

// saves and validate the form sturcture
router.post('/', getCurrentUser, async (req, res) => {
    try {

        const { name, airtableBaseId, airtableTableId, questions } = req.body;


        const user = req.user
        if (!user) {
            return res.status(401).json({ error: 'No user logged in' });
        }

        if (!airtableBaseId || !airtableTableId || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: 'Missing field required' });
        }

        const validTypes = ['singleLineText', 'multilineText', 'multipleSelects', 'multipleAttachments', 'singleSelect'];
        for (const q of questions) {
            if (!q.questionKey || !q.fieldId || !q.label || !q.type) {
                return res.status(400).json({ error: 'Invalid question format' });
            }
            if (!validTypes.includes(q.type)) {
                return res.status(400).json({ error: `Unsupported question type: ${q.type}` });
            }
        }

        const form = new Form({
            name,
            ownerId: user._id,
            airtableBaseId,
            airtableTableId,
            ownerAccessToken: user.accessToken,
            ownerRefreshToken: user.refreshToken,
            questions
        });

        console.log('Form object before save:', {
            name: form.name,
            ownerId: form.ownerId,
            airtableBaseId: form.airtableBaseId,
            airtableTableId: form.airtableTableId,
            questionsCount: form.questions.length
        });
        await form.save();

        console.log('✅✅✅ FORM SAVED SUCCESSFULLY!');
        console.log('Form _id:', form._id);
        console.log('Form saved to collection');


        res.status(201).json({
            id: form._id,
            airtableBaseId: form.airtableBaseId,
            airtableTableId: form.airtableTableId,
            questions: form.questions
        });
    } catch (error) {
        console.error('Error saving form:', error);
        res.status(500).json({ error: 'Failed to save form' });
    }
});

// gets the full form  by id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        res.json({
            id: form._id,
            airtableBaseId: form.airtableBaseId,
            airtableTableId: form.airtableTableId,
            questions: form.questions
        });
    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ error: 'Failed to load form' });
    }
})

module.exports = router;

// Get all forms for current user (for Dashboard)
router.get('/user/forms', getCurrentUser, async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const forms = await Form.find({ ownerId: user._id })
            .select('name _id createdAt')
            .sort({ createdAt: -1 });

        res.json({ forms });
    } catch (error) {
        console.error('Error fetching user forms:', error);
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// Get form by ID (for FormFiller)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const form = await Form.findById(id);

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        res.json({
            _id: form._id,
            name: form.name,
            questions: form.questions
        });
    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ error: 'Failed to load form' });
    }
});


router.delete('/:formId', getCurrentUser, async (req, res) => {
    try {
        const { formId } = req.params;
        const userId = req.user._id;

        console.log(`🗑️ Deleting form ${formId} requested by user ${userId}`);


        const form = await Form.findById(formId);
        if (!form) {
            console.log(`Form ${formId} not found`);
            return res.status(404).json({ error: 'Form not found' });
        }


        if (form.ownerId.toString() !== userId.toString()) {
            console.log(`Permission denied: User ${userId} doesn't own form ${formId}`);
            return res.status(403).json({ error: 'You do not have permission to delete this form' });
        }

        console.log(`✅ User ${userId} has permission to delete form ${formId}`);


        const responses = await Response.find({ formId: formId });
        console.log(`📊 Found ${responses.length} responses to delete`);


        const ownerTokenInfo = {
            accessToken: form.ownerAccessToken,
            refreshToken: form.ownerRefreshToken
        };

        console.log('Form owner token available:', !!ownerTokenInfo.accessToken);
        console.log('Form owner refresh token available:', !!ownerTokenInfo.refreshToken);


        let deletedAirtableCount = 0;
        let airtableErrors = [];

        const formOwner = await User.findById(req.user._id);

        if (ownerTokenInfo.accessToken && responses.length > 0) {
            for (const resp of responses) {
                if (resp.deletedInAirtable || !resp.airtableRecordId) {
                    console.log(`⏭️ Skipping response ${resp._id} - already deleted or no Airtable ID`);
                    continue;
                }

                try {
                    await callAirtableAPI(
                        formOwner,
                        'delete',
                        `https://api.airtable.com/v0/${form.airtableBaseId}/${form.airtableTableId}/${resp.airtableRecordId}`
                    );
                    deletedAirtableCount++;
                    console.log(`✅ Deleted Airtable record ${resp.airtableRecordId}`);
                } catch (airtableError) {
                    const errorMsg = airtableError.response?.data?.error?.message || airtableError.message;
                    const statusCode = airtableError.response?.status;


                    if (statusCode === 404) {
                        console.log(`ℹ️ Airtable record ${resp.airtableRecordId} not found (already deleted)`);
                        deletedAirtableCount++; // Count as success
                    } else if (statusCode === 401 || statusCode === 403) {
                        console.error(`🔐 Auth error for Airtable record ${resp.airtableRecordId}:`, errorMsg);
                        airtableErrors.push({
                            responseId: resp._id,
                            error: 'Authentication failed - token may have expired'
                        });
                    } else {
                        airtableErrors.push({
                            responseId: resp._id,
                            error: errorMsg
                        });
                        console.error(`⚠️ Failed to delete Airtable record ${resp.airtableRecordId}:`, errorMsg);
                    }
                }
            }
        } else {
            console.log('ℹ️ Skipping Airtable deletion - no owner token or no responses');
        }

        // 6. Soft-delete all responses locally
        const now = new Date();
        const updateResult = await Response.updateMany(
            { formId: formId, deletedInAirtable: { $ne: true } },
            {
                $set: {
                    deletedInAirtable: true,
                    deletedAt: now,
                    deleteNotes: 'Form deleted by owner'
                }
            }
        );

        const softDeletedCount = updateResult.modifiedCount || 0;
        console.log(`📝 Soft-deleted ${softDeletedCount} responses locally`);


        await Form.findByIdAndDelete(formId);
        console.log(`🗑️ Deleted form ${formId} from database`);


        const response = {
            success: true,
            message: 'Form deleted successfully',
            details: {
                formDeleted: true,
                airtableRecordsDeleted: deletedAirtableCount,
                responsesSoftDeleted: softDeletedCount,
                totalResponsesFound: responses.length
            }
        };


        if (airtableErrors.length > 0) {
            response.warnings = {
                airtableErrors: airtableErrors.length,
                message: 'Some Airtable records could not be deleted (check logs)'
            };
        }

        if (!ownerTokenInfo.accessToken) {
            response.warnings = {
                ...response.warnings,
                noToken: 'Form had no owner Airtable token - only local deletion performed'
            };
        }

        res.json(response);

    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({
            error: 'Failed to delete form',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});


router.post('/:formId/register-webhook', getCurrentUser, async (req, res) => {
    try {
        const form = await Form.findById(req.params.formId);

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const ngrokUrl = req.body.ngrokUrl;

        if (!ngrokUrl) {
            return res.status(400).json({ error: 'ngrokUrl is required' });
        }

        const notificationUrl = `${ngrokUrl}/api/webhooks/airtable`;

        console.log('📡 Registering webhook with Airtable...');
        console.log('Notification URL:', notificationUrl);

        const webhookRes = await callAirtableAPI(
            req.user,
            'POST',
            `https://api.airtable.com/v0/bases/${form.airtableBaseId}/webhooks`,
            {
                notificationUrl,
                specification: {
                    options: {
                        filters: {
                            dataTypes: ["tableData"],
                            recordChangeScope: form.airtableTableId,
                            watchFor: ["add", "update", "delete"]
                        }
                    }
                }
            }
        );

        form.webhookId = webhookRes.data.id;
        form.webhookSecret = webhookRes.data.macSecretBase64;
        form.webhookUrl = notificationUrl;
        form.webhookExpires = new Date(webhookRes.data.expirationTime);
        await form.save();

        console.log('✅ Webhook registered:', webhookRes.data.id);

        res.json({
            success: true,
            webhookId: webhookRes.data.id,
            notificationUrl,
            expires: webhookRes.data.expirationTime
        });

    } catch (error) {
        console.error('❌ Webhook registration error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to register webhook' });
    }
});

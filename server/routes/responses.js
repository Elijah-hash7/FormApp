const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const User = require('../models/User');
const Response = require('../models/Response');
const { getCurrentUser } = require('../middleware/authMiddleware');
const { callAirtableAPI } = require('../utils/airtableAPI');

router.post('/', async (req, res) => {
    try {
        const { formId, answers } = req.body;

        console.log('📝 Submitting response for form:', formId);
        console.log('📝 Answers received:', answers);

        const form = await Form.findById(formId);
        if (!form) {
            console.error('❌ Form not found:', formId);
            return res.status(404).json({ error: 'Form not found' });
        }

        console.log('✅ Form found:', form.name);

        // Validate answers
        const validAnswers = {};
        for (const q of form.questions) {
            const answer = answers[q.questionKey];

            if (q.required && (answer === undefined || answer === null || answer === '')) {
                return res.status(400).json({
                    error: `Missing required field: ${q.label}`
                });
            }

            validAnswers[q.questionKey] = answer;
        }

        console.log('✅ Answers validated');

        // Prepare Airtable fields
        const airtableFields = {};
        for (const q of form.questions) {
            if (validAnswers[q.questionKey] !== undefined && validAnswers[q.questionKey] !== null) {
                if (q.type === 'multipleAttachments') {
                    console.log('⚠️ Skipping file upload for Airtable');
                    continue;
                }
                airtableFields[q.fieldId] = validAnswers[q.questionKey];
            }
        }

        console.log('📤 Sending to Airtable:', airtableFields);

        // Get form owner
        const formOwner = await User.findById(form.ownerId);
        if (!formOwner) {
            console.error('❌ Form owner not found');
            return res.status(500).json({ error: 'Form owner not found' });
        }

        console.log('✅ Using tokens from owner:', formOwner.email);
        console.log('🔑 Token exists:', !!formOwner.accessToken);
        console.log('🔑 Token length:', formOwner.accessToken?.length || 0);

        // Try to save to Airtable with DETAILED error handling
        let airtableRecordId = null;
        try {
            console.log('🌐 Making Airtable request...');
            console.log('Base ID:', form.airtableBaseId);
            console.log('Table ID:', form.airtableTableId);
            
            const airtableRes = await callAirtableAPI(
                formOwner,
                'post',
                `https://api.airtable.com/v0/${form.airtableBaseId}/${form.airtableTableId}`,
                { fields: airtableFields }
            );

            airtableRecordId = airtableRes.data.id;
            console.log('✅ Airtable record created:', airtableRecordId);

        } catch (airtableError) {
            // DETAILED ERROR LOGGING
            console.error('====== AIRTABLE ERROR DETAILS ======');
            console.error('Error message:', airtableError.message);
            console.error('Error name:', airtableError.name);
            console.error('Error stack:', airtableError.stack);
            
            if (airtableError.response) {
                console.error('Response status:', airtableError.response.status);
                console.error('Response data:', JSON.stringify(airtableError.response.data, null, 2));
                console.error('Response headers:', airtableError.response.headers);
            } else if (airtableError.request) {
                console.error('No response received!');
                console.error('Request:', airtableError.request);
            } else {
                console.error('Error setting up request:', airtableError.message);
            }
            console.error('====================================');
            
            return res.status(500).json({
                error: 'Failed to save to Airtable',
                details: airtableError.response?.data?.error?.message || airtableError.message,
                debugInfo: {
                    hasResponse: !!airtableError.response,
                    status: airtableError.response?.status,
                    errorType: airtableError.name
                }
            });
        }

        // Save to MongoDB
        const responseDoc = new Response({
            formId: form._id,
            airtableRecordId: airtableRecordId,
            answers: validAnswers,
            deletedInAirtable: false
        });

        await responseDoc.save();
        console.log('✅ Response saved to MongoDB:', responseDoc._id);

        res.status(201).json({
            success: true,
            message: 'Response submitted successfully!',
            responseId: responseDoc._id,
            airtableRecordId: airtableRecordId
        });

    } catch (error) {
        console.error('❌ Error saving response:', error);
        res.status(500).json({
            error: 'Failed to submit form',
            details: error.message
        });
    }
});

router.get('/forms/:formId/responses', getCurrentUser, async (req, res) => {
    try {
        const { formId } = req.params;

        console.log('📊 Fetching responses for form:', formId);

        const responses = await Response.find({ formId, deletedInAirtable: false }).sort({ createdAt: -1 });

        console.log(`✅ Found ${responses.length} responses`);

        const formattedResponses = responses.map(r => ({
            _id: r._id,
            id: r._id,
            airtableRecordId: r.airtableRecordId,
            answers: r.answers,
            deletedInAirtable: r.deletedInAirtable || false,
            deletedAt: r.deletedAt,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            submittedAt: r.createdAt
        }));

        res.json(formattedResponses);

    } catch (error) {
        console.error('❌ Error fetching responses:', error);
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

router.delete('/:responseId', getCurrentUser, async (req, res) => {
    try {
        const { responseId } = req.params;
        const response = await Response.findById(responseId);
        if (!response) {
            return res.status(404).json({ error: 'Response not found' });
        }

        const form = await Form.findById(response.formId);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        if (form.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        // ✅ GET FRESH USER OBJECT (not just req.user)
        const formOwner = await User.findById(req.user._id);  // ← CHANGE THIS
        let airtableDeleted = false;

        if (formOwner && formOwner.accessToken && response.airtableRecordId && !response.deletedInAirtable) {
            try {
                await callAirtableAPI(
                    formOwner,  // ← Use formOwner, not req.user
                    'delete',
                    `https://api.airtable.com/v0/${form.airtableBaseId}/${form.airtableTableId}/${response.airtableRecordId}`
                );
                airtableDeleted = true;
                console.log(`✅ Deleted Airtable record ${response.airtableRecordId}`);
            } catch (airtableError) {
                console.error(`⚠️ Failed to delete Airtable record:`, airtableError.message);
            }
        }

        // Soft-delete locally
        response.deletedInAirtable = true;
        response.deletedAt = new Date();
        await response.save();

        res.json({
            success: true,
            message: 'Response deleted',
            airtableDeleted: airtableDeleted,
            locallyDeleted: true
        });

    } catch (error) {
        console.error('❌ Error deleting response:', error);
        res.status(500).json({ error: 'Failed to delete response' });
    }
});

router.patch('/:responseId', getCurrentUser, async (req, res) => {
    try {
        const { responseId } = req.params;
        const { answers } = req.body;

        console.log('✏️ Updating response:', responseId);

        const response = await Response.findById(responseId);
        if (!response) {
            return res.status(404).json({ error: 'Response not found' });
        }

        const form = await Form.findById(response.formId);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        if (form.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        console.log('✅ Permission check passed');

        // Merge new answers with existing
        const validAnswers = {};
        for (const q of form.questions) {
            const answer = answers[q.questionKey];
            validAnswers[q.questionKey] = answer !== undefined
                ? answer
                : response.answers[q.questionKey];
        }

        console.log('✅ Answers validated');

        // Prepare Airtable fields
        const airtableFields = {};
        for (const q of form.questions) {
            if (validAnswers[q.questionKey] !== undefined && validAnswers[q.questionKey] !== null) {
                if (q.type === 'multipleAttachments') {
                    console.log('⚠️ Skipping file upload for Airtable');
                    continue;
                }
                airtableFields[q.fieldId] = validAnswers[q.questionKey];
            }
        }

        console.log('📤 Updating Airtable with:', airtableFields);

        // Update Airtable using callAirtableAPI
        try {
            await callAirtableAPI(
                req.user,
                'patch',
                `https://api.airtable.com/v0/${form.airtableBaseId}/${form.airtableTableId}/${response.airtableRecordId}`,
                { fields: airtableFields }
            );

            console.log('✅ Airtable record updated:', response.airtableRecordId);

        } catch (airtableError) {
            console.error('❌ Airtable update error:', airtableError.response?.data || airtableError.message);
            return res.status(500).json({
                error: 'Failed to update Airtable',
                details: airtableError.response?.data?.error?.message || airtableError.message
            });
        }

        // Update MongoDB
        response.answers = validAnswers;
        response.updatedAt = new Date();
        await response.save();

        console.log('✅ Response updated in MongoDB:', responseId);

        res.json({
            success: true,
            message: 'Response updated successfully!',
            response: {
                _id: response._id,
                answers: response.answers,
                updatedAt: response.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Error updating response:', error);
        res.status(500).json({
            error: 'Failed to update response',
            details: error.message
        });
    }
});

module.exports = router;
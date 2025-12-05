const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Form = require('../models/Form');
const { getCurrentUser } = require('../middleware/authMiddleware');
const { callAirtableAPI } = require('../utils/airtableAPI');


router.get('/bases', getCurrentUser, async (req, res) => {
  try {

    const response = await callAirtableAPI(req.user, 'GET', `https://api.airtable.com/v0/meta/bases`);


    const bases = response.data.bases.map(base => ({
      id: base.id,
      name: base.name
    }));
    res.json({ bases: bases });
  } catch (error) {
    console.error('Error fetching bases:', error.reponse?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch bases' })
  }
});


router.get('/bases/:baseId/tables', getCurrentUser, async (req, res) => {
  try {
    const { baseId } = req.params;
    

    const response = await callAirtableAPI(req.user, 'GET', `https://api.airtable.com/v0/meta/bases/${baseId}/tables`);

    

    const tables = response.data.tables.map(table => ({
      id: table.id,
      name: table.name
    }));

    
    res.json({ tables: tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    console.error('Error stack:', error.stack);  
    res.status(500).json({ error: 'Failed to fetch tables' });
  }

});

router.get('/bases/:baseId/tables/:tableId/fields', getCurrentUser, async (req, res) => {
  try {
    const { baseId, tableId } = req.params;


    const response = await callAirtableAPI(
      req.user,
      'GET',
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
    );

    const table = response.data.tables.find(t => t.id === tableId);

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    

    const supportedTypes = ['singleLineText', 'multilineText', 'multipleSelects', 'multipleAttachments', 'singleSelect'];

    const fields = table.fields
      .filter(field => supportedTypes.includes(field.type))
      .map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        options: field.options || null
      }));

    res.json({ fields: fields });
  } catch (error) {
    console.error(' Error fetching fields:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch fields' })
  }
});


router.post('/bases/:baseId/webhook', getCurrentUser, async (req, res) => {
  try {
    const { baseId } = req.params;
    const { notificationUrl, tableId } = req.body;


    if (!tableId) {
      return res.status(400).json({ error: 'tableId is required' });
    }




    const webhookRes = await callAirtableAPI(
      req.user,
      'POST',
      `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
      {
        notificationUrl,
        specification: {
          options: {
            filters: {
              dataTypes: ["tableData"],
              recordChangeScope: tableId,
              watchFor: ["add", "update", "delete"]
            }
          }
        }
      }
    );

    const form = await Form.findOne({
      airtableBaseId: baseId,
      airtableTableId: tableId,
      ownerId: req.user._id
    });

    if (form) {
      form.webhookId = webhookRes.data.id;
      form.webhookSecret = webhookRes.data.macSecretBase64;
      form.webhookUrl = notificationUrl;
      form.webhookExpires = new Date(webhookRes.data.expirationTime);
      await form.save();
    }

    res.json({
      webhookId: webhookRes.data.id,
      macSecret: webhookRes.data.macSecretBase64,
      expires: webhookRes.data.expirationTime
    });
  } catch (error) {
    console.error('Webhook create error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});


module.exports = router;
const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const scope = 'data.records:read data.records:write schema.bases:read';
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const router = express.Router();

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


function generateCodeVerifier() {
    return generateRandomString(64);
}


function generateCodeChallenge(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// redirect to airtable for user authenitication
router.get('/auth/airtable', (req, res) => {
    console.log('=== OAUTH START ===');
    console.log('Client ID:', process.env.AIRTABLE_CLIENT_ID?.substring(0, 10) + '...');
    console.log('Redirect URI:', process.env.AIRTABLE_REDIRECT_URI);
    console.log('=== END ===');
    
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    const authUrl = new URL('https://airtable.com/oauth2/v1/authorize');
    authUrl.searchParams.append('client_id', process.env.AIRTABLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', process.env.AIRTABLE_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    
    console.log('Generated Airtable URL:', authUrl.toString());
    
    res.redirect(authUrl.toString());
});


//redirect to callback to exchange code for tokens
router.get('/airtable/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code not provided');
    }
    
    try {
        const credentials = Buffer.from(
            `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
        ).toString('base64');
        
        const tokenRes = await axios({
            method: 'post',
            url: 'https://airtable.com/oauth2/v1/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}` 
            },
            data: new URLSearchParams({
                grant_type: 'authorization_code',
                redirect_uri: process.env.AIRTABLE_REDIRECT_URI,
                code: code,
                code_verifier: req.session.codeVerifier
            }).toString()
        });

        const { access_token, refresh_token } = tokenRes.data;

        const userRes = await axios.get('https://api.airtable.com/v0/meta/bases', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const airtableUserId = userRes.data.bases[0]?.permissionLevel?.userID || 'unknown';

        let user = await User.findOne({ airtableUserId });
        if (!user) {
            user = new User({
                airtableUserId,
                email: `${airtableUserId}@airtable.user`,
                accessToken: access_token,
                refreshToken: refresh_token
            });
        } else {
            user.accessToken = access_token;
            if (refresh_token) user.refreshToken = refresh_token;
        }
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        );
        
        // ✅ USE ENVIRONMENT VARIABLE
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${FRONTEND_URL}/dashboard?token=${token}`);
        
    } catch (error) {
        console.error('OAuth error:', error.response?.data || error.message);
        res.status(500).send('Login failed');
    }
});
module.exports = router;



const axios = require('axios');
const Form = require('../models/Form');

const callAirtableAPI = async (user, method, url, data = null) => {
  try {
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${user.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) config.data = data;

    const response = await axios(config);
    return response;

  } catch (error) {
    console.error('Airtable API Error:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('Token expired, refreshing...');

      const credentials = Buffer.from(
        `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
      ).toString('base64');

      const tokenRes = await axios.post(
        'https://airtable.com/oauth2/v1/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: user.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        }
      );

      // Update user tokens
      user.accessToken = tokenRes.data.access_token;
      user.refreshToken = tokenRes.data.refresh_token;
      await user.save();

      console.log('✅ User tokens refreshed');

      // Also update any forms owned by this user
      try {
        await Form.updateMany(
          { ownerId: user._id },
          {
            ownerAccessToken: tokenRes.data.access_token,
            ownerRefreshToken: tokenRes.data.refresh_token
          }
        );
        console.log('✅ Form tokens updated');
      } catch (formError) {
        console.log('⚠️ Could not update form tokens:', formError.message);
      }

      console.log('Token refreshed, retrying API call...');

      const retryConfig = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) retryConfig.data = data;

      return await axios(retryConfig);
    }

    throw error;
  }
};

module.exports = { callAirtableAPI };
const axios = require('axios');
const User = require('../models/User');

const callAirtableAPI = async (user, method, url, data = null) => {
  try {
    
    const freshUser = await User.findById(user._id || user);
    
    if (!freshUser) {
      throw new Error('User not found');
    }

    console.log('🔍 Calling Airtable API:', method, url);
    console.log('🔍 Using token for user:', freshUser.email);
    
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${freshUser.accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    if (data) config.data = data;
    
    const response = await axios(config);
    console.log('✅ Airtable API success!');
    return response;
    
  } catch (error) {
    console.error('❌ Airtable API Error:', error.message);
    console.error('❌ Status:', error.response?.status);
    
    if (error.response?.status === 401) {
      console.log('🔄 Token expired, refreshing...');
      
      
      const freshUser = await User.findById(user._id || user);
      
      if (!freshUser || !freshUser.refreshToken) {
        throw new Error('Cannot refresh token - user or refresh token not found');
      }
      
      const credentials = Buffer.from(
        `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
      ).toString('base64');
      
      const tokenRes = await axios.post(
        'https://airtable.com/oauth2/v1/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: freshUser.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        }
      );
      
      // ✅ UPDATE AND SAVE NEW TOKENS
      freshUser.accessToken = tokenRes.data.access_token;
      freshUser.refreshToken = tokenRes.data.refresh_token;
      await freshUser.save();
      
      console.log('✅ Token refreshed and saved to DB!');
      
      
      const retryConfig = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${freshUser.accessToken}`,
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
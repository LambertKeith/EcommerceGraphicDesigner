const fetch = require('node-fetch');

async function getApiConfig() {
  try {
    const response = await fetch('http://localhost:3005/api/config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const configs = await response.json();
    console.log('Available configurations:', configs.length);
    
    const activeConfig = configs.find(c => c.is_active);
    if (!activeConfig) {
      throw new Error('No active configuration found');
    }
    
    return activeConfig;
  } catch (error) {
    console.error('Failed to get API config:', error);
    throw error;
  }
}

async function testGeminiAPI() {
  console.log('Testing Gemini API...');
  
  // 获取API配置
  const config = await getApiConfig();
  console.log('Using config:', config.name);
  console.log('Base URL:', config.base_url);
  console.log('Gemini model:', config.gemini_model);
  
  const payload = {
    model: config.gemini_model,
    stream: false,
    messages: [
      {
        role: "system",
        content: "You are an AI assistant specialized in image processing and editing for e-commerce."
      },
      {
        role: "user", 
        content: "Hello, can you process an image and return a base64 encoded result? Please respond with a simple test message first."
      }
    ]
  };

  try {
    const response = await fetch(config.base_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`, // This won't work from frontend due to security
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('=== API TEST RESPONSE ===');
    console.log(JSON.stringify(result, null, 2));
    
    const content = result.choices?.[0]?.message?.content;
    if (content) {
      console.log('=== MESSAGE CONTENT ===');
      console.log('Type:', typeof content);
      console.log('Content:', content);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGeminiAPI();
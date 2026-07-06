import axios from 'axios';

async function testCSRFLive() {
  const API_URL = 'https://email-dashboard-na98zfooy-maximgaming432-2591s-projects.vercel.app';
  
  console.log('🧪 TESTING CSRF ON LIVE PRODUCTION\n');
  console.log(`📍 Testing on: ${API_URL}\n`);

  try {
    // Step 1: GET request to get CSRF token
    console.log('1️⃣ Fetching CSRF token via GET /api/health...');
    const getResponse = await axios.get(`${API_URL}/api/health`);
    
    const csrfToken = getResponse.headers['x-csrf-token'];
    const sessionId = getResponse.headers['x-session-id'];

    if (csrfToken) {
      console.log(`   ✅ CSRF Token received: ${csrfToken.substring(0, 16)}...`);
    } else {
      console.log('   ⚠️ No CSRF token in headers, checking alternative...');
    }

    // Step 2: Try a POST without token (should fail)
    console.log('\n2️⃣ Testing POST without CSRF token (should fail)...');
    try {
      await axios.post(`${API_URL}/api/contacts/send-now`, {}, {
        headers: {
          'x-session-id': sessionId || 'test-session'
        }
      });
      console.log('   ⚠️ POST succeeded (unexpected - CSRF might be disabled)');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === 'CSRF_TOKEN_MISSING') {
        console.log('   ✅ Correctly rejected POST without token!');
      } else {
        console.log(`   ℹ️ POST rejected: ${err.response?.data?.error || err.message}`);
      }
    }

    // Step 3: Try POST with token (if we have one)
    if (csrfToken) {
      console.log('\n3️⃣ Testing POST with valid CSRF token...');
      try {
        await axios.post(`${API_URL}/api/contacts/send-now`, 
          { test: true },
          {
            headers: {
              'x-csrf-token': csrfToken,
              'x-session-id': sessionId || 'test-session',
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('   ℹ️ POST accepted (auth might be required, but CSRF passed!)');
      } catch (err) {
        if (err.response?.status === 401) {
          console.log('   ✅ CSRF passed! (Auth required, which is expected)');
        } else if (err.response?.status === 403 && err.response?.data?.code === 'CSRF_TOKEN_INVALID') {
          console.log('   ❌ CSRF token invalid!');
        } else {
          console.log(`   ℹ️ Response: ${err.response?.status} - ${err.response?.data?.error || err.message}`);
        }
      }
    }

    console.log('\n🎉 PRODUCTION CSRF TEST COMPLETE!\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCSRFLive();

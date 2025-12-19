// Simple test script to verify backend setup
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testBackend() {
  console.log('🧪 Testing WhatsApp Clone Backend...');
  console.log('===================================');

  try {
    // Test if backend is running
    console.log('1. Testing server connectivity...');
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      console.log('✅ Backend server is running and responding');
    } else {
      console.log('⚠️  Unexpected response:', response.status);
    }

    // Test user registration
    console.log('2. Testing user registration...');
    const registerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123'
    };

    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });

    if (registerResponse.ok) {
      const registerResult = await registerResponse.json();
      console.log('✅ User registration successful');
      console.log('   User ID:', registerResult.user.id);
      
      // Test login
      console.log('3. Testing user login...');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });

      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        console.log('✅ User login successful');
        console.log('   Token received:', loginResult.token.substring(0, 20) + '...');
        
        // Test authenticated endpoint
        console.log('4. Testing authenticated endpoint...');
        const meResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${loginResult.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (meResponse.ok) {
          const meResult = await meResponse.json();
          console.log('✅ Authenticated endpoint working');
          console.log('   Current user:', meResult.user.username);
        } else {
          console.log('❌ Authenticated endpoint failed');
        }
      } else {
        console.log('❌ User login failed');
      }
    } else {
      const error = await registerResponse.json();
      console.log('❌ User registration failed:', error.message);
    }

  } catch (error) {
    console.log('❌ Backend test failed:', error.message);
    console.log('');
    console.log('💡 Make sure the backend server is running:');
    console.log('   cd whatsapp-backend');
    console.log('   bun run dev');
  }

  console.log('');
  console.log('🎉 Backend test completed!');
}

// Run the test
testBackend();
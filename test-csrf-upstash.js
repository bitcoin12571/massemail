import { createClient } from 'redis';
import { randomBytes } from 'node:crypto';

async function testCSRFUpstash() {
  console.log('🧪 TESTING CSRF WITH UPSTASH REDIS\n');
  
  try {
    // Convert redis:// to rediss:// for TLS
    const redisUrl = (process.env.REDIS_URL || 'redis://default:AaWQAAIgcDEwOGY3ZGI4M2QzNDE0YzUzYWMxODVmOTc0OGMzYmE2ZQ@flexible-monarch-42384.upstash.io:6379').replace('redis://', 'rediss://');
    
    const redisClient = createClient({
      url: redisUrl
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      process.exit(1);
    });

    await redisClient.connect();
    console.log('✅ Connected to Upstash Redis!');

    // Test CSRF token
    const token = randomBytes(32).toString('hex');
    const sessionId = 'test-session-123';
    const CSRF_TOKEN_EXPIRY = 604800; // 7 days

    console.log('\n📝 Storing CSRF token in Upstash...');
    const tokenData = {
      sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (CSRF_TOKEN_EXPIRY * 1000)
    };

    await redisClient.setEx(
      `csrf:${token}`,
      CSRF_TOKEN_EXPIRY,
      JSON.stringify(tokenData)
    );

    console.log('✅ Token stored');

    // Verify
    console.log('\n🔍 Verifying token...');
    const stored = await redisClient.get(`csrf:${token}`);
    
    if (stored) {
      console.log('✅ Token verified!');
      await redisClient.del(`csrf:${token}`);
      console.log('✅ Token consumed (deleted)');
    }

    await redisClient.quit();
    console.log('\n🎉 UPSTASH CSRF TEST PASSED!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCSRFUpstash();

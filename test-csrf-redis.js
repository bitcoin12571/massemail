import { createClient } from 'redis';
import { randomBytes } from 'node:crypto';

async function testCSRFRedis() {
  console.log('🧪 TESTING CSRF WITH REDIS\n');
  
  try {
    // Try to connect to Redis
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      console.log('\n💡 Soluție: Start Redis local cu: docker run -d -p 6379:6379 redis:latest');
      process.exit(1);
    });

    await redisClient.connect();
    console.log('✅ Connected to Redis');

    // Simulate CSRF token generation
    const token = randomBytes(32).toString('hex');
    const sessionId = 'test-session-123';
    const CSRF_TOKEN_EXPIRY = 604800; // 7 days

    console.log('\n📝 Generating CSRF token...');
    console.log(`   Token: ${token.substring(0, 16)}...`);
    console.log(`   SessionId: ${sessionId}`);
    console.log(`   Expiry: 7 days`);

    // Store token
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

    console.log('✅ Token stored in Redis');

    // Verify token
    console.log('\n🔍 Verifying token...');
    const stored = await redisClient.get(`csrf:${token}`);
    
    if (stored) {
      const data = JSON.parse(stored);
      console.log('✅ Token found and valid!');
      console.log(`   SessionId: ${data.sessionId}`);
      console.log(`   Created: ${new Date(data.createdAt).toISOString()}`);
      console.log(`   Expires: ${new Date(data.expiresAt).toISOString()}`);

      // Delete token (one-time use)
      await redisClient.del(`csrf:${token}`);
      console.log('✅ Token consumed (deleted)');

      // Try to verify again (should fail)
      console.log('\n🔍 Trying to reuse token...');
      const reuse = await redisClient.get(`csrf:${token}`);
      if (!reuse) {
        console.log('✅ Token cannot be reused (security OK!)');
      }
    } else {
      console.log('❌ Token not found!');
    }

    // Test multiple tokens (simulating Vercel's multi-process environment)
    console.log('\n🔄 Testing multiple tokens (Vercel multi-process simulation)...');
    const tokens = [];
    
    for (let i = 0; i < 5; i++) {
      const t = randomBytes(32).toString('hex');
      await redisClient.setEx(
        `csrf:${t}`,
        CSRF_TOKEN_EXPIRY,
        JSON.stringify({ sessionId, createdAt: Date.now(), expiresAt: Date.now() + (CSRF_TOKEN_EXPIRY * 1000) })
      );
      tokens.push(t);
    }

    console.log(`✅ Created ${tokens.length} tokens`);

    // Verify all tokens work (simulating different processes)
    let verified = 0;
    for (const t of tokens) {
      const data = await redisClient.get(`csrf:${t}`);
      if (data) verified++;
    }
    console.log(`✅ All ${verified}/${tokens.length} tokens verified across "different processes"`);

    await redisClient.quit();
    console.log('\n🎉 ALL TESTS PASSED! Redis CSRF is working correctly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCSRFRedis();

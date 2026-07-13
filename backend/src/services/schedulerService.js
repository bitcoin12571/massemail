const schedule = require('node-schedule');
const Newsletter = require('../models/Newsletter');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const { sendNewsletter } = require('./emailService');

const activeSchedules = new Map();

async function sendScheduledNewsletter(userId) {
  try {
    console.log(`\n⏰ [${new Date().toISOString()}] Checking for scheduled newsletters for user: ${userId}`);

    // Find newsletter that's ready to send
    const newsletter = await Newsletter.findOne({
      createdBy: userId,
      status: 'scheduled',
      scheduledFor: { $lte: new Date() }
    });

    if (!newsletter) {
      console.log('   No newsletters to send');
      return;
    }

    console.log(`   📬 Found newsletter: "${newsletter.subject}"`);

    // Get all active subscribers
    const subscribers = await Subscriber.find({ isSubscribed: true });
    console.log(`   👥 Sending to ${subscribers.length} subscribers`);

    if (subscribers.length === 0) {
      console.warn('   ⚠️  No subscribers found');
      newsletter.status = 'failed';
      newsletter.failureReason = 'No active subscribers';
      await newsletter.save();
      return;
    }

    // Send newsletter
    const result = await sendNewsletter(newsletter, subscribers);
    console.log(`   ✅ Newsletter sent! (${result.sent} successful, ${result.failed} failed)`);
  } catch (error) {
    console.error('   ❌ Scheduler error:', error.message);
  }
}

function scheduleForUser(user) {
  // Kill previous schedule if exists
  if (activeSchedules.has(user._id.toString())) {
    const job = activeSchedules.get(user._id.toString());
    job.cancel();
    console.log(`   Cancelled previous schedule for ${user.email}`);
  }

  const [hours, minutes] = user.scheduleTime.split(':');
  const cronExpression = `${minutes} ${hours} * * *`; // Daily at HH:MM

  console.log(`   ⏰ Scheduling: ${user.scheduleTime} daily (${cronExpression})`);

  const job = schedule.scheduleJob(cronExpression, () => {
    sendScheduledNewsletter(user._id);
  });

  activeSchedules.set(user._id.toString(), job);
  console.log(`   ✅ Schedule registered for ${user.email}`);
}

async function initializeSchedulers() {
  try {
    console.log('\n🚀 Initializing schedulers for all users...');
    const users = await User.find({ isActive: true });
    console.log(`   Found ${users.length} active users`);

    for (const user of users) {
      scheduleForUser(user);
    }

    console.log('✅ All schedulers initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize schedulers:', error.message);
  }
}

function updateSchedule(user) {
  console.log(`\n📝 Updating schedule for ${user.email}`);
  scheduleForUser(user);
}

function getScheduleStatus() {
  return {
    activeSchedules: activeSchedules.size,
    schedules: Array.from(activeSchedules.entries()).map(([userId, job]) => ({
      userId,
      nextRun: job.nextInvocation()
    }))
  };
}

module.exports = {
  initializeSchedulers,
  updateSchedule,
  sendScheduledNewsletter,
  getScheduleStatus
};

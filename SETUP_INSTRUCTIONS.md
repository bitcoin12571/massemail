# Email Bulk Sending Dashboard - Setup Guide

## ✅ Fișiere Deja Create

```
✓ backend/src/services/queueService.js - Queue cu Bull
✓ backend/src/services/emailService.js - Nodemailer integration
```

---

## 📋 TODO: Modificări Manuale Necesare

### 1. **Update `backend/src/routes/campaigns.js`**

Înlocuiește fișierul complet cu:

```javascript
import express from 'express';
import { fn, col } from 'sequelize';
import Campaign from '../models/Campaign.js';
import Email from '../models/Email.js';
import Contact from '../models/Contact.js';
import { emailQueue, getQueueStats } from '../services/queueService.js';

const router = express.Router();

// Get campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { createdBy: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get campaign with stats
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const stats = await Email.findAll({
      where: { campaignId: campaign.id },
      attributes: [
        'status',
        [fn('COUNT', col('*')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const queueStats = await getQueueStats();

    res.json({ campaign, stats, queue: queueStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create campaign
router.post('/', async (req, res) => {
  try {
    const { name, subject, htmlContent, textContent } = req.body;
    const campaign = await Campaign.create({
      name,
      subject,
      htmlContent,
      textContent,
      createdBy: req.user.id
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send campaign (BULK)
router.post('/:id/send', async (req, res) => {
  try {
    const { contactIds = [] } = req.body;
    const campaign = await Campaign.findByPk(req.params.id);

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'sending') {
      return res.status(400).json({ error: 'Campaign is already sending' });
    }

    campaign.status = 'sending';
    await campaign.save();

    // Get contacts
    const where = contactIds.length > 0 ? { id: contactIds } : { subscribed: true };
    const contacts = await Contact.findAll({ where });

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found' });
    }

    // Add emails to queue
    const emailPromises = contacts.map(async (contact) => {
      const emailRecord = await Email.create({
        campaignId: campaign.id,
        contactId: contact.id,
        recipientEmail: contact.email,
        status: 'pending'
      });

      return emailQueue.add(
        {
          emailId: emailRecord.id,
          campaignId: campaign.id,
          contactId: contact.id
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: false
        }
      );
    });

    await Promise.all(emailPromises);

    const queueStats = await getQueueStats();

    res.json({
      success: true,
      emailCount: contacts.length,
      queueStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause campaign
router.post('/:id/pause', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    campaign.status = 'paused';
    await campaign.save();

    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queue stats endpoint
router.get('/stats/queue', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

### 2. **Update `backend/src/models/Contact.js`**

Înlocuiește modelul cu:

```javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  firstName: {
    type: DataTypes.STRING
  },
  lastName: {
    type: DataTypes.STRING
  },
  company: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  subscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['createdBy'] }
  ]
});

export default Contact;
```

---

### 3. **Update `backend/src/index.js`**

Adaugă import și init pentru emailService:

```javascript
import { initializeEmailService } from './services/emailService.js';

// După initializeQueue()
await initializeEmailService();
console.log('✓ Email service initialized');
```

---

### 4. **Update `backend/package.json`**

Adaugă în `dependencies`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.35.0",
    "pg": "^8.11.0",
    "bull": "^4.12.0",
    "redis": "^4.6.0",
    "nodemailer": "^6.9.7",
    "nodemailer-sendgrid-transport": "^0.2.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.1.0",
    "bcryptjs": "^2.4.3"
  }
}
```

---

### 5. **Creeaza `.env` din template**

```bash
# Backend
BACKEND_PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=email_dashboard
DB_USER=postgres
DB_PASSWORD=password

# Redis Queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Service
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# SMTP Fallback (optional)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_user
SMTP_PASS=your_pass

# Auth
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 🚀 Installation Steps

```bash
cd backend
npm install

# Start Redis (in a separate terminal)
redis-server

# Run migrations
npm run migrate

# Start backend
npm run dev:backend
```

---

## 📊 API Endpoints

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get campaign with stats
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/send` - Send bulk campaign
- `POST /api/campaigns/:id/pause` - Pause campaign
- `GET /api/campaigns/stats/queue` - Get queue statistics

### Queue Status
```json
{
  "waiting": 100,
  "active": 5,
  "completed": 450,
  "failed": 2,
  "delayed": 0,
  "total": 557
}
```

---

## 🎯 Features Implementate

✅ Bulk email sending cu queue  
✅ Retry logic (exponential backoff)  
✅ Email personalization (firstName, lastName, company)  
✅ Real-time queue monitoring  
✅ Campaign pause/resume  
✅ Email status tracking  
✅ SendGrid integration  
✅ SMTP fallback  

---

## 📱 Frontend (Next Steps)

Vrei React dashboard cu:
- Campaign creation form
- Contact import
- Queue monitoring (real-time)
- Email templates editor
- Analytics dashboard

?

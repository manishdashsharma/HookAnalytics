import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenvFlow from 'dotenv-flow';
import fs from 'fs';
import path from 'path';

const app = express();

dotenvFlow.config();

const PORT = process.env.PORT;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

console.log(PORT);

const logsDir = path.join(process.cwd(), 'webhook-logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`📁 Created logs directory: ${logsDir}`);
}

app.use('/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const verifySignature = (payload, signature) => {
  if (!signature) {
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  const actualSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(actualSignature, 'hex')
  );
};

const saveWebhookData = (eventType, payload, headers, deliveryId) => {
  try {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0]; 
    
    const webhookData = {
      timestamp,
      deliveryId,
      eventType,
      headers: {
        'x-github-event': headers['x-github-event'],
        'x-github-delivery': headers['x-github-delivery'],
        'x-hub-signature-256': headers['x-hub-signature-256'] ? 'present' : 'missing',
        'user-agent': headers['user-agent'],
        'content-type': headers['content-type']
      },
      payload
    };
    
    const fileName = `${timestamp.replace(/[:.]/g, '-')}_${eventType}_${deliveryId}.json`;
    const filePath = path.join(logsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(webhookData, null, 2));
    
    const dailyFileName = `summary_${date}.json`;
    const dailyFilePath = path.join(logsDir, dailyFileName);
    
    let dailySummary = [];
    if (fs.existsSync(dailyFilePath)) {
      const existingData = fs.readFileSync(dailyFilePath, 'utf8');
      dailySummary = JSON.parse(existingData);
    }
    
    dailySummary.push({
      timestamp,
      eventType,
      deliveryId,
      repository: payload.repository?.full_name || 'N/A',
      action: payload.action || 'N/A',
      actor: payload.sender?.login || payload.pusher?.name || 'N/A',
      fileName: fileName
    });
    
    fs.writeFileSync(dailyFilePath, JSON.stringify(dailySummary, null, 2));
    
    console.log(`💾 Saved webhook data: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Error saving webhook data:', error);
  }
};

const generateAnalytics = () => {
  try {
    const files = fs.readdirSync(logsDir).filter(file => file.endsWith('.json') && !file.startsWith('summary_') && !file.startsWith('analytics_'));
    
    const analytics = {
      totalWebhooks: files.length,
      eventTypes: {},
      repositories: {},
      actors: {},
      dailyActivity: {},
      generatedAt: new Date().toISOString()
    };
    
    files.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(logsDir, file), 'utf8'));
        const date = data.timestamp.split('T')[0];
        
        analytics.eventTypes[data.eventType] = (analytics.eventTypes[data.eventType] || 0) + 1;
        
        const repo = data.payload.repository?.full_name || 'unknown';
        analytics.repositories[repo] = (analytics.repositories[repo] || 0) + 1;
        
        const actor = data.payload.sender?.login || data.payload.pusher?.name || 'unknown';
        analytics.actors[actor] = (analytics.actors[actor] || 0) + 1;
        
        analytics.dailyActivity[date] = (analytics.dailyActivity[date] || 0) + 1;
        
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    });
    
    const analyticsFile = path.join(logsDir, `analytics_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(analyticsFile, JSON.stringify(analytics, null, 2));
    
    return analytics;
  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    return null;
  }
};

app.post('/webhook', (req, res) => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const event = req.get('X-GitHub-Event');
    const deliveryId = req.get('X-GitHub-Delivery');
    
    if (!verifySignature(req.body, signature)) {
      console.log('Invalid signature');
      return res.status(401).send('Unauthorized');
    }
    
    const payload = JSON.parse(req.body.toString());
    
    saveWebhookData(event, payload, req.headers, deliveryId);
    
    console.log(`\n🔔 GitHub Event Received:`);
    console.log(`Event Type: ${event}`);
    console.log(`Delivery ID: ${deliveryId}`);
    console.log(`Repository: ${payload.repository?.full_name || 'N/A'}`);
    
    switch (event) {
      case 'push':
        handlePushEvent(payload);
        break;
      case 'pull_request':
        handlePullRequestEvent(payload);
        break;
      case 'issues':
        handleIssuesEvent(payload);
        break;
      case 'issue_comment':
        handleIssueCommentEvent(payload);
        break;
      case 'release':
        handleReleaseEvent(payload);
        break;
      case 'star':
        handleStarEvent(payload);
        break;
      case 'fork':
        handleForkEvent(payload);
        break;
      case 'watch':
        handleWatchEvent(payload);
        break;
      case 'workflow_run':
        handleWorkflowRunEvent(payload);
        break;
      default:
        console.log(`📝 Unhandled event type: ${event}`);
        console.log('Payload:', JSON.stringify(payload, null, 2));
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

const handlePushEvent = (payload) => {
  console.log(`🚀 Push to ${payload.ref}`);
  console.log(`Commits: ${payload.commits?.length || 0}`);
  console.log(`Pusher: ${payload.pusher?.name}`);
  
  payload.commits?.forEach((commit, index) => {
    console.log(`  ${index + 1}. ${commit.message} (${commit.author.name})`);
  });
};

const handlePullRequestEvent = (payload) => {
  const pr = payload.pull_request;
  console.log(`🔀 Pull Request ${payload.action}: #${pr.number}`);
  console.log(`Title: ${pr.title}`);
  console.log(`Author: ${pr.user.login}`);
  console.log(`Base: ${pr.base.ref} ← Head: ${pr.head.ref}`);
};

const handleIssuesEvent = (payload) => {
  const issue = payload.issue;
  console.log(`🐛 Issue ${payload.action}: #${issue.number}`);
  console.log(`Title: ${issue.title}`);
  console.log(`Author: ${issue.user.login}`);
  console.log(`Labels: ${issue.labels.map(l => l.name).join(', ') || 'None'}`);
};

const handleIssueCommentEvent = (payload) => {
  console.log(`💬 Comment ${payload.action} on issue #${payload.issue.number}`);
  console.log(`Author: ${payload.comment.user.login}`);
  console.log(`Comment: ${payload.comment.body.substring(0, 100)}...`);
};

const handleReleaseEvent = (payload) => {
  const release = payload.release;
  console.log(`🎉 Release ${payload.action}: ${release.tag_name}`);
  console.log(`Name: ${release.name}`);
  console.log(`Author: ${release.author.login}`);
  console.log(`Prerelease: ${release.prerelease}`);
};

const handleStarEvent = (payload) => {
  console.log(`⭐ Repository ${payload.action === 'created' ? 'starred' : 'unstarred'}`);
  console.log(`User: ${payload.sender.login}`);
  console.log(`Total stars: ${payload.repository.stargazers_count}`);
};

const handleForkEvent = (payload) => {
  console.log(`🍴 Repository forked`);
  console.log(`User: ${payload.sender.login}`);
  console.log(`Fork: ${payload.forkee.full_name}`);
};

const handleWatchEvent = (payload) => {
  console.log(`👀 Repository watched`);
  console.log(`User: ${payload.sender.login}`);
  console.log(`Total watchers: ${payload.repository.watchers_count}`);
};

const handleWorkflowRunEvent = (payload) => {
  console.log(`⚡ Workflow ${payload.action}: ${payload.workflow_run.name}`);
  console.log(`Status: ${payload.workflow_run.status}`);
  console.log(`Conclusion: ${payload.workflow_run.conclusion || 'in_progress'}`);
  console.log(`Branch: ${payload.workflow_run.head_branch}`);
};

app.get('/analytics', (req, res) => {
  const analytics = generateAnalytics();
  if (analytics) {
    res.json(analytics);
  } else {
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

app.get('/webhooks', (req, res) => {
  try {
    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('summary_') && !file.startsWith('analytics_'))
      .sort()
      .reverse() 
      .slice(0, 50); 
    
    const webhooks = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(logsDir, file), 'utf8'));
      return {
        fileName: file,
        timestamp: data.timestamp,
        eventType: data.eventType,
        deliveryId: data.deliveryId,
        repository: data.payload.repository?.full_name || 'N/A'
      };
    });
    
    res.json({ 
      total: files.length,
      webhooks 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

app.get('/webhook/:fileName', (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(logsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Webhook file not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read webhook file' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'GitHub Webhook Server is running!',
    endpoints: {
      webhook: '/webhook',
      health: '/health',
      analytics: '/analytics',
      webhooks: '/webhooks',
      singleWebhook: '/webhook/:fileName'
    },
    logsDirectory: logsDir
  });
});

const onListen = () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`📊 Analytics endpoint: http://localhost:${PORT}/analytics`);
  console.log(`📋 Webhooks list: http://localhost:${PORT}/webhooks`);
  console.log(`📁 Logs saved to: ${logsDir}`);
  
  if (!WEBHOOK_SECRET || !PORT) {
    console.error('❗ Environment is not set. Please set it in your environment variables.');
  } else {
    console.log(`🔑 Webhook secret is set.`);
  }
};

app.listen(PORT, onListen);
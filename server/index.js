import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import dotenvFlow from "dotenv-flow";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

const app = express();
const server = createServer(app);

dotenvFlow.config();

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/github_webhooks";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("📦 Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const webhookEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  deliveryId: { type: String, required: true, unique: true },
  repository: {
    name: String,
    fullName: String,
    url: String,
    owner: String
  },
  sender: {
    login: String,
    avatarUrl: String,
    url: String
  },
  action: String,
  payload: mongoose.Schema.Types.Mixed,
  processedAt: { type: Date, default: Date.now },
  metadata: {
    branch: String,
    commitSha: String,
    commitMessage: String,
    pullRequestNumber: Number,
    issueNumber: Number,
    prTitle: String,
    prBody: String,
    mergeCommitMessage: String,
    commentBody: String,
    reviewState: String,
    reviewBody: String
  }
}, { timestamps: true });

const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  socket.on('requestRecentEvents', async () => {
    try {
      const recentEvents = await WebhookEvent.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      
      socket.emit('recentEvents', recentEvents);
    } catch (error) {
      console.error('Error fetching recent events:', error);
    }
  });
});

const verifySignature = (payload, signature) => {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  const actualSignature = signature.replace("sha256=", "");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(actualSignature, "hex")
  );
};

const extractMetadata = (eventType, payload) => {
  const metadata = {
    branch: null,
    commitSha: null,
    commitMessage: null,
    pullRequestNumber: null,
    issueNumber: null,
    prTitle: null,
    prBody: null,
    mergeCommitMessage: null,
    commentBody: null,
    reviewState: null,
    reviewBody: null
  };

  try {
    switch (eventType) {
      case 'push':
        metadata.branch = payload.ref?.replace('refs/heads/', '') || null;
        metadata.commitSha = payload.head_commit?.id || null;
        metadata.commitMessage = payload.head_commit?.message || null;
        break;
      
      case 'pull_request':
        metadata.pullRequestNumber = payload.pull_request?.number || null;
        metadata.branch = payload.pull_request?.head?.ref || null;
        metadata.commitSha = payload.pull_request?.head?.sha || null;
        metadata.prTitle = payload.pull_request?.title || null;
        metadata.prBody = payload.pull_request?.body || null;
        if (payload.action === 'closed' && payload.pull_request?.merged) {
          metadata.mergeCommitMessage = payload.pull_request?.merge_commit_sha || null;
        }
        break;
      
      case 'pull_request_review':
        metadata.pullRequestNumber = payload.pull_request?.number || null;
        metadata.reviewState = payload.review?.state || null;
        metadata.reviewBody = payload.review?.body || null;
        metadata.prTitle = payload.pull_request?.title || null;
        break;
      
      case 'pull_request_review_comment':
        metadata.pullRequestNumber = payload.pull_request?.number || null;
        metadata.commentBody = payload.comment?.body || null;
        metadata.prTitle = payload.pull_request?.title || null;
        break;
      
      case 'issue_comment':
        if (payload.issue?.pull_request) {
          metadata.pullRequestNumber = payload.issue?.number || null;
          metadata.prTitle = payload.issue?.title || null;
        } else {
          metadata.issueNumber = payload.issue?.number || null;
        }
        metadata.commentBody = payload.comment?.body || null;
        break;
      
      case 'issues':
        metadata.issueNumber = payload.issue?.number || null;
        break;
      
      case 'create':
      case 'delete':
        metadata.branch = payload.ref || null;
        break;
    }
  } catch (error) {
    console.error('Error extracting metadata:', error);
  }

  return metadata;
};

const formatEventForFrontend = (eventDoc) => {
  return {
    id: eventDoc._id,
    eventType: eventDoc.eventType,
    action: eventDoc.action,
    repository: eventDoc.repository,
    sender: eventDoc.sender,
    metadata: eventDoc.metadata,
    timestamp: eventDoc.createdAt,
    deliveryId: eventDoc.deliveryId
  };
};

app.post("/webhook", async (req, res) => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const event = req.get('X-GitHub-Event');
    const deliveryId = req.get('X-GitHub-Delivery');
    
    if (!verifySignature(req.body, signature)) {
      console.log('❌ Invalid signature');
      return res.status(401).send('Unauthorized');
    }
    
    const payload = JSON.parse(req.body.toString());

    console.log(`\n🔔 GitHub Event Received:`);
    console.log(`Event Type: ${event}`);
    console.log(`Delivery ID: ${deliveryId}`);
    console.log(`Repository: ${payload.repository?.full_name || 'N/A'}`);

    const eventData = {
      eventType: event,
      deliveryId: deliveryId,
      repository: {
        name: payload.repository?.name || 'Unknown',
        fullName: payload.repository?.full_name || 'Unknown',
        url: payload.repository?.html_url || '',
        owner: payload.repository?.owner?.login || 'Unknown'
      },
      sender: {
        login: payload.sender?.login || 'Unknown',
        avatarUrl: payload.sender?.avatar_url || '',
        url: payload.sender?.html_url || ''
      },
      action: payload.action || null,
      payload: payload,
      metadata: extractMetadata(event, payload)
    };

    try {
      const webhookEvent = new WebhookEvent(eventData);
      const savedEvent = await webhookEvent.save();
      
      console.log(`✅ Event saved to database with ID: ${savedEvent._id}`);
      
      const frontendData = formatEventForFrontend(savedEvent);
      
      io.emit('githubEvent', frontendData);
      
      console.log(`📡 Event broadcasted to ${io.engine.clientsCount} connected clients`);
      
    } catch (dbError) {
      if (dbError.code === 11000) {
        console.log(`⚠️  Duplicate delivery ID: ${deliveryId} - Event already processed`);
      } else {
        console.error("❌ Database error:", dbError);
      }
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const eventType = req.query.eventType;
    const repository = req.query.repository;

    const filter = {};
    if (eventType) filter.eventType = eventType;
    if (repository) filter['repository.fullName'] = repository;

    const events = await WebhookEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await WebhookEvent.countDocuments(filter);

    res.json({
      events: events.map(formatEventForFrontend),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/events/:id/details", async (req, res) => {
  try {
    const event = await WebhookEvent.findById(req.params.id).lean();
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const detailedInfo = {
      ...formatEventForFrontend(event),
      fullPayload: event.payload,
      detailedMetadata: {
        ...event.metadata,
        hasLongContent: {
          prBody: event.metadata?.prBody && event.metadata.prBody.length > 200,
          commentBody: event.metadata?.commentBody && event.metadata.commentBody.length > 200,
          reviewBody: event.metadata?.reviewBody && event.metadata.reviewBody.length > 200
        }
      }
    };
    
    res.json(detailedInfo);
  } catch (error) {
    console.error("Error fetching event details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/pr-analytics", async (req, res) => {
  try {
    const prEvents = await WebhookEvent.aggregate([
      { $match: { eventType: { $in: ['pull_request', 'pull_request_review', 'pull_request_review_comment'] } } },
      {
        $group: {
          _id: {
            prNumber: "$metadata.pullRequestNumber",
            repository: "$repository.fullName"
          },
          events: { $push: "$$ROOT" },
          eventCount: { $sum: 1 },
          lastActivity: { $max: "$createdAt" }
        }
      },
      { $sort: { lastActivity: -1 } },
      { $limit: 20 }
    ]);

    const commentStats = await WebhookEvent.aggregate([
      { $match: { "metadata.commentBody": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$eventType",
          count: { $sum: 1 },
          avgLength: { $avg: { $strLenCP: "$metadata.commentBody" } }
        }
      }
    ]);

    res.json({
      recentPRActivity: prEvents,
      commentStatistics: commentStats
    });
  } catch (error) {
    console.error("Error fetching PR analytics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const stats = await WebhookEvent.aggregate([
      {
        $group: {
          _id: "$eventType",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalEvents = await WebhookEvent.countDocuments();
    const recentEvents = await WebhookEvent.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      totalEvents,
      recentEvents,
      eventTypes: stats
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount,
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "GitHub Webhook Server with Socket.IO is running!",
    endpoints: {
      webhook: "/webhook",
      health: "/health",
      events: "/api/events",
      stats: "/api/stats",
      prAnalytics: "/api/pr-analytics"
    },
    connectedClients: io.engine.clientsCount
  });
});

const onListen = () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔌 Socket.IO server ready for connections`);
  console.log(`🌐 API endpoints available at http://localhost:${PORT}/api`);

  if (!WEBHOOK_SECRET || !PORT) {
    console.error(
      "❗ Environment variables not set. Please set PORT and WEBHOOK_SECRET."
    );
  } else {
    console.log(`🔑 Webhook secret is configured.`);
  }
};

server.listen(PORT, onListen);
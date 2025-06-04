import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import dotenvFlow from "dotenv-flow";

const app = express();

dotenvFlow.config();

const PORT = process.env.PORT;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

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

app.post("/webhook", (req, res) => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const event = req.get('X-GitHub-Event');
    const deliveryId = req.get('X-GitHub-Delivery');
    
    if (!verifySignature(req.body, signature)) {
      console.log('Invalid signature');
      return res.status(401).send('Unauthorized');
    }
    
    const payload = JSON.parse(req.body.toString());

    console.log(`\n🔔 GitHub Event Received:`);
    console.log(`Event Type: ${event}`);
    console.log(`Delivery ID: ${deliveryId}`);
    console.log(`Repository: ${payload.repository?.full_name || 'N/A'}`);

    console.log(`Payload:`, payload);
    
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({
    message: "GitHub Webhook Server is running!",
    endpoints: {
      webhook: "/webhook",
      health: "/health",
    },
  });
});

const onListen = () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);


  if (!WEBHOOK_SECRET || !PORT) {
    console.error(
      "❗ Environment variables not set. Please set PORT and WEBHOOK_SECRET."
    );
  } else {
    console.log(`🔑 Webhook secret is configured.`);
  }
  console.log(`------------------------------------------------------`);
};

app.listen(PORT, onListen);

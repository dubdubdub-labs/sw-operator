#!/usr/bin/env bun
import { createMorphVMProvider } from "@repo/morph-service";
import { 
  setupClaudeCredentials,
  setupMachineInfo,
  startClaudeSession,
  startClaudeSync,
  monitorProcesses
} from "@repo/claude-commands";
import { createLogger } from "@repo/logger";
import { createPKCEClient } from "@repo/claude-oauth";
import * as dotenv from "dotenv";

dotenv.config();

const logger = createLogger({ prefix: "claude-test" });

// Hardcoded Claude OAuth config
const CLAUDE_CLIENT_ID = "e4e84310-9e13-43d1-820f-d1ac1f4e424e";
const CLAUDE_CLIENT_SECRET = "sk-ant-oauth1-client-W2p1Aw-u8xgl8b0L42ufDGXFelTb3MkdmSZQJlZAy4i7TqEeSsmDJyGJUBu6FBpxBOO7QBXgJ8TE6yv3Ug0xKw-3HBL3wAA";

async function getAuthToken(): Promise<{ token: string; expiresAt: Date }> {
  logger.info("Starting OAuth flow...");
  
  const pkce = createPKCEClient({
    clientId: CLAUDE_CLIENT_ID,
    clientSecret: CLAUDE_CLIENT_SECRET,
    redirectUri: "http://localhost:3002/callback",
  });

  const authUrl = await pkce.getAuthorizationUrl({
    scope: "user:inference user:profile",
    state: "test-state",
  });

  console.log("\n🔗 Please visit this URL to authorize:");
  console.log(authUrl);
  console.log("\n📋 After authorization, paste the full callback URL here:");
  
  const prompt = require("prompt-sync")();
  const callbackUrl = prompt("Callback URL: ");
  
  if (!callbackUrl) {
    throw new Error("No callback URL provided");
  }

  const tokens = await pkce.exchangeCodeForTokens(callbackUrl);
  
  return {
    token: tokens.accessToken,
    expiresAt: new Date(Date.now() + tokens.expiresIn * 1000)
  };
}

async function main() {
  try {
    // Check required env vars
    if (!process.env.MORPH_API_KEY) {
      throw new Error("MORPH_API_KEY not set in .env");
    }
    if (!process.env.SNAPSHOT_ID) {
      throw new Error("SNAPSHOT_ID not set in .env");
    }

    logger.info("Creating MorphVM provider...");
    const vm = createMorphVMProvider({
      apiKey: process.env.MORPH_API_KEY,
      logger: logger.child({ prefix: "MorphVM" })
    });

    // Get OAuth token
    const auth = await getAuthToken();
    logger.info("OAuth token obtained, expires at: " + auth.expiresAt.toISOString());

    // Boot instance
    logger.info("Booting instance from snapshot: " + process.env.SNAPSHOT_ID);
    const instance = await vm.instances.boot(process.env.SNAPSHOT_ID, {
      ttl_seconds: 600, // 10 minutes for testing
      ttl_action: "stop"
    });
    logger.info("Instance booted: " + instance.id);

    // Setup credentials (1 network call)
    logger.info("Setting up Claude credentials...");
    await setupClaudeCredentials(vm, instance.id, {
      authToken: auth.token,
      expiresAt: auth.expiresAt
    });
    logger.info("✅ Credentials configured");

    // Setup machine info (1 network call)
    logger.info("Setting up machine info...");
    await setupMachineInfo(vm, instance.id, `test-${Date.now()}`, instance.id);
    logger.info("✅ Machine info configured");

    // Start Claude sync if iteration ID provided
    if (process.env.ITERATION_ID) {
      logger.info("Starting Claude sync with iteration: " + process.env.ITERATION_ID);
      await startClaudeSync(vm, instance.id, process.env.ITERATION_ID);
      logger.info("✅ Claude sync started");
    }

    // Start a test Claude session
    logger.info("Starting Claude session...");
    await startClaudeSession(vm, instance.id, {
      sessionName: "test-session",
      prompt: "Hello! Can you see this message? Please respond with 'Yes, I can see your message' if you're working.",
      systemPrompt: "You are a helpful assistant testing the VM integration.",
      model: "sonnet"
    });
    logger.info("✅ Claude session started");

    // Monitor processes
    logger.info("Checking PM2 processes...");
    const status = await monitorProcesses(vm, instance.id);
    console.log("\n📊 Process Status:");
    console.log(JSON.stringify(status.processes, null, 2));

    // Wait a bit for Claude to respond
    logger.info("Waiting 5 seconds for Claude to process...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check logs
    const logsStatus = await monitorProcesses(vm, instance.id, "cc-test-session");
    if (logsStatus.logs) {
      console.log("\n📝 Claude Logs:");
      console.log(logsStatus.logs);
    }

    // Offer to keep instance running or stop it
    console.log("\n✨ Test completed successfully!");
    console.log(`Instance ID: ${instance.id}`);
    console.log("\nOptions:");
    console.log("1. Keep instance running (you can SSH or continue testing)");
    console.log("2. Stop instance now");
    
    const prompt = require("prompt-sync")();
    const choice = prompt("Choice (1 or 2): ");
    
    if (choice === "2") {
      logger.info("Stopping instance...");
      await vm.instances.stop(instance.id);
      logger.info("Instance stopped");
    } else {
      console.log(`\n Instance ${instance.id} is still running.`);
      console.log("Remember to stop it when done to avoid charges!");
    }

  } catch (error) {
    logger.error("Test failed: " + (error as Error).message);
    process.exit(1);
  }
}

main();
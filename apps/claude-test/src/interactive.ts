#!/usr/bin/env bun
import { createMorphVMProvider } from "@repo/morph-service";
import { 
  setupClaudeCredentials,
  setupMachineInfo,
  startClaudeSession,
  bootAndSetupClaudeVM
} from "@repo/claude-commands";
import { createLogger } from "@repo/logger";
import { createPKCEClient } from "@repo/claude-oauth";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

const logger = createLogger({ prefix: "interactive" });

// Hardcoded Claude OAuth config
const CLAUDE_CLIENT_ID = "e4e84310-9e13-43d1-820f-d1ac1f4e424e";
const CLAUDE_CLIENT_SECRET = "sk-ant-oauth1-client-W2p1Aw-u8xgl8b0L42ufDGXFelTb3MkdmSZQJlZAy4i7TqEeSsmDJyGJUBu6FBpxBOO7QBXgJ8TE6yv3Ug0xKw-3HBL3wAA";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function getAuthToken(): Promise<{ token: string; expiresAt: Date }> {
  logger.info("Starting OAuth flow...");
  
  const pkce = createPKCEClient({
    clientId: CLAUDE_CLIENT_ID,
    clientSecret: CLAUDE_CLIENT_SECRET,
    redirectUri: "http://localhost:3002/callback",
  });

  const authUrl = await pkce.getAuthorizationUrl({
    scope: "user:inference user:profile",
    state: "interactive-test",
  });

  console.log("\n🔗 Please visit this URL to authorize:");
  console.log(authUrl);
  console.log("\n📋 After authorization, paste the full callback URL here:");
  
  const callbackUrl = await prompt("Callback URL: ");
  
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
    logger.info("OAuth token obtained");

    // Interactive menu
    let instanceId: string | null = null;
    
    while (true) {
      console.log("\n📌 Interactive Claude Test Menu");
      console.log("================================");
      if (instanceId) {
        console.log(`✅ Instance: ${instanceId}`);
      } else {
        console.log("❌ No instance running");
      }
      console.log("\n1. Boot new instance");
      console.log("2. Start Claude session");
      console.log("3. Check process status");
      console.log("4. View Claude logs");
      console.log("5. Execute custom command");
      console.log("6. Test atomic file write");
      console.log("7. Stop instance");
      console.log("8. Exit");
      
      const choice = await prompt("\nChoice: ");
      
      switch (choice) {
        case "1": {
          if (instanceId) {
            const confirm = await prompt("Instance already running. Boot new one? (y/n): ");
            if (confirm !== "y") break;
            await vm.instances.stop(instanceId);
          }
          
          logger.info("Booting instance...");
          instanceId = await bootAndSetupClaudeVM(vm, process.env.SNAPSHOT_ID, {
            taskId: `interactive-${Date.now()}`,
            authToken: auth.token,
            expiresAt: auth.expiresAt,
            ttl_seconds: 1800 // 30 minutes
          });
          logger.info("Instance booted: " + instanceId);
          break;
        }
        
        case "2": {
          if (!instanceId) {
            console.log("❌ No instance running. Boot one first!");
            break;
          }
          
          const sessionName = await prompt("Session name: ");
          const userPrompt = await prompt("Your prompt: ");
          const systemPrompt = await prompt("System prompt (or press Enter for default): ") || 
            "You are a helpful assistant.";
          
          logger.info("Starting Claude session...");
          await startClaudeSession(vm, instanceId, {
            sessionName,
            prompt: userPrompt,
            systemPrompt,
            model: "sonnet"
          });
          logger.info("Session started");
          break;
        }
        
        case "3": {
          if (!instanceId) {
            console.log("❌ No instance running");
            break;
          }
          
          const processes = await vm.processes.list(instanceId);
          console.log("\n📊 Processes:");
          console.table(processes.map(p => ({
            name: p.name,
            status: p.status,
            cpu: `${p.cpu}%`,
            memory: `${Math.round(p.memory / 1024 / 1024)}MB`,
            restarts: p.restart_time
          })));
          break;
        }
        
        case "4": {
          if (!instanceId) {
            console.log("❌ No instance running");
            break;
          }
          
          const processName = await prompt("Process name (or Enter for all): ");
          const logs = await vm.processes.logs(instanceId, processName || undefined, 50);
          console.log("\n📝 Logs:");
          if (logs.out) {
            console.log("STDOUT:", logs.out);
          }
          if (logs.err) {
            console.log("STDERR:", logs.err);
          }
          break;
        }
        
        case "5": {
          if (!instanceId) {
            console.log("❌ No instance running");
            break;
          }
          
          const command = await prompt("Command to execute: ");
          const args = (await prompt("Arguments (space-separated): ")).split(" ").filter(Boolean);
          
          logger.info("Executing command...");
          const result = await vm.instances.exec(instanceId, [command, ...args]);
          console.log("\nExit code:", result.exit_code);
          console.log("STDOUT:", result.stdout);
          if (result.stderr) {
            console.log("STDERR:", result.stderr);
          }
          break;
        }
        
        case "6": {
          if (!instanceId) {
            console.log("❌ No instance running");
            break;
          }
          
          const path = await prompt("File path: ");
          const content = await prompt("Content: ");
          const mode = await prompt("Permissions (e.g., 644): ");
          
          logger.info("Writing file atomically...");
          await vm.files.writeFileAtomic(instanceId, path, content, {
            createDirs: true,
            mode: mode || "644"
          });
          logger.info("File written successfully");
          
          // Verify
          const verifyContent = await vm.files.readFile(instanceId, path);
          console.log("Verified content:", verifyContent);
          break;
        }
        
        case "7": {
          if (!instanceId) {
            console.log("❌ No instance running");
            break;
          }
          
          logger.info("Stopping instance...");
          await vm.instances.stop(instanceId);
          instanceId = null;
          logger.info("Instance stopped");
          break;
        }
        
        case "8": {
          if (instanceId) {
            const confirm = await prompt("Stop instance before exiting? (y/n): ");
            if (confirm === "y") {
              await vm.instances.stop(instanceId);
            }
          }
          rl.close();
          process.exit(0);
        }
        
        default:
          console.log("Invalid choice");
      }
    }
  } catch (error) {
    logger.error("Error: " + (error as Error).message);
    rl.close();
    process.exit(1);
  }
}

main();
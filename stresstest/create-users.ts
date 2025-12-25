/**
 * Stress Test: Create Dummy Users
 *
 * Usage: bun run create-users.ts
 *
 * This script creates dummy users for stress testing.
 * It prompts for:
 * - Number of users to create
 * - Role (STUDENT or TEACHER)
 */

import * as readline from "readline";

const API_BASE_URL = process.env.API_URL || "http://localhost:8600/api";

interface CreateUserResult {
  success: boolean;
  email: string;
  id?: string;
  error?: string;
}

interface UserData {
  email: string;
  password: string;
  name: string;
  role: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: {
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    accessToken?: string;
    refreshToken?: string;
  };
}

async function createUser(userData: UserData): Promise<CreateUserResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = (await response.json()) as RegisterResponse;

    if (response.ok && data.success) {
      return {
        success: true,
        email: userData.email,
        id: data.data?.user?.id,
      };
    } else {
      return {
        success: false,
        email: userData.email,
        error: data.message || "Unknown error",
      };
    }
  } catch (error) {
    return {
      success: false,
      email: userData.email,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function generateRandomEmail(index: number, role: string): string {
  const timestamp = Date.now();
  return `stresstest_${role.toLowerCase()}_${index}_${timestamp}@test.com`;
}

function generateRandomName(index: number, role: string): string {
  const firstNames = ["John", "Jane", "Alex", "Sam", "Chris", "Pat", "Taylor", "Morgan", "Casey", "Jordan"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];

  return `${firstName} ${lastName} (${role} ${index + 1})`;
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║        STRESS TEST - CREATE DUMMY USERS           ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  // Get number of users
  const countInput = await promptUser("Enter the number of users to create: ");
  const count = parseInt(countInput, 10);

  if (isNaN(count) || count <= 0) {
    console.error("❌ Invalid count. Please enter a positive number.");
    process.exit(1);
  }

  // Get role
  const roleInput = await promptUser("Enter user role (STUDENT/TEACHER): ");
  const role = roleInput.toUpperCase();

  if (!["STUDENT", "TEACHER"].includes(role)) {
    console.error("❌ Invalid role. Please enter STUDENT or TEACHER.");
    process.exit(1);
  }

  console.log(`\n🚀 Creating ${count} ${role} users...\n`);

  const results: CreateUserResult[] = [];
  const batchSize = 10; // Process in batches to avoid overwhelming the server
  const startTime = Date.now();

  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const batchEnd = Math.min(i + batchSize, count);

    for (let j = i; j < batchEnd; j++) {
      const userData: UserData = {
        email: generateRandomEmail(j, role),
        password: "stresstest123",
        name: generateRandomName(j, role),
        role: role,
      };
      batch.push(createUser(userData));
    }

    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    const successCount = batchResults.filter((r) => r.success).length;
    const failCount = batchResults.filter((r) => !r.success).length;

    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ✅ ${successCount} success, ❌ ${failCount} failed`);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Summary
  const successfulUsers = results.filter((r) => r.success);
  const failedUsers = results.filter((r) => !r.success);

  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║                    SUMMARY                        ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log(`   Total requested: ${count}`);
  console.log(`   ✅ Successfully created: ${successfulUsers.length}`);
  console.log(`   ❌ Failed: ${failedUsers.length}`);
  console.log(`   ⏱️  Time taken: ${duration}s`);

  if (failedUsers.length > 0 && failedUsers.length <= 10) {
    console.log("\n   Failed users:");
    failedUsers.forEach((u) => {
      console.log(`     - ${u.email}: ${u.error}`);
    });
  }

  // Save created users to a JSON file for later use
  if (successfulUsers.length > 0) {
    const outputFile = `created_users_${role.toLowerCase()}_${Date.now()}.json`;
    const outputData = {
      role,
      count: successfulUsers.length,
      defaultPassword: "stresstest123",
      users: successfulUsers.map((u) => ({
        email: u.email,
        id: u.id,
      })),
    };

    await Bun.write(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`\n   📁 User data saved to: ${outputFile}`);
  }

  console.log("\n✅ Done!\n");
}

main().catch(console.error);

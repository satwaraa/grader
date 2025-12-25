/**
 * Stress Test: Create Assignment
 *
 * Usage: bun run create-assignment.ts
 *
 * This script creates an assignment for stress testing.
 * It prompts for:
 * - Teacher email (to login)
 * - Teacher password
 * - Assignment title
 * - Assignment description
 * - Max score
 * - Rubric ID (optional)
 */

import * as readline from "readline";

const API_BASE_URL = process.env.API_URL || "http://localhost:8600/api";

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

interface AssignmentResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    title: string;
    description?: string;
    maxScore: number;
    otp: string;
    teacherId: string;
    createdAt: string;
  };
}

async function promptUser(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const displayQuestion = defaultValue
    ? `${question} (default: ${defaultValue}): `
    : `${question}: `;

  return new Promise((resolve) => {
    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    return (await response.json()) as LoginResponse;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Login failed",
    };
  }
}

async function createAssignment(
  token: string,
  data: {
    title: string;
    description?: string;
    maxScore: number;
    rubricId?: string;
  }
): Promise<AssignmentResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    return (await response.json()) as AssignmentResponse;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create assignment",
    };
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║        STRESS TEST - CREATE ASSIGNMENT            ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  // Login credentials
  const email = await promptUser("Enter teacher email");
  const password = await promptUser("Enter teacher password");

  if (!email || !password) {
    console.error("❌ Email and password are required.");
    process.exit(1);
  }

  console.log("\n🔐 Logging in...");
  const loginResult = await login(email, password);

  if (!loginResult.success || !loginResult.data) {
    console.error(`❌ Login failed: ${loginResult.message}`);
    process.exit(1);
  }

  console.log(`✅ Logged in as: ${loginResult.data.user.name} (${loginResult.data.user.role})\n`);

  if (loginResult.data.user.role !== "TEACHER") {
    console.error("❌ Only teachers can create assignments.");
    process.exit(1);
  }

  // Assignment details
  const title = await promptUser("Enter assignment title", "Stress Test Assignment");
  const description = await promptUser("Enter assignment description (optional)", "This is a stress test assignment");
  const maxScoreInput = await promptUser("Enter max score", "100");
  const rubricId = await promptUser("Enter rubric ID (optional, press Enter to skip)");

  const maxScore = parseInt(maxScoreInput, 10) || 100;

  console.log("\n📝 Creating assignment...");

  const assignmentResult = await createAssignment(loginResult.data.accessToken, {
    title,
    description: description || undefined,
    maxScore,
    rubricId: rubricId || undefined,
  });

  if (!assignmentResult.success || !assignmentResult.data) {
    console.error(`❌ Failed to create assignment: ${assignmentResult.message}`);
    process.exit(1);
  }

  const assignment = assignmentResult.data;

  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║            ASSIGNMENT CREATED! 🎉                 ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log(`   📌 ID: ${assignment.id}`);
  console.log(`   📌 Title: ${assignment.title}`);
  console.log(`   📌 Max Score: ${assignment.maxScore}`);
  console.log(`   🔑 OTP: ${assignment.otp}`);
  console.log(`   📅 Created: ${assignment.createdAt}`);

  // Save assignment data for later use
  const outputFile = `assignment_${assignment.id}.json`;
  await Bun.write(
    outputFile,
    JSON.stringify(
      {
        id: assignment.id,
        title: assignment.title,
        otp: assignment.otp,
        maxScore: assignment.maxScore,
        teacherId: assignment.teacherId,
        createdAt: assignment.createdAt,
      },
      null,
      2
    )
  );

  console.log(`\n   📁 Assignment data saved to: ${outputFile}`);
  console.log("\n   Use this assignment ID for creating submissions.\n");
  console.log("✅ Done!\n");
}

main().catch(console.error);

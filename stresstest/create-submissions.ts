/**
 * Stress Test: Create Submissions
 *
 * Usage: bun run create-submissions.ts
 *
 * This script creates multiple submissions for an assignment.
 * It prompts for:
 * - Assignment ID
 * - Assignment OTP
 * - Document path (local file to upload)
 * - Number of submissions to create
 * - Path to users JSON file (created by create-users.ts)
 *
 * The script will:
 * 1. Login as each student from the users file
 * 2. Verify assignment OTP
 * 3. Get presigned URL for file upload
 * 4. Upload the document
 * 5. Create the submission
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const API_BASE_URL = process.env.API_URL || "http://localhost:8600/api";

interface UserInfo {
  email: string;
  id?: string;
}

interface UsersFile {
  role: string;
  count: number;
  defaultPassword: string;
  users: UserInfo[];
}

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

interface UploadUrlResponse {
  url: string;
  key: string;
}

interface SubmissionResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    studentId: string;
    assignmentId: string;
    status: string;
    submittedAt: string;
  };
}

interface SubmissionResult {
  success: boolean;
  userEmail: string;
  submissionId?: string;
  error?: string;
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

interface OtpVerifyResponse {
  message: string;
}

async function verifyOtp(token: string, assignmentId: string, otp: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/submissions/verifyAssignmentOtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assignmentId, otp }),
    });

    const data = (await response.json()) as OtpVerifyResponse;
    return data.message === "verified";
  } catch {
    return false;
  }
}

async function getUploadUrl(
  token: string,
  fileName: string,
  fileType: string,
  assignmentId: string
): Promise<UploadUrlResponse | null> {
  try {
    const params = new URLSearchParams({
      fileName,
      type: fileType,
      assignmentId,
    });

    const response = await fetch(`${API_BASE_URL}/submissions/uploadUrl?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return (await response.json()) as UploadUrlResponse;
    }
    return null;
  } catch {
    return null;
  }
}

async function uploadFile(presignedUrl: string, fileBuffer: Buffer, contentType: string): Promise<boolean> {
  try {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: fileBuffer,
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function createSubmission(
  token: string,
  assignmentId: string
): Promise<{ success: boolean; id?: string; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assignmentId }),
    });

    const data = (await response.json()) as SubmissionResponse;

    if (data.success && data.data) {
      return { success: true, id: data.data.id };
    }

    return { success: false, message: data.message || "Unknown error" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function processSubmission(
  user: UserInfo,
  password: string,
  assignmentId: string,
  otp: string,
  filePath: string,
  fileBuffer: Buffer,
  fileType: string
): Promise<SubmissionResult> {
  // Step 1: Login
  const loginResult = await login(user.email, password);
  if (!loginResult.success || !loginResult.data) {
    return {
      success: false,
      userEmail: user.email,
      error: `Login failed: ${loginResult.message}`,
    };
  }

  const token = loginResult.data.accessToken;

  // Step 2: Verify OTP
  const otpValid = await verifyOtp(token, assignmentId, otp);
  if (!otpValid) {
    return {
      success: false,
      userEmail: user.email,
      error: "OTP verification failed",
    };
  }

  // Step 3: Get presigned URL
  const fileName = path.basename(filePath);
  const uploadData = await getUploadUrl(token, fileName, fileType, assignmentId);
  if (!uploadData) {
    return {
      success: false,
      userEmail: user.email,
      error: "Failed to get upload URL",
    };
  }

  // Step 4: Upload file
  const uploaded = await uploadFile(uploadData.url, fileBuffer, fileType);
  if (!uploaded) {
    return {
      success: false,
      userEmail: user.email,
      error: "File upload failed",
    };
  }

  // Step 5: Create submission
  const submission = await createSubmission(token, assignmentId);
  if (!submission.success) {
    return {
      success: false,
      userEmail: user.email,
      error: `Submission failed: ${submission.message}`,
    };
  }

  return {
    success: true,
    userEmail: user.email,
    submissionId: submission.id,
  };
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║        STRESS TEST - CREATE SUBMISSIONS           ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  // Get inputs
  const assignmentId = await promptUser("Enter assignment ID");
  const otp = await promptUser("Enter assignment OTP");
  const documentPath = await promptUser("Enter document path (local file)");
  const submissionCount = await promptUser("Enter number of submissions to create");
  const usersFilePath = await promptUser("Enter path to users JSON file (from create-users.ts)");

  // Validate inputs
  if (!assignmentId || !otp || !documentPath || !submissionCount || !usersFilePath) {
    console.error("❌ All inputs are required.");
    process.exit(1);
  }

  const count = parseInt(submissionCount, 10);
  if (isNaN(count) || count <= 0) {
    console.error("❌ Invalid submission count.");
    process.exit(1);
  }

  // Read document file
  if (!fs.existsSync(documentPath)) {
    console.error(`❌ Document file not found: ${documentPath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(documentPath);
  const fileType = getContentType(documentPath);
  console.log(`📄 Document: ${path.basename(documentPath)} (${fileType})`);

  // Read users file
  if (!fs.existsSync(usersFilePath)) {
    console.error(`❌ Users file not found: ${usersFilePath}`);
    process.exit(1);
  }

  const usersData: UsersFile = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));

  if (usersData.role !== "STUDENT") {
    console.error("❌ Users file must contain STUDENT users.");
    process.exit(1);
  }

  if (usersData.users.length < count) {
    console.error(`❌ Not enough users. File has ${usersData.users.length} users but ${count} submissions requested.`);
    process.exit(1);
  }

  console.log(`\n👥 Using ${count} students from: ${usersFilePath}`);
  console.log(`🚀 Creating ${count} submissions...\n`);

  const results: SubmissionResult[] = [];
  const batchSize = 5; // Smaller batches for submissions (more complex operations)
  const startTime = Date.now();
  const password = usersData.defaultPassword;

  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const batchEnd = Math.min(i + batchSize, count);

    for (let j = i; j < batchEnd; j++) {
      const user = usersData.users[j];
      if (user) {
        batch.push(
          processSubmission(
            user,
            password,
            assignmentId,
            otp,
            documentPath,
            fileBuffer,
            fileType
          )
        );
      }
    }

    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    const successCount = batchResults.filter((r) => r.success).length;
    const failCount = batchResults.filter((r) => !r.success).length;

    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: ✅ ${successCount} success, ❌ ${failCount} failed`);

    // Add a small delay between batches to avoid overwhelming the server
    if (i + batchSize < count) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Summary
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║                    SUMMARY                        ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log(`   Total requested: ${count}`);
  console.log(`   ✅ Successful: ${successful.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   ⏱️  Time taken: ${duration}s`);
  console.log(`   📊 Rate: ${(successful.length / (parseFloat(duration) || 1)).toFixed(2)} submissions/sec`);

  if (failed.length > 0 && failed.length <= 10) {
    console.log("\n   Failed submissions:");
    failed.forEach((s) => {
      console.log(`     - ${s.userEmail}: ${s.error}`);
    });
  } else if (failed.length > 10) {
    console.log(`\n   First 10 failed submissions:`);
    failed.slice(0, 10).forEach((s) => {
      console.log(`     - ${s.userEmail}: ${s.error}`);
    });
  }

  // Save results
  const outputFile = `submissions_${assignmentId}_${Date.now()}.json`;
  await Bun.write(
    outputFile,
    JSON.stringify(
      {
        assignmentId,
        total: count,
        successful: successful.length,
        failed: failed.length,
        duration: `${duration}s`,
        submissions: successful.map((s) => ({
          userEmail: s.userEmail,
          submissionId: s.submissionId,
        })),
        errors: failed.map((s) => ({
          userEmail: s.userEmail,
          error: s.error,
        })),
      },
      null,
      2
    )
  );

  console.log(`\n   📁 Results saved to: ${outputFile}`);
  console.log("\n✅ Done!\n");
}

main().catch(console.error);

# Stress Test Scripts

This directory contains scripts for stress testing the assignment grading system.

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Backend API running at `http://localhost:8600`

## Scripts

### 1. Create Dummy Users (`create-users.ts`)

Creates multiple dummy users for stress testing.

```bash
bun run create-users.ts
```

**Prompts:**
- Number of users to create
- Role (STUDENT or TEACHER)

**Output:** JSON file with created user emails and IDs.

---

### 2. Create Assignment (`create-assignment.ts`)

Creates a new assignment (requires teacher account).

```bash
bun run create-assignment.ts
```

**Prompts:**
- Teacher email & password
- Assignment title, description, max score
- Rubric ID (optional)

**Output:** JSON file with assignment ID and OTP.

---

### 3. Create Submissions (`create-submissions.ts`)

Creates multiple submissions from different student accounts.

```bash
bun run create-submissions.ts
```

**Prompts:**
- Assignment ID
- Assignment OTP
- Document path (local file to upload)
- Number of submissions
- Path to users JSON file (from `create-users.ts`)

**Output:** JSON file with submission results.

---

## Workflow for Stress Testing

```bash
# Step 1: Create a teacher account (or use existing)
bun run create-users.ts
# Enter: 1 user, TEACHER role

# Step 2: Create multiple student accounts
bun run create-users.ts
# Enter: 300 users, STUDENT role

# Step 3: Login as teacher and create assignment
bun run create-assignment.ts

# Step 4: Create submissions from students
bun run create-submissions.ts
# Use the assignment ID, OTP, and student users file
```

## Environment Variables

- `API_URL` - Override the default API URL (default: `http://localhost:8600/api`)

```bash
API_URL=http://your-server:8600/api bun run create-submissions.ts
```

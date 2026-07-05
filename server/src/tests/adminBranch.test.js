import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Branch } from "../models/Branch.js";
import { StaffProfile } from "../models/StaffProfile.js";
import { User } from "../models/User.js";
import { issueAuthToken } from "../services/token.service.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(testDir, "../../.cache/mongodb-binaries");

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function authHeaderFor(user) {
  const session = await issueAuthToken(user._id);
  return `Token ${session.plainToken}`;
}

describe("Branch management", () => {
  let server;
  let baseUrl;
  let adminUser;
  let staffUser;
  let otherStaffUser;
  let adminAuth;
  let staffAuth;

  before(async () => {
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await close(server);
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Promise.all([StaffProfile.deleteMany({}), Branch.deleteMany({}), User.deleteMany({})]);

    adminUser = await User.create({
      email: "admin.branch@test.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Branch Admin",
      isActive: true,
      isEmailVerified: true,
    });

    staffUser = await User.create({
      email: "manager.branch@test.com",
      passwordHash: "hash",
      role: "staff",
      fullName: "Branch Manager",
      isActive: true,
      isEmailVerified: true,
    });

    otherStaffUser = await User.create({
      email: "staff.branch@test.com",
      passwordHash: "hash",
      role: "staff",
      fullName: "Other Staff",
      isActive: true,
      isEmailVerified: true,
    });

    adminAuth = await authHeaderFor(adminUser);
    staffAuth = await authHeaderFor(staffUser);
  });

  test("admin creates branch and assigns branch manager", async () => {
    const createRes = await fetch(`${baseUrl}/api/admin/branches`, {
      method: "POST",
      headers: { Authorization: adminAuth, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "OrcaX Care Test Branch",
        address: "1 Test Street",
        phone: "028-1111-1111",
        workingHours: "Mon–Fri 8:00–17:00",
        lat: 10.77,
        lng: 106.7,
        managerUserId: staffUser._id.toString(),
      }),
    });

    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    assert.equal(created.branch.name, "OrcaX Care Test Branch");
    assert.equal(created.branch.manager.fullName, "Branch Manager");
    assert.match(created.branch.slug, /orcax-care-test-branch/);

    const profile = await StaffProfile.findOne({ userId: staffUser._id }).lean();
    assert.equal(profile.isBranchManager, true);
    assert.equal(profile.branchId.toString(), created.branch._id);
  });

  test("branch manager updates phone and hours but not address", async () => {
    const branch = await Branch.create({
      name: "Managed Branch",
      slug: "managed-branch",
      address: "Old address",
      phone: "028-0000-0000",
      workingHours: "Mon–Fri 8:00–12:00",
      lat: 10.77,
      lng: 106.7,
      managerUserId: staffUser._id,
      isActive: true,
    });

    await StaffProfile.create({
      userId: staffUser._id,
      branchId: branch._id,
      isBranchManager: true,
    });

    const updateRes = await fetch(`${baseUrl}/api/staff/branch`, {
      method: "PUT",
      headers: { Authorization: staffAuth, "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "028-9999-9999",
        workingHours: "Mon–Sun 8:00–20:00",
        address: "Hacked address",
      }),
    });

    assert.equal(updateRes.status, 200);
    const body = await updateRes.json();
    assert.equal(body.branch.phone, "028-9999-9999");
    assert.equal(body.branch.workingHours, "Mon–Sun 8:00–20:00");

    const stored = await Branch.findById(branch._id).lean();
    assert.equal(stored.address, "Old address");
  });

  test("regular staff without manager role cannot update branch operations", async () => {
    const branch = await Branch.create({
      name: "Staff Branch",
      slug: "staff-branch",
      address: "2 Test Street",
      phone: "028-2222-2222",
      workingHours: "Mon–Fri 8:00–17:00",
      lat: 10.78,
      lng: 106.71,
      isActive: true,
    });

    await StaffProfile.create({
      userId: otherStaffUser._id,
      branchId: branch._id,
      isBranchManager: false,
    });

    const otherAuth = await authHeaderFor(otherStaffUser);
    const updateRes = await fetch(`${baseUrl}/api/staff/branch`, {
      method: "PUT",
      headers: { Authorization: otherAuth, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "028-3333-3333" }),
    });

    assert.equal(updateRes.status, 403);
  });
});

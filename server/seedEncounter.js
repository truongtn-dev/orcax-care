import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", UserSchema, "users");

const DoctorSchema = new mongoose.Schema({}, { strict: false });
const Doctor = mongoose.model("Doctor", DoctorSchema, "doctors");

const EncounterSchema = new mongoose.Schema({}, { strict: false });
const Encounter = mongoose.model("Encounter", EncounterSchema, "encounters");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Find Doctor User
  const users = await User.find({ role: "doctor" });
  const doctorUser = users.find(u => {
    const fullName = u.get("fullName") || "";
    return fullName.toLowerCase().includes("nguyen van an") || fullName.toLowerCase().includes("nguyễn văn an");
  });
  
  if (!doctorUser) {
    console.log("Could not find doctor user Nguyen Van An. Using the first doctor instead.");
    var doctorUserFallback = users[0];
  } else {
    var doctorUserFallback = doctorUser;
  }

  const doctorId = doctorUserFallback._id;
  const doctor = await Doctor.findOne({ userId: doctorId });
  
  if (!doctor) {
    console.log("Could not find doctor profile for " + doctorUserFallback.get("fullName"));
    process.exit(1);
  }

  // Find a patient
  const patientUser = await User.findOne({ role: "patient" });
  if (!patientUser) {
    console.log("Could not find any patient");
    process.exit(1);
  }

  // Create an encounter
  const encounter = new Encounter({
    doctorId: doctor._id,
    patientUserId: patientUser._id,
    visitDate: new Date(),
    status: "draft", // Not signed off
    chiefComplaint: "Đau đầu, chóng mặt",
    clinicalNotes: "Bệnh nhân có triệu chứng đau đầu nhẹ.",
    vitals: {
      temperatureC: 37.5,
      bloodPressure: "120/80",
      pulse: 80
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await encounter.save();
  console.log(`Created Encounter! Encounter ID: ${encounter._id}`);
  console.log(`Doctor: ${doctorUserFallback.get("fullName")}`);
  console.log(`Patient: ${patientUser.get("fullName")}`);

  await mongoose.disconnect();
}

run().catch(console.error);

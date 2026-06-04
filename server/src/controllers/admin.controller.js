import * as AdminService from "../services/admin.service.js";


function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}


export async function createStaffAccount(req, res) {
  try {
    return sendResult(res, await AdminService.createStaffAccount(req.body));
  } catch (err) {
    console.error("Error in controller createStaffAccount:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listAllUsers(req, res) {
  try {
    return sendResult(res, await AdminService.listAllUsers());
  } catch (err) {
    console.error("Error in controller listAllUsers:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function changeUserRole(req, res) {
  try {
    const { userId } = req.params;
    return sendResult(res, await AdminService.changeUserRole(userId, req.body));
  } catch (err) {
    console.error("Error in controller changeUserRole:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deactivateAccount(req, res) {
  try {
    const { userId } = req.params;
    const adminUserId = req.user.userId;
    return sendResult(res, await AdminService.deactivateAccount(userId, adminUserId));
  } catch (err) {
    console.error("Error in controller deactivateAccount:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function reactivateAccount(req, res) {
  try {
    const { userId } = req.params;
    return sendResult(res, await AdminService.reactivateAccount(userId));
  } catch (err) {
    console.error("Error in controller reactivateAccount:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}





export async function createSpecialty(req, res) {
  try {
    return sendResult(res, await AdminService.createSpecialty(req.body));
  } catch (err) {
    console.error("Error in controller createSpecialty:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateSpecialty(req, res) {
  try {
    const { specialtyId } = req.params;
    return sendResult(res, await AdminService.updateSpecialty(specialtyId, req.body));
  } catch (err) {
    console.error("Error in controller updateSpecialty:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}





export async function listClinicRooms(req, res) {
  try {
    return sendResult(res, await AdminService.listClinicRooms());
  } catch (err) {
    console.error("Error in controller listClinicRooms:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createClinicRoom(req, res) {
  try {
    return sendResult(res, await AdminService.createClinicRoom(req.body));
  } catch (err) {
    console.error("Error in controller createClinicRoom:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateClinicRoom(req, res) {
  try {
    const { roomId } = req.params;
    return sendResult(res, await AdminService.updateClinicRoom(roomId, req.body));
  } catch (err) {
    console.error("Error in controller updateClinicRoom:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}





export async function viewDoctorsList(req, res) {
  try {
    const { isActive, specialtyId, departmentId, name, page, limit } = req.query;
    return sendResult(res, await AdminService.viewDoctorsList({
      isActive,
      specialtyId,
      departmentId,
      name,
      page,
      limit
    }));
  } catch (err) {
    console.error("Error in controller viewDoctorsList:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

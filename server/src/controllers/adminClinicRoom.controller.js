import * as AdminClinicRoomService from "../services/adminClinicRoom.service.js";

export async function listClinicRooms(req, res) {
  try {
    const { q, departmentId, isActive, page, limit } = req.query;
    const result = await AdminClinicRoomService.listClinicRooms({
      q,
      departmentId,
      isActive,
      page,
      limit,
    });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listDepartmentOptions(req, res) {
  try {
    const items = await AdminClinicRoomService.listDepartmentOptions();
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createClinicRoom(req, res) {
  try {
    const result = await AdminClinicRoomService.createClinicRoom(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateClinicRoom(req, res) {
  try {
    const result = await AdminClinicRoomService.updateClinicRoom(req.params.roomId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

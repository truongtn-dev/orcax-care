import * as AdminDoctorService from "../services/adminDoctor.service.js";
import * as AdminDoctorExcelService from "../services/adminDoctorExcel.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function listDoctors(req, res) {
  try {
    return sendResult(res, await AdminDoctorService.listDoctors(req.query));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getDoctor(req, res) {
  try {
    return sendResult(res, await AdminDoctorService.getDoctor(req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateDoctor(req, res) {
  try {
    return sendResult(res, await AdminDoctorService.updateDoctor(req.params.id, req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function exportDoctors(req, res) {
  try {
    const result = await AdminDoctorExcelService.exportDoctors(req.query);
    if (result.status !== 200) {
      return res.status(result.status).json(result.body || { message: "Export failed" });
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", result.contentDisposition);
    return res.send(result.buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function downloadImportTemplate(req, res) {
  try {
    const result = await AdminDoctorExcelService.downloadImportTemplate();
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", result.contentDisposition);
    return res.send(result.buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function importDoctors(req, res) {
  try {
    return sendResult(res, await AdminDoctorExcelService.importDoctors(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

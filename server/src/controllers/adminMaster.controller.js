import * as AdminMasterService from "../services/adminMaster.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function listSpecialties(req, res) {
  try {
    return sendResult(
      res,
      await AdminMasterService.listSpecialties({
        activeOnly: req.query.activeOnly !== "false",
      })
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listDepartments(req, res) {
  try {
    return sendResult(
      res,
      await AdminMasterService.listDepartments({
        activeOnly: req.query.activeOnly !== "false",
      })
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createDepartment(req, res) {
  try {
    return sendResult(res, await AdminMasterService.createDepartment(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getDepartmentDetail(req, res) {
  try {
    return sendResult(res, await AdminMasterService.getDepartmentDetail(req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

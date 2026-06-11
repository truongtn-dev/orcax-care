import * as PatientPushSubscriptionService from "../services/patientPushSubscription.service.js";

export async function getPushSubscription(req, res) {
  try {
    const result = await PatientPushSubscriptionService.getPushSubscription(req.user.userId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function savePushSubscription(req, res) {
  try {
    const result = await PatientPushSubscriptionService.savePushSubscription(
      req.user.userId,
      req.body
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function deactivatePushSubscription(req, res) {
  try {
    const result = await PatientPushSubscriptionService.deactivatePushSubscription(
      req.user.userId
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

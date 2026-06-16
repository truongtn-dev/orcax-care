# Class method specifications for WDP301 SDS document.
# Each entry: list of (method_signature, description)

def _model(name, collection, extra=None):
    rows = [
        (f"findOne(filter : Object)", f"Retrieves one {name} document from the `{collection}` collection."),
        (f"find(filter : Object)", f"Retrieves matching {name} documents from `{collection}`."),
        (f"create(doc : Object)", f"Inserts a new {name} record into `{collection}`."),
        (f"updateOne(filter : Object, update : Object)", f"Updates a {name} document in `{collection}`."),
    ]
    if extra:
        rows.extend(extra)
    return rows


SPECS = {
    "LoginPage": [
        ("handleChange(event : Event)", "Updates local form state when the user edits email, password, or Remember me."),
        ("validateForm()", "Validates required fields and password format before submit."),
        ("handleSubmit()", "Submits credentials to AuthApiClient and handles success or error UI state."),
        ("showError(message : String)", "Displays an authentication or account-status error to the user."),
    ],
    "RegisterPage": [
        ("handleChange(event : Event)", "Updates registration form fields as the guest types."),
        ("validateForm()", "Validates email uniqueness rules, password strength, and required profile fields."),
        ("handleSubmit()", "Calls AuthApiClient.register and shows success or validation errors."),
        ("showError(message : String)", "Displays registration failure messages on the form."),
    ],
    "ForgotPasswordPage": [
        ("handleChange(event : Event)", "Captures the recovery email address from user input."),
        ("handleSubmit()", "Requests a password-reset link via AuthApiClient."),
        ("showMessage(message : String)", "Shows neutral confirmation text without revealing whether the email exists."),
    ],
    "ResetPasswordPage": [
        ("handleChange(event : Event)", "Updates new password and confirm-password fields."),
        ("validateForm()", "Ensures password meets policy and both fields match."),
        ("handleSubmit()", "Submits the reset token and new password to AuthApiClient."),
        ("showError(message : String)", "Displays invalid or expired token errors."),
    ],
    "AppHeader": [
        ("renderUserMenu()", "Renders avatar, role label, and logout action for authenticated users."),
        ("handleLogout()", "Clears client session state and calls AuthApiClient.logout."),
    ],
    "AuthContext": [
        ("login(token : String, user : Object)", "Stores authenticated user and token in React context."),
        ("logout()", "Clears auth state and removes persisted token."),
        ("getCurrentUser()", "Returns the logged-in user snapshot for protected routes."),
    ],
    "AuthApiClient": [
        ("register(payload : Object)", "POST /api/auth/register — creates a patient account."),
        ("login(email : String, password : String, rememberMe : boolean)", "POST /api/auth/login — authenticates the user."),
        ("logout()", "POST /api/auth/logout — revokes the current session token."),
        ("requestPasswordReset(email : String)", "POST /api/auth/forgot-password — sends reset email."),
        ("resetPassword(token : String, password : String)", "POST /api/auth/reset-password — sets a new password."),
        ("verifyEmail(token : String)", "GET /api/auth/verify-email — activates a registered account."),
    ],
    "AuthController": [
        ("register(req : Request, res : Response)", "Handles patient registration requests."),
        ("login(req : Request, res : Response)", "Authenticates credentials and returns a session token."),
        ("logout(req : Request, res : Response)", "Revokes the caller auth token."),
        ("forgotPassword(req : Request, res : Response)", "Creates a reset token and triggers email delivery."),
        ("resetPassword(req : Request, res : Response)", "Validates reset token and updates passwordHash."),
        ("verifyEmail(req : Request, res : Response)", "Marks the user email as verified."),
    ],
    "AuthService": [
        ("registerPatient(dto : Object)", "Hashes password, creates user/patient records, and sends verification email."),
        ("authenticate(email : String, password : String)", "Verifies credentials and account status."),
        ("issueToken(user : Object, rememberMe : boolean)", "Creates an opaque auth token with expiry."),
        ("revokeToken(token : String)", "Deletes or invalidates an auth token."),
        ("requestPasswordReset(email : String)", "Creates PasswordResetToken and sends mail."),
        ("resetPassword(token : String, newPassword : String)", "Updates password after token validation."),
        ("verifyEmail(token : String)", "Activates account when verification token is valid."),
    ],
    "MailService": [
        ("sendVerificationEmail(to : String, link : String)", "Sends account verification email via SMTP."),
        ("sendPasswordResetEmail(to : String, link : String)", "Sends password reset instructions via SMTP."),
        ("sendBookingConfirmation(to : String, data : Object)", "Sends appointment confirmation email to the patient."),
    ],
    "HomePage": [
        ("loadFeaturedDoctors()", "Loads featured doctors for the portal home carousel."),
        ("handleSearch(keyword : String, filters : Object)", "Runs doctor search and updates result list."),
        ("openDoctorProfile(doctorId : ObjectId)", "Navigates to the public doctor profile page."),
    ],
    "PublicApiClient": [
        ("getFeaturedDoctors()", "GET /api/public/doctors/featured — returns highlighted doctors."),
        ("searchDoctors(params : Object)", "GET /api/public/doctors/search — searches active doctors."),
        ("getDoctorProfile(doctorId : ObjectId)", "GET /api/public/doctors/:id — returns public profile data."),
    ],
    "PublicController": [
        ("getFeaturedDoctors(req : Request, res : Response)", "Returns featured active doctors for the home page."),
        ("searchDoctors(req : Request, res : Response)", "Searches doctors by keyword, specialty, or department."),
        ("getDoctorProfile(req : Request, res : Response)", "Returns public doctor profile details."),
    ],
    "DoctorSearchService": [
        ("getFeaturedDoctors()", "Queries featured, active doctors with specialty and rating aggregates."),
        ("searchDoctors(criteria : Object)", "Builds MongoDB query for doctor search with pagination."),
        ("getPublicProfile(doctorId : ObjectId)", "Loads doctor profile safe for guest/patient viewing."),
    ],
    "BookAppointmentPage": [
        ("loadDoctorInfo()", "Loads selected doctor details and consultation fee."),
        ("loadAvailableSlots(date : Date)", "Fetches available appointment slots for the chosen date."),
        ("selectSlot(slotId : ObjectId)", "Marks the selected slot and refreshes fee preview."),
        ("previewFee()", "Calculates fee after optional insurance discount."),
        ("validateForm()", "Validates reason, slot, insurance, and payment method."),
        ("handleConfirmPay()", "Submits booking payload to AppointmentApiClient."),
        ("showError(message : String)", "Displays booking or payment validation errors."),
    ],
    "AppointmentApiClient": [
        ("getDoctor(doctorId : ObjectId)", "GET /api/doctors/:id — loads doctor booking context."),
        ("getAvailableSlots(doctorId : ObjectId, date : Date)", "GET /api/appointments/slots — lists open slots."),
        ("getInsuranceCards()", "GET /api/patient/insurance-cards — lists active cards."),
        ("bookAppointment(payload : Object)", "POST /api/appointments/book — confirms booking and payment."),
        ("listAppointments(filters : Object)", "GET /api/patient/appointments — lists patient appointments."),
        ("rescheduleAppointment(id : ObjectId, payload : Object)", "PUT /api/patient/appointments/:id/reschedule."),
        ("cancelAppointment(id : ObjectId)", "POST /api/patient/appointments/:id/cancel."),
    ],
    "AppointmentController": [
        ("getAvailableSlots(req : Request, res : Response)", "Returns available slots for a doctor and date."),
        ("bookAppointment(req : Request, res : Response)", "Creates a booked appointment after payment succeeds."),
        ("listAppointments(req : Request, res : Response)", "Lists appointments for the authenticated patient."),
        ("rescheduleAppointment(req : Request, res : Response)", "Moves an appointment to another available slot."),
        ("cancelAppointment(req : Request, res : Response)", "Cancels an appointment and triggers refund rules."),
    ],
    "AppointmentService": [
        ("getAvailableSlots(doctorId : ObjectId, date : Date)", "Queries appointment_slots with status available."),
        ("calculateFee(doctorId : ObjectId, insuranceCardId : ObjectId)", "Computes consultation fee minus eligible discount."),
        ("holdSlot(slotId : ObjectId, patientId : ObjectId)", "Atomically marks a slot as held during checkout."),
        ("confirmBooking(payload : Object)", "Completes booking, payment, notification, and slot update."),
        ("processPayment(method : String, amount : Number)", "Processes wallet, PayOS, or SePay payment branch."),
        ("rescheduleAppointment(appointmentId : ObjectId, slotId : ObjectId)", "Releases old slot and books a new one."),
        ("cancelAppointment(appointmentId : ObjectId, patientId : ObjectId)", "Cancels visit and refunds wallet when allowed."),
    ],
    "WalletPage": [
        ("loadWallet()", "Loads current balance and recent transactions."),
        ("loadTransactions()", "Loads filtered wallet transaction history."),
        ("handleTopUp()", "Submits top-up amount and selected gateway (PayOS / SePay)."),
        ("applyFilter()", "Applies type/date filters to transaction history."),
        ("showError(message : String)", "Displays validation or payment errors."),
    ],
    "WalletApiClient": [
        ("getWallet()", "GET /api/patient/wallet — returns balance and recent activity."),
        ("initiateTopUp(amount : Number, gateway : String)", "POST /api/patient/wallet/topups/{payos|sepay}."),
        ("getTransactions(filters : Object)", "GET /api/patient/wallet/transactions — filtered history."),
        ("getTopupStatus(provider : String, ref : String)", "GET /api/patient/wallet/topups/:provider/:ref/status."),
    ],
    "WalletController": [
        ("getWallet(req : Request, res : Response)", "Returns wallet overview for the logged-in patient."),
        ("initiateTopUp(req : Request, res : Response)", "Creates pending top-up and returns checkout path."),
        ("getTransactions(req : Request, res : Response)", "Returns paginated wallet transactions."),
        ("handleGatewayCallback(req : Request, res : Response)", "Handles PayOS webhook or SePay IPN verification."),
    ],
    "WalletService": [
        ("getWallet(userId : ObjectId)", "Loads wallet balance and recent transactions."),
        ("initiateTopUp(userId : ObjectId, amount : Number, gateway : String)", "Validates amount and starts PayOS/SePay checkout."),
        ("creditWallet(txId : ObjectId)", "Marks top-up success and increments wallet balance."),
        ("listTransactions(userId : ObjectId, filters : Object)", "Queries wallet_transactions with filters."),
        ("deductWallet(userId : ObjectId, amount : Number, ref : Object)", "Deducts balance for appointment payment."),
    ],
    "ManageProfilePage": [
        ("loadProfile()", "Loads current user and patient profile fields."),
        ("handleChange(event : Event)", "Updates editable profile form state."),
        ("handleSaveProfile()", "Persists profile changes through ProfileApiClient."),
        ("handleChangePassword()", "Validates and submits password change request."),
    ],
    "ProfileApiClient": [
        ("getProfile()", "GET /api/patient/profile — returns profile data."),
        ("updateProfile(payload : Object)", "PUT /api/patient/profile — saves profile changes."),
        ("changePassword(payload : Object)", "POST /api/patient/change-password."),
    ],
    "ProfileController": [
        ("getProfile(req : Request, res : Response)", "Returns authenticated patient profile."),
        ("updateProfile(req : Request, res : Response)", "Updates patient profile fields."),
        ("changePassword(req : Request, res : Response)", "Changes password after verifying the old one."),
    ],
    "ProfileService": [
        ("getProfile(userId : ObjectId)", "Loads user and patient profile documents."),
        ("updateProfile(userId : ObjectId, payload : Object)", "Updates patient demographic and contact data."),
        ("changePassword(userId : ObjectId, oldPassword : String, newPassword : String)", "Verifies old password and stores new hash."),
    ],
    "ManageAppointmentsPage": [
        ("loadAppointments()", "Loads upcoming and past appointments."),
        ("openDetail(appointmentId : ObjectId)", "Opens appointment detail with payment summary."),
        ("handleReschedule(appointmentId : ObjectId, slotId : ObjectId)", "Submits reschedule request."),
        ("handleCancel(appointmentId : ObjectId)", "Cancels appointment when policy allows."),
        ("handleRateDoctor(appointmentId : ObjectId, rating : Object)", "Submits doctor rating after completed visit."),
    ],
    "ViewPrescriptionsPage": [
        ("loadPrescriptions(filters : Object)", "Loads prescription history for the patient."),
        ("openPrescription(id : ObjectId)", "Opens prescription detail with QR/PDF actions."),
        ("exportPdf(id : ObjectId)", "Downloads prescription PDF export."),
    ],
    "PrescriptionApiClient": [
        ("listPrescriptions(filters : Object)", "GET /api/patient/prescriptions."),
        ("getPrescription(id : ObjectId)", "GET /api/patient/prescriptions/:id."),
    ],
    "PrescriptionController": [
        ("listPrescriptions(req : Request, res : Response)", "Returns patient prescription history."),
        ("getPrescription(req : Request, res : Response)", "Returns one prescription with items."),
    ],
    "PrescriptionService": [
        ("listPrescriptions(patientId : ObjectId, filters : Object)", "Queries signed prescriptions for the patient."),
        ("getPrescription(patientId : ObjectId, prescriptionId : ObjectId)", "Loads prescription, items, and doctor info."),
    ],
    "StaffDashboardPage": [
        ("loadDashboard()", "Loads queue, complaint, and pharmacy summary widgets."),
        ("refreshWidgets()", "Polls or reloads staff dashboard KPI cards."),
    ],
    "StaffDashboardApiClient": [
        ("getDashboardSummary()", "GET /api/staff/dashboard — returns staff KPI summary."),
    ],
    "StaffDashboardController": [
        ("getDashboardSummary(req : Request, res : Response)", "Returns aggregated staff dashboard metrics."),
    ],
    "StaffDashboardService": [
        ("getDashboardSummary(staffUserId : ObjectId)", "Aggregates queue, complaints, and stock alerts."),
    ],
    "AdminDashboardPage": [
        ("loadDashboard()", "Loads admin KPI cards and charts."),
        ("loadRecentActivity()", "Loads recent appointments and registrations."),
    ],
    "AdminDashboardApiClient": [
        ("getDashboardSummary()", "GET /api/admin/dashboard."),
    ],
    "AdminDashboardController": [
        ("getDashboardSummary(req : Request, res : Response)", "Returns admin dashboard metrics."),
    ],
    "AdminDashboardService": [
        ("getDashboardSummary()", "Aggregates counts for appointments, patients, doctors, and revenue."),
    ],
}

# Mongoose models
SPECS.update(
    {
        "UserModel": _model("user", "users", [("comparePassword(plain : String)", "Compares a plain password with passwordHash.")]),
        "PatientModel": _model("patient", "patients"),
        "DoctorModel": _model("doctor", "doctors"),
        "AuthTokenModel": _model("auth token", "auth_tokens"),
        "EmailVerificationTokenModel": _model("verification token", "email_verification_tokens"),
        "PasswordResetTokenModel": _model("password reset token", "password_reset_tokens"),
        "AppointmentModel": _model("appointment", "appointments"),
        "AppointmentSlotModel": _model("appointment slot", "appointment_slots"),
        "InsuranceCardModel": _model("insurance card", "insurance_cards"),
        "WalletModel": _model("wallet", "wallets"),
        "WalletTransactionModel": _model("wallet transaction", "wallet_transactions"),
        "TransactionModel": _model("wallet transaction", "wallet_transactions"),
        "PaymentModel": _model("payment", "payments"),
        "NotificationModel": _model("notification", "notifications"),
        "ReviewModel": _model("review", "reviews"),
        "PrescriptionModel": _model("prescription", "prescriptions"),
        "PrescriptionItemModel": _model("prescription item", "prescription_items"),
        "MedicineModel": _model("medicine", "medicines"),
        "ComplaintModel": _model("complaint", "complaints"),
        "ComplaintReplyModel": _model("complaint reply", "complaint_replies"),
        "QueueSessionModel": _model("queue session", "queue_sessions"),
        "QueueTicketModel": _model("queue ticket", "queue_tickets"),
        "EncounterModel": _model("encounter", "encounters"),
        "DiagnosisModel": _model("diagnosis", "diagnoses"),
        "MedicalImageModel": _model("medical image", "medical_images"),
        "WorkShiftModel": _model("work shift", "work_shifts"),
        "ClinicRoomModel": _model("clinic room", "clinic_rooms"),
        "DepartmentModel": _model("department", "departments"),
        "SpecialtyModel": _model("specialty", "specialties"),
        "StockMovementModel": _model("stock movement", "stock_movements"),
        "NotificationPreferenceModel": _model("notification preference", "notification_preferences"),
        "Icd10CatalogModel": _model("ICD-10 code", "icd10_catalog"),
        "InsuranceProviderModel": _model("insurance provider", "insurance_providers"),
        "AuditLogModel": _model("audit log", "audit_logs"),
        "SessionModel": _model("session", "sessions"),
    }
)


def normalize(name: str) -> str:
    return name.replace(" (Mongoose)", "").replace(" Class", "").strip()


def generic_page_specs(name: str) -> list[tuple[str, str]]:
    return [
        ("loadData()", f"Loads initial data required by {name}."),
        ("handleSubmit()", f"Submits the primary action of {name} to its API client."),
        ("showError(message : String)", "Displays validation or server error messages."),
    ]


def generic_api_specs(name: str) -> list[tuple[str, str]]:
    base = name.replace("ApiClient", "")
    return [
        (f"list()", f"GET API — lists {base.lower()} resources."),
        (f"getById(id : ObjectId)", f"GET API — returns one {base.lower()} record."),
        (f"create(payload : Object)", f"POST API — creates a {base.lower()} record."),
        (f"update(id : ObjectId, payload : Object)", f"PUT API — updates a {base.lower()} record."),
    ]


def generic_controller_specs(name: str) -> list[tuple[str, str]]:
    base = name.replace("Controller", "")
    svc = f"{base}Service"
    return [
        (f"list(req : Request, res : Response)", f"Returns paginated {base.lower()} data via {svc}."),
        (f"getById(req : Request, res : Response)", f"Returns one {base.lower()} record by id."),
        (f"create(req : Request, res : Response)", f"Creates a {base.lower()} record from request body."),
        (f"update(req : Request, res : Response)", f"Updates a {base.lower()} record."),
    ]


def generic_service_specs(name: str) -> list[tuple[str, str]]:
    base = name.replace("Service", "")
    return [
        (f"list(filters : Object)", f"Queries and returns {base.lower()} records with filters."),
        (f"getById(id : ObjectId)", f"Loads one {base.lower()} record or throws not found."),
        (f"create(payload : Object)", f"Validates input and persists a new {base.lower()} record."),
        (f"update(id : ObjectId, payload : Object)", f"Updates an existing {base.lower()} record."),
    ]


def get_specs(class_name: str) -> list[tuple[str, str]]:
    key = normalize(class_name)
    if key in SPECS:
        return SPECS[key]
    if key.endswith("Page"):
        return generic_page_specs(key)
    if key.endswith("ApiClient"):
        return generic_api_specs(key)
    if key.endswith("Controller"):
        return generic_controller_specs(key)
    if key.endswith("Service"):
        return generic_service_specs(key)
    if key.endswith("Model"):
        collection = key.replace("Model", "").lower() + "s"
        return _model(key.replace("Model", "").lower(), collection)
    return [
        ("execute()", f"Provides operations for {key} as shown in the class diagram."),
    ]

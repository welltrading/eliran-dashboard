export type OrderStatus =
  | "חדשה"
  | "בהכנה"
  | "ממתינה לתשלום"
  | "מוכנה להתקנה"
  | "הושלמה"
  | "בוטלה";

export type TaskStatus =
  | "פתוח"
  | "בטיפול"
  | "הושלם"
  | "לביצוע"
  | "בוצע"
  | "בוטל";

export type StockStatus = "ok" | "low" | "out" | "negative";

export type QuoteType = "סטנדרטי" | "ייצור אישי";

export type OrderType = "סטנדרטי" | "ייצור אישי";

export type FulfillmentSource = "חנות" | "מחסן" | "הזמנה מספק";

export type DashboardStat = {
  label: string;
  value: string;
  note: string;
  tone: "success" | "warning" | "danger";
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type Installer = {
  id: string;
  name: string;
  firstName: string | null;
  phone: string | null;
  mobile: string | null;
  capabilities: string[];
  active: boolean;
  paidThisMonth: boolean;
  approvedAmountToPay: number;
  openTaskCount: number;
  completedTaskCount: number;
  approvedPaymentAmount: number;
};

export type InstallerSummary = {
  totalInstallers: number;
  installersWithPhoneOrMobile: number;
  totalApprovedAmountToPay: number;
  tasksScheduledThisMonth: number;
  completedTasksPendingApproval: number;
  completedTasksPendingApprovalIsBestEffort: boolean;
};

export type PendingPaymentApprovalTask = {
  id: string;
  executionDate: string | null;
  customerName: string | null;
  orderNumber: string | null;
  taskType: string | null;
  installerId: string;
  installerName: string;
  paymentAmount: number | null;
  existingApprovalId: string | null;
  existingApprovalStatus: string | null;
  existingApprovalCount: number;
  paymentApprovalState:
    | "no_approval"
    | "pending_approval"
    | "canceled_approval"
    | "duplicate_approval"
    | "other_approval";
  paymentWarning: string | null;
};

export type InstallerRate = {
  id: string;
  taskType: string;
  price: number;
  active: boolean;
  linkedTaskCount: number;
};

export type TaskWithoutRate = {
  id: string;
  executionDate: string | null;
  customerName: string | null;
  orderNumber: string | null;
  taskType: string | null;
  installerName: string | null;
};

export type InstallerMonthlyPaymentDetail = {
  id: string;
  approvalId: string;
  installationDate: string | null;
  orderNumber: string | null;
  customerName: string | null;
  taskType: string | null;
  amount: number;
  amountMissing: boolean;
  approvalStatus: string;
};

export type InstallerMonthlyPaymentRecordStatus =
  | "פתוח"
  | "שולם"
  | "בוטל / לא לתשלום"
  | string;

export type InstallerMonthlyPaymentRecordSnapshot = {
  id: string;
  name: string | null;
  paymentKey: string;
  status: InstallerMonthlyPaymentRecordStatus | null;
  amount: number;
  paymentDate: string | null;
  includedApprovalCount: number;
  includedApprovalIds: string[];
};

export type InstallerMonthlyPaymentRecordState =
  | {
      kind: "missing";
    }
  | {
      kind: "existing";
      record: InstallerMonthlyPaymentRecordSnapshot;
    }
  | {
      kind: "duplicate";
      records: InstallerMonthlyPaymentRecordSnapshot[];
    };

export type InstallerMonthlyPaymentSummary = {
  installerId: string;
  installerName: string;
  approvalCount: number;
  totalAmount: number;
  monthlyPaymentRecord: InstallerMonthlyPaymentRecordState;
  details: InstallerMonthlyPaymentDetail[];
};

export type InstallerMonthlyPaymentReport = {
  selectedMonth: string;
  airtableMonth: string;
  installerSummaries: InstallerMonthlyPaymentSummary[];
  totalApprovalCount: number;
  totalAmount: number;
};

export type InstallerMonthlyPaymentMutationResult = {
  ok: boolean;
  action:
    | "created"
    | "updated"
    | "paid"
    | "blocked"
    | "duplicate"
    | "not_found"
    | "no_approvals";
  message: string;
  recordId?: string;
};

export type InstallerMonthlyPaymentSyncResult = InstallerMonthlyPaymentMutationResult;

export type ApprovalMissingAmountIssue = {
  id: string;
  approvalId: string;
  installerName: string | null;
  installationDate: string | null;
  taskId: string | null;
  orderNumber: string | null;
  amount: number;
  approvalStatus: string;
};

export type DuplicateTaskApprovalIssue = {
  taskId: string;
  approvalCount: number;
  approvalIds: string[];
  statuses: string[];
  validApprovalCount: number;
};

export type PaymentReliabilityControlData = {
  missingAmountApprovals: ApprovalMissingAmountIssue[];
  duplicateTaskApprovals: DuplicateTaskApprovalIssue[];
  pendingApprovalTasks: PendingPaymentApprovalTask[];
  tasksWithoutRate: TaskWithoutRate[];
  totalIssueCount: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string | null;
  orderType: OrderType;
  status: string;
  createdAt: string | null;
  totalPrice: number;
  easyCountDocumentId: string | null;
  easyCountDocumentNumber: string | null;
  easyCountDocumentUrl: string | null;
  easyCountStatus: string | null;
  easyCountError: string | null;
  invoiceReceiptRequested: boolean;
  shortNotes: string | null;
  orderLineIds: string[];
  sendStatus: string | null;
  productSummary: string | null;
};

export type OrderLine = {
  id: string;
  linkedOrderIds: string[];
  linkedOrderNumber: string | null;
  productDescription: string;
  quantity: number;
  lineTotalPrice: number;
  priceBeforeVat: number;
  inventoryMovementType: string | null;
  createdAt: string | null;
};

export type InventoryItem = {
  id: string;
  productName: string;
  productSku: string | null;
  productRecordId: string | null;
  location: string;
  availableQuantity: number;
  status: StockStatus;
  displayForMoran: string | null;
  productLocationKey: string | null;
  updatedAt: string | null;
};

export type InventoryMovement = {
  id: string;
  movementNumber: string | null;
  date: string | null;
  productName: string | null;
  productRecordIds: string[];
  location: string | null;
  movementType: string;
  direction: string | null;
  quantity: number;
  quantityMissing: boolean;
  calculatedQuantity: number;
  status: string | null;
  stockLocationIds: string[];
  orderLineIds: string[];
  orderLineLabels: string[];
  relatedOrder: string | null;
  notes: string | null;
};

export type InventoryValidation = {
  inventoryNegativeCount: number;
  inventoryOutCount: number;
  inventoryLowCount: number;
  movementsMissingProduct: number;
  movementsMissingLocation: number;
  movementsMissingQuantity: number;
  movementsMissingStockLocation: number;
};

export type Product = {
  id: string;
  selectLabel: string;
  fullName: string | null;
  baseName: string | null;
  baseModel: string | null;
  size: string | null;
  glassType: string | null;
  hardwareColor: string | null;
  height: string | null;
  price: number;
  stockDisplay: string | null;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  taskType: string | null;
  executionDate: string | null;
  scheduledDate: string | null;
  timeWindow: string | null;
  notes: string | null;
  actuallyDone: boolean;
  scheduleSentToInstaller: boolean;
  scheduleSentAt: string | null;
  scheduleSendStatus: string | null;
  scheduleSendError: string | null;
  installerIds: string[];
  installerName: string | null;
  installerPhone: string | null;
  orderIds: string[];
  orderNumber: string | null;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  orderStatus: string | null;
};

export type TaskScheduleSummary = {
  totalTasks: number;
  scheduledToday: number;
  scheduledTomorrow: number;
  withoutDate: number;
  withoutInstaller: number;
  byStatus: Array<{ status: string; count: number }>;
  scheduleNotSentToInstaller: number;
};

export type Quote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  phone: string | null;
  address: string | null;
  quoteType: QuoteType;
  status: string;
  createdAt: string | null;
  totalPrice: number;
  ezDocUrl: string | null;
  leadSource: string | null;
  createOrderUrl: string | null;
  productIds: string[];
  customProductDescription: string | null;
  customSpecDescription: string | null;
  quantity: number | null;
  quoteNotes: string | null;
  width: string | null;
  depth: string | null;
  height: string | null;
  glassType: string | null;
  hardwareColor: string | null;
  dismantlingOption: string | null;
  measurementRequired: string | null;
  createdOrderIds: string[];
};

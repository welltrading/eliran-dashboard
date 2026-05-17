export type OrderStatus =
  | "חדשה"
  | "בהכנה"
  | "ממתינה לתשלום"
  | "מוכנה להתקנה"
  | "הושלמה"
  | "בוטלה";

export type TaskStatus = "חדשה" | "מתואמת" | "בביצוע" | "הושלמה" | "בוטלה";

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

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string | null;
  orderType: OrderType;
  status: string;
  createdAt: string | null;
  totalPrice: number;
  easyCountDocumentNumber: string | null;
  easyCountDocumentUrl: string | null;
  shortNotes: string | null;
  orderLineIds: string[];
  sendStatus: string | null;
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
  scheduledDate: string | null;
  installerIds: string[];
  customerIds: string[];
  orderIds: string[];
};

export type Quote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  phone: string | null;
  quoteType: QuoteType;
  status: string;
  createdAt: string | null;
  totalPrice: number;
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

import "server-only";

export const airtableTables = {
  orders: process.env.AIRTABLE_TABLE_ORDERS ?? "הזמנות",
  orderLines: process.env.AIRTABLE_TABLE_ORDER_LINES ?? "שורות הזמנה",
  inventory: process.env.AIRTABLE_TABLE_INVENTORY ?? "מלאי לפי מיקום",
  inventoryMovements:
    process.env.AIRTABLE_TABLE_INVENTORY_MOVEMENTS ?? "תנועות מלאי",
  tasks: process.env.AIRTABLE_TABLE_TASKS ?? "משימות",
  installers: process.env.AIRTABLE_TABLE_INSTALLERS ?? "מתקינים",
  customers: process.env.AIRTABLE_TABLE_CUSTOMERS ?? "לקוחות",
  quotes: process.env.AIRTABLE_TABLE_QUOTES ?? "הצעות מחיר",
  products: process.env.AIRTABLE_TABLE_PRODUCTS ?? "מוצרים",
} as const;

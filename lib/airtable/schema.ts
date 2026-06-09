import "server-only";

export const airtableSchema = {
  baseId: "apphmGmx3hhLZI8AK",
  tables: {
    quotes: "tblJTBG0o9jhcs522",
    orders: "tblJYbxBXWUkAoI7m",
    documentLines: "tblUDmzevIf2rwivy",
    inventoryMovements: "tblS074Z1pDNpEVWO",
    orderCreationRequests: "tbl9qrEMxpnxYAbaC",
  },
  fields: {
    quotes: {
      customerName: "fld07wwSMqvzYk0s4",
      phone: "fldPYvrQHENHZC8pJ",
      address: "fldhF5IRofdRLTkhN",
      leadSource: "fldOY3RLPblIPoz60",
      notes: "fldGnHde4OSCi00ue",
    },
    documentLines: {
      description: "fldc33QppEyN8Yaxq",
      lineType: "fldAoGQVj0sylIUAr",
      quote: "fldtv0UmzABrZ0OgI",
      order: "fldLfzqMk98VZmts3",
      product: "fld9OqOt6TCFsaHPW",
      quantity: "fldaxQ0Ko91cTOTBb",
      unitPrice: "fldDTYi0DZyEplom6",
      discountPercent: "fldgNmPUYcoFHatPu",
      lineTotal: "fld3qg1JkrUX5iTaM",
      documentType: "fldDsTolgtpHFWkP1",
      displayDescription: "fldyKIV6tKKkqT2jn",
      exitLocation: "fldPbgcN4NvRtRMgp",
      source: "fldsTPKtaw1AYHN2A",
      lineStatus: "fld5o465AG04fQaxi",
      inventoryMovements: "fldegUuhoVtTLCMRa",
      createdAt: "fldsdyswewYXl88g6",
    },
    inventoryMovements: {
      documentLines: "fldaNMYaxrLipGtw5",
    },
    orderCreationRequests: {
      requestName: "fldaI9zE77a32nibS",
      quote: "fldNa87jPiA2O6BiK",
      paymentType: "fld81k3CttGthgzVF",
      paymentMethod: "fldUmyn72xtd0EK9h",
      requestStatus: "fldeLwIaKgJmPnA3D",
      createdOrder: "fldGHTJ7cWCzeeUvW",
      notes: "fld7oyKAyI7vSNLky",
      source: "fldfDSzoN9MSj9s2t",
      standardExitLocation: "fldpLvviItbbVImvF",
      error: "fldkQkq7SzWm8dI8l",
    },
  },
} as const;

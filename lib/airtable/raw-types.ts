import "server-only";

export type AirtableLinkedRecord = string[];

export type AirtableAttachment = {
  id?: unknown;
  filename?: unknown;
  url?: unknown;
};

export type RawCustomerFields = {
  "שם לקוח"?: string;
  טלפון?: string;
  אימייל?: string;
  כתובת?: string;
};

export type RawInstallerFields = {
  fldOSaSnJIAr43Btv?: unknown;
  fld0sR1uUVVUdSSKV?: unknown;
  fldNuwr5rLp0Vbicu?: unknown;
  fldEKq3y8mVAqnQZu?: unknown;
  fld5Qhfq26o0cRHoo?: unknown;
  fld1pT9vTum0JNiFa?: unknown;
  fldGiu9i3KciTcMSO?: unknown;
  fldpaHuYIWVkk9z17?: unknown;
  fldICb7wcohXGmKLV?: unknown;
  "שם מתקין"?: string;
  טלפון?: string;
  פעיל?: boolean;
};

export type RawInstallerTaskFields = {
  fld9pZpcEyipF5teB?: unknown;
  fldAP5bP6n8okIqec?: unknown;
  fldtSaIGqknI4t1IM?: unknown;
  fld8xgcv4HEeW2NYF?: unknown;
  fld8IAHnls7oZUMOC?: unknown;
  fldSh9sHtkiOTkIwd?: unknown;
  fld7wFWvaROfYEQ8B?: unknown;
  fldGurfCRnIZNu8Dl?: unknown;
  fld00gbAzyZVvDWOt?: unknown;
  fldOJ9GzPbIQc7t7A?: unknown;
  fldMehHwe8j62Zmd3?: unknown;
  fldgntnzuRgEBSfdj?: unknown;
  fldJktpQOU9RRgy1t?: unknown;
  fldnW9tNzTBwHeB5k?: unknown;
  fld6yO2AJBtvihM9W?: unknown;
  fldzHUUvieCC7sZqz?: unknown;
};

export type RawExecutionApprovalFields = {
  fld4qJrGGMWtr09dp?: unknown;
  fldpAZh1st8qRqA7n?: unknown;
  fld82nUwa5hZGSDlF?: unknown;
  fldTjEOiF0qd1FgEd?: unknown;
  fldOCqFBKS8KuXSSV?: unknown;
  fldmg9acRqIp0zim0?: unknown;
  fldxJM4QXKh7kitBM?: unknown;
  fldFcJ6ODf1k5uSQq?: unknown;
  fldsMGqafeCRlN7zo?: unknown;
  fldeYPqA4yfUEee12?: unknown;
  flds6B6t8maAaevga?: unknown;
  fldDLbU0YVyUJN3WV?: unknown;
  fld2wVyMe3wyhYsqK?: unknown;
  fldmOfBYtD9CjxDx6?: unknown;
};

export type RawInstallerRateFields = {
  fldpoNfga22gQZsau?: unknown;
  fldB8SlJKO4BbLRbE?: unknown;
  fldm3OVYRryVl6bvx?: unknown;
  fldB06onBocNuTZmw?: unknown;
};

export type RawInstallerMonthlyPaymentFields = {
  fldcM0YGpLHWIg4PZ?: unknown;
  fldmSOmxfRd8UrDxg?: unknown;
  fld594iX5aq1LoMU5?: unknown;
  fldjSy3ma0Mt0PAPQ?: unknown;
  fldXjjBCkocB0DVJ7?: unknown;
  fldS6XbWsE6uMtPqp?: unknown;
  fldF8uamPnjnRE5xF?: unknown;
  fldHso8OGch2Bw937?: unknown;
  fldDwt9bGfyl20oSF?: unknown;
};

export type RawOrderFields = {
  fldDrP4MqsxV6EtJd?: unknown;
  fldZEobEKEQtMtoGV?: unknown;
  fldk7OdnVLITahJxd?: unknown;
  fldzNnG3a9uojQPyO?: unknown;
  fld5bh56XRJGJhrsz?: unknown;
  flduurO6CcPQx6oya?: unknown;
  fldwvbnGd8e3PAU7d?: unknown;
  flde2no9Qoof141vN?: unknown;
  flddZQjojnGZeZ5By?: unknown;
  fldPN0eZPJuSJSh8o?: unknown;
  fldoBnRqI3ZTZXorO?: unknown;
  fldOAbx5iIaFAihvt?: unknown;
  fldRZSAngZ2MzRg9v?: unknown;
  fldcsD7TEjjYB6kz3?: unknown;
  fldoXRciteMB9WdfP?: unknown;
  fld9OEARVSvYDuEdR?: unknown;
  fldFRK1Kz26jE99xR?: unknown;
  fldIJzxGrwPaDNACs?: unknown;
  fldws1tElgJlhMLR7?: unknown;
  fldJlbQJWexlStXRn?: unknown;
  fldUHtJ82z3U2eG6W?: unknown;
  fldEZ175gAwbH7vge?: unknown;
  fldVRFNFHjfXCzfD6?: unknown;
  fldvuJBwo3Qb4ub7p?: unknown;
  flduY6TY8M5stl1rX?: unknown;
  fldUYfYJE8EJC4CGq?: unknown;
  fldOwFIxHHujvMTfw?: unknown;
  fldtE1r6tMMj28HNF?: unknown;
  fldT6fSDKdVbhcPmw?: unknown;
  fldeKIQJg3CYLFLoS?: unknown;
  fldt9k7oNeFWYX37V?: unknown;
  fldgWWu4EYvJXQuHC?: unknown;
  fld5p9BH4axVPzKwV?: unknown;
  fldyJ3cRvlR9VTEWh?: unknown;
  fldtpYU0EOhDmLiD8?: unknown;
  fldwyz5aHZ4KJtJ43?: unknown;
};

export type RawOrderLineFields = {
  fldPxGffqlrfcYZIM?: unknown;
  fldnk3IiyNeTTGqsa?: unknown;
  fldQMHdPJ7OuF9QcG?: unknown;
  fldD2A7OjLTJP7qRj?: unknown;
  fldmfjeDAJIls5oWG?: unknown;
  fldhrAvwCw1grQHNI?: unknown;
  fldp4FofbLftwSYZ7?: unknown;
  fldxUifeVCCQaXNhV?: unknown;
  fldr1hhLfgIDGxhHS?: unknown;
  fldhCTBK9KWOQgZrg?: unknown;
};

export type RawInventoryFields = {
  fldYboj1U8ZHJK6aq?: unknown;
  fldHUiTkn1TFdW9n4?: unknown;
  fldexSWLxpnh3pP5k?: unknown;
  fldj2pdrmiHYKNwAI?: unknown;
  fldmKrx7PBJjv0zUH?: unknown;
  fldr4VIQAnulf5eIv?: unknown;
  fldWBgO3Bg3qi65dg?: unknown;
  fldgrSdEuxPne8fUH?: unknown;
  fld6KM7lmkfbmeGOe?: unknown;
};

export type RawInventoryMovementFields = {
  fldKRpqK9M9M0oODe?: unknown;
  fldG4ahYiyKWCGvoJ?: unknown;
  fldXNpU6Ga5KX9vic?: unknown;
  fldseUfuzw9ktKuRy?: unknown;
  fldRVE4yaMKwT5e1S?: unknown;
  fld4YI5VbouZBvKb3?: unknown;
  fld733WyctwcweOC6?: unknown;
  fldFqsW6nY2Q5Guvd?: unknown;
  fldtsmbAgTKPc7kUj?: unknown;
  fldModhBcaJqCP6na?: unknown;
  fldY3lYOKJbW1csjM?: unknown;
  fldoQUdwvZUId6wmd?: unknown;
  fld2R7ECUE1z42DJw?: unknown;
  fldtSkCxX3blv1xqa?: unknown;
  fldOl1NyruRJP2vzN?: unknown;
  fldQ8umCODTY80hBU?: unknown;
};

export type RawProductFields = {
  fldhnlxw7qtgFIHUc?: unknown;
  flddMBY4tu0y0TR1t?: unknown;
  fld7oDVwD2TD3960b?: unknown;
  fldldbeNRfgk6jrYA?: unknown;
  fldygZqbnX3OknW9b?: unknown;
  fldsl5TQHXUfg3EEH?: unknown;
  fldZQxtBcT4c324xc?: unknown;
  fldUdDB11R6kXBSPn?: unknown;
  fldrwR6l60DWTwQhF?: unknown;
  fldRlIlTLpDDR7cBl?: unknown;
};

export type RawTaskFields = {
  fld9pZpcEyipF5teB?: unknown;
  fldAP5bP6n8okIqec?: unknown;
  fldJQBgJQDdtQFvML?: unknown;
  fldtSaIGqknI4t1IM?: unknown;
  fld8xgcv4HEeW2NYF?: unknown;
  fld7wFWvaROfYEQ8B?: unknown;
  fldGurfCRnIZNu8Dl?: unknown;
  fldIcfmWGysvQYv8c?: unknown;
  fld00gbAzyZVvDWOt?: unknown;
  fldwCt6kfDJKCwRGl?: unknown;
  fldThdHcsu0pVe6wV?: unknown;
  flduXVUqqxhKDwV7i?: unknown;
  fldVo4YVjCEUBZ2JP?: unknown;
  fldnW9tNzTBwHeB5k?: unknown;
  fld6yO2AJBtvihM9W?: unknown;
  fldzHUUvieCC7sZqz?: unknown;
  כותרת?: string;
  סטטוס?: string;
  "תאריך מתוכנן"?: string;
  מתקין?: AirtableLinkedRecord;
  לקוח?: AirtableLinkedRecord;
  הזמנה?: AirtableLinkedRecord;
};

export type RawQuoteFields = {
  fldFfYboIrcFejtHN?: unknown;
  fld07wwSMqvzYk0s4?: unknown;
  fldPYvrQHENHZC8pJ?: unknown;
  fldhF5IRofdRLTkhN?: unknown;
  fldf9PSV2gFZxXsxY?: unknown;
  fldN4EILKJZND3FOf?: unknown;
  fldOY3RLPblIPoz60?: unknown;
  fldHnLVvPoqT0VHvA?: unknown;
  fldF5hky2jB0vs5GY?: unknown;
  fldrtuHdHK8SEKLfM?: unknown;
  fldzlKcHkLftZVxFM?: unknown;
  fldh8tz1xgQNCNGgH?: unknown;
  fldgzZ3UQE6FOil0T?: unknown;
  fldv6P5NJkh207aJR?: unknown;
  fldPt89KYMnfPHc1X?: unknown;
  fldzFSTLmY8eMk2zF?: unknown;
  fldAD8QmPrnCbZhu2?: unknown;
  fldcS4I85kjhbKZbJ?: unknown;
  fldGnHde4OSCi00ue?: unknown;
  fldtxUhlZi7FeSJX3?: unknown;
  fld8TK2mavUQZ39Q2?: unknown;
  fldtuIXm9M6hJThCV?: unknown;
  fldGmiTEukzdMMRLk?: unknown;
  fldQWyr3BZl4bxTBb?: unknown;
  fldRwScbjjUrYde6X?: unknown;
  fldc6kFepSAl5rLw4?: unknown;
  fldKNXfM18R4OtfGk?: unknown;
};

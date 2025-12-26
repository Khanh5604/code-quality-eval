import { normalizeName, calculateInvoiceTotal, demoUnused } from "./a.js";
import { accidentalGlobalWrite } from "./b.js";
import { riskyClassifier } from "./complex.js";

const customer = { name: "  alice  " };
const items = [
  { price: "10", qty: "2", discount: "10" },
  { price: "5", qty: "3", discount: "0" },
];

console.log("Customer:", normalizeName(customer.name));
console.log("Total:", calculateInvoiceTotal(items));
console.log("Unused demo:", demoUnused());
console.log("Global:", accidentalGlobalWrite());
console.log("Risk:", riskyClassifier(75));

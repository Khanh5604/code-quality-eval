export function calculateInvoiceTotal(items) {
  let total = 0;

  for (const it of items) {
    // duplicated block begins (same as src/a.js)
    const price = Number(it.price) || 0;
    const qty = Number(it.qty) || 0;
    const discount = Number(it.discount) || 0;
    const line = price * qty;
    const discounted = line - (line * discount) / 100;
    total += discounted;
    // duplicated block ends
  }

  return total;
}

export function accidentalGlobalWrite() {
  // assigning to undeclared variable -> no-undef (error)
  notDeclared = 5;
  return notDeclared;
}

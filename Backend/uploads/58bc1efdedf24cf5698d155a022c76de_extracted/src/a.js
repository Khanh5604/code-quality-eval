// Intentionally minimal comments -> low comment density.
export function normalizeName(name) {
  // Using == on purpose to trigger eqeqeq
  if (name == null) return "UNKNOWN";
  const trimmed = name.trim();
  return trimmed.length ? trimmed.toUpperCase() : "UNKNOWN";
}

export function calculateInvoiceTotal(items) {
  let total = 0;
  for (const it of items) {
    // duplicated block begins
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

export function demoUnused() {
  const unusedVar = 123; // no-unused-vars (error)
  console.log("This is a demo"); // no-console (warn)
  return 42;
}

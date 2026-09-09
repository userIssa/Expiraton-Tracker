const XLSX = require('xlsx');

// Inline tests for parser logic
const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseFlexibleDate(val, isExpiry = false) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'n/a') return null;

  const monYearMatch = str.match(/^([a-zA-Z]+)[-/\s](\d{2,4})$/);
  if (monYearMatch) {
    const monStr = monYearMatch[1].toLowerCase();
    let yearNum = Number(monYearMatch[2]);
    if (yearNum < 100) yearNum += 2000;
    if (MONTHS[monStr] !== undefined) {
      const monthIdx = MONTHS[monStr];
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      if (isExpiry) {
        const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
        return `${yearNum}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      } else {
        return `${yearNum}-${monthStr}-01`;
      }
    }
  }

  const yearMonMatch = str.match(/^(\d{2,4})[-/\s]([a-zA-Z]+)$/);
  if (yearMonMatch) {
    let yearNum = Number(yearMonMatch[1]);
    if (yearNum < 100) yearNum += 2000;
    const monStr = yearMonMatch[2].toLowerCase();
    if (MONTHS[monStr] !== undefined) {
      const monthIdx = MONTHS[monStr];
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      if (isExpiry) {
        const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
        return `${yearNum}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      } else {
        return `${yearNum}-${monthStr}-01`;
      }
    }
  }

  return null;
}

console.log("Testing date parsing:");
console.log("Jan-26 (prod):", parseFlexibleDate("Jan-26", false)); // 2026-01-01
console.log("Dec-28 (exp):", parseFlexibleDate("Dec-28", true));   // 2028-12-31
console.log("2026-Aug (prod):", parseFlexibleDate("2026-Aug", false)); // 2026-08-01
console.log("Jul-28 (exp):", parseFlexibleDate("Jul-28", true));   // 2028-07-31
console.log("Feb-27 (exp):", parseFlexibleDate("Feb-27", true));   // 2027-02-28

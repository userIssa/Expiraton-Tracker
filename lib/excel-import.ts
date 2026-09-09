import * as XLSX from 'xlsx';

export interface ParsedBatchRow {
  id: string;
  name: string;
  SKU?: string;
  batchNumber: string;
  manufactureDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
  cost?: number;
  location?: string;
  category?: string;
  isValid: boolean;
  warnings: string[];
}

export interface ParseResult {
  fileName: string;
  sheetName: string;
  totalRows: number;
  validRows: number;
  rows: ParsedBatchRow[];
  detectedColumns: Record<string, string>;
}

// Map of month names/abbreviations to month index (0-11)
const MONTHS: Record<string, number> = {
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

/**
 * Flexible Date Parser
 * Handles:
 * - "Jan-26", "Dec-28", "Feb-27"
 * - "2026-Aug", "Aug-2026", "2026-08"
 * - Excel date numbers (e.g., 46000)
 * - Standard "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"
 * - isExpiry: if true and day is unspecified, uses end of month. If false, uses 1st of month.
 */
export function parseFlexibleDate(val: any, isExpiry = false): string | null {
  if (val === null || val === undefined || val === '') return null;

  // Handle native Date objects
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().substring(0, 10);
  }

  // Handle Excel numerical date serial
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '2000');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fall through to string handling
    }
  }

  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'nil') return null;

  // 1. Check for standard YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(Number(isoMatch[2])).padStart(2, '0');
    const d = String(Number(isoMatch[3])).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Check for DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (slashMatch) {
    // Assume DD/MM/YYYY
    let d = Number(slashMatch[1]);
    let m = Number(slashMatch[2]);
    const y = slashMatch[3];
    if (m > 12 && d <= 12) {
      // Swap if MM/DD/YYYY was provided
      const temp = m;
      m = d;
      d = temp;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // 3. Pattern: "Jan-26" or "Aug-26" (Mon-YY or Mon-YYYY)
  const monYearMatch = str.match(/^([a-zA-Z]+)[-/\s](\d{2,4})$/);
  if (monYearMatch) {
    const monStr = monYearMatch[1].toLowerCase();
    let yearNum = Number(monYearMatch[2]);
    if (yearNum < 100) yearNum += 2000;

    if (MONTHS[monStr] !== undefined) {
      const monthIdx = MONTHS[monStr];
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      if (isExpiry) {
        // Last day of that month
        const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
        return `${yearNum}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      } else {
        // First day of that month
        return `${yearNum}-${monthStr}-01`;
      }
    }
  }

  // 4. Pattern: "2026-Aug" or "26-Aug" (YYYY-Mon or YY-Mon)
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

  // 5. Pattern: "2026-08" or "08-2026" (Year-Month without day)
  const ymMatch = str.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (ymMatch) {
    const yearNum = Number(ymMatch[1]);
    const monthNum = Number(ymMatch[2]);
    if (monthNum >= 1 && monthNum <= 12) {
      const monthStr = String(monthNum).padStart(2, '0');
      if (isExpiry) {
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        return `${yearNum}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      } else {
        return `${yearNum}-${monthStr}-01`;
      }
    }
  }

  // Fallback try with JS Date
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().substring(0, 10);
  }

  return null;
}

/**
 * Generate a clean SKU from product name if none provided
 */
export function generateAutoSku(name: string, category = 'ITEM'): string {
  const cleanCat = category.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'GEN';
  const cleanName = name
    .trim()
    .toUpperCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${cleanCat}-${cleanName}-${randomSuffix}`;
}

/**
 * Generate a fallback batch number if sheet has 'N/A' or blank
 */
export function generateAutoBatchNumber(index: number, name = 'BATCH'): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(index + 1).padStart(3, '0');
  const cleanPrefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'ST';
  return `${cleanPrefix}-${y}${m}-${seq}`;
}

/**
 * Parse Excel Buffer or File into structured rows
 */
export function parseInventorySpreadsheet(
  data: ArrayBuffer | Uint8Array,
  defaults: {
    category?: string;
    location?: string;
    quantity?: number;
    unit?: string;
  } = {}
): ParseResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to raw array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded spreadsheet is empty.');
  }

  // Step 1: Detect header row (scan first 5 rows)
  let headerRowIndex = -1;
  const detectedCols: Record<string, number> = {};

  const fieldPatterns: Record<string, RegExp[]> = {
    name: [/item/i, /product/i, /name/i, /description/i, /material/i],
    batch: [/batch/i, /lot/i, /batch\s*number/i, /batch\s*no/i],
    mfgDate: [/production/i, /mfg/i, /manufacture/i, /prod\s*date/i, /production\s*date/i],
    expiryDate: [/exppiry/i, /expiry/i, /exp/i, /expiration/i, /best\s*before/i, /use\s*by/i],
    quantity: [/qty/i, /quantity/i, /count/i, /units/i, /stock/i],
    unit: [/unit/i, /uom/i, /measure/i, /packaging/i],
    sku: [/sku/i, /code/i, /item\s*code/i, /product\s*code/i],
    location: [/location/i, /warehouse/i, /zone/i, /bin/i],
    cost: [/cost/i, /price/i, /rate/i],
    category: [/category/i, /cat/i, /type/i],
  };

  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    const matches: Record<string, number> = {};

    row.forEach((cellVal: any, colIdx: number) => {
      const cellText = String(cellVal || '').trim();
      if (!cellText) return;

      for (const [field, regexList] of Object.entries(fieldPatterns)) {
        if (matches[field] === undefined) {
          for (const regex of regexList) {
            if (regex.test(cellText)) {
              matches[field] = colIdx;
              break;
            }
          }
        }
      }
    });

    // We consider it a header row if it matches at least 'name' or ('batch' and ('mfgDate' or 'expiryDate'))
    if (matches.name !== undefined || (matches.batch !== undefined && matches.expiryDate !== undefined)) {
      headerRowIndex = r;
      Object.assign(detectedCols, matches);
      break;
    }
  }

  if (headerRowIndex === -1) {
    // If no header found, assume row 0 or default positional mapping:
    // Col 0: Item, Col 1: Batch Number, Col 2 or 3: Mfg Date, Col 3 or 4: Expiry Date
    headerRowIndex = 0;
    detectedCols.name = 0;
    detectedCols.batch = 1;
    detectedCols.mfgDate = 2;
    detectedCols.expiryDate = 3;
  }

  const detectedColNames: Record<string, string> = {};
  const headerRow = rawRows[headerRowIndex] || [];
  for (const [key, idx] of Object.entries(detectedCols)) {
    detectedColNames[key] = String(headerRow[idx] || `Col ${idx + 1}`);
  }

  const defaultCategory = defaults.category || 'Dry Foods';
  const defaultLocation = defaults.location || 'Dry Warehouse';
  const defaultQuantity = defaults.quantity || 1;
  const defaultUnit = defaults.unit || 'Bag';

  // Step 2: Parse data rows
  const parsedRows: ParsedBatchRow[] = [];
  let autoBatchCounter = 1;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every((c) => c === '' || c === null || c === undefined)) {
      continue;
    }

    const rawName = detectedCols.name !== undefined ? String(row[detectedCols.name] || '').trim() : '';
    // Skip row if it looks like another subheader or completely blank name
    if (!rawName || rawName.toLowerCase() === 'items' || rawName.toLowerCase() === 'product name') {
      continue;
    }

    let rawBatch = detectedCols.batch !== undefined ? String(row[detectedCols.batch] || '').trim() : '';
    const rawMfg = detectedCols.mfgDate !== undefined ? row[detectedCols.mfgDate] : '';
    const rawExp = detectedCols.expiryDate !== undefined ? row[detectedCols.expiryDate] : '';
    const rawQty = detectedCols.quantity !== undefined ? Number(row[detectedCols.quantity]) : NaN;
    const rawUnit = detectedCols.unit !== undefined ? String(row[detectedCols.unit] || '').trim() : '';
    const rawSku = detectedCols.sku !== undefined ? String(row[detectedCols.sku] || '').trim() : '';
    const rawCost = detectedCols.cost !== undefined ? Number(row[detectedCols.cost]) : NaN;
    const rawLoc = detectedCols.location !== undefined ? String(row[detectedCols.location] || '').trim() : '';
    const rawCat = detectedCols.category !== undefined ? String(row[detectedCols.category] || '').trim() : '';

    const warnings: string[] = [];

    // Check & fallback batch number
    if (!rawBatch || rawBatch.toUpperCase() === 'N/A' || rawBatch.toUpperCase() === 'NIL') {
      rawBatch = generateAutoBatchNumber(autoBatchCounter++, rawName);
      warnings.push(`Batch number was missing/N/A; assigned "${rawBatch}".`);
    }

    // Parse Dates
    const mfgDate = parseFlexibleDate(rawMfg, false);
    const expiryDate = parseFlexibleDate(rawExp, true);

    if (!expiryDate) {
      warnings.push('Invalid or missing expiry date.');
    }

    const resolvedQty = !isNaN(rawQty) && rawQty > 0 ? rawQty : defaultQuantity;
    const resolvedUnit = rawUnit || defaultUnit;
    const resolvedLocation = rawLoc || defaultLocation;
    const resolvedCategory = rawCat || defaultCategory;
    const resolvedSku = rawSku || generateAutoSku(rawName, resolvedCategory);

    // Fallback production date to today if absent
    const finalMfgDate = mfgDate || new Date().toISOString().substring(0, 10);
    if (!mfgDate) {
      warnings.push('Production date missing; defaulted to registration date.');
    }

    const isValid = Boolean(rawName && rawBatch && expiryDate);

    parsedRows.push({
      id: `row-${r}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: rawName,
      SKU: resolvedSku,
      batchNumber: rawBatch,
      manufactureDate: finalMfgDate,
      expiryDate: expiryDate || '',
      quantity: resolvedQty,
      unit: resolvedUnit,
      cost: !isNaN(rawCost) ? rawCost : undefined,
      location: resolvedLocation,
      category: resolvedCategory,
      isValid,
      warnings,
    });
  }

  return {
    fileName: '',
    sheetName: firstSheetName,
    totalRows: parsedRows.length,
    validRows: parsedRows.filter((r) => r.isValid).length,
    rows: parsedRows,
    detectedColumns: detectedColNames,
  };
}

/**
 * Generate a Sample Excel Spreadsheet Template
 */
export function generateSampleExcelBuffer(): Uint8Array {
  const sampleData = [
    {
      'ITEMS': 'BASMATI RICE',
      'BATCH NUMBER': 'ST/6500703',
      'PRODUCTION DATE': 'Jan-26',
      'EXPPIRY DATE': 'Dec-28',
      'QUANTITY': 50,
      'UNIT': 'Bag',
      'LOCATION': 'Dry Warehouse',
    },
    {
      'ITEMS': 'GOLDEN SEMOVITA',
      'BATCH NUMBER': '1/2C',
      'PRODUCTION DATE': 'Aug-26',
      'EXPPIRY DATE': 'Feb-27',
      'QUANTITY': 30,
      'UNIT': 'Carton',
      'LOCATION': 'Dry Warehouse',
    },
    {
      'ITEMS': 'GRANULATED SUGAR',
      'BATCH NUMBER': '56',
      'PRODUCTION DATE': '2026-Aug',
      'EXPPIRY DATE': 'Jul-28',
      'QUANTITY': 40,
      'UNIT': 'Bag',
      'LOCATION': 'Dry Warehouse',
    },
    {
      'ITEMS': 'PLANTAIN FLOUR',
      'BATCH NUMBER': 'N/A',
      'PRODUCTION DATE': 'May-26',
      'EXPPIRY DATE': 'May-27',
      'QUANTITY': 25,
      'UNIT': 'Bag',
      'LOCATION': 'Dry Warehouse',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dry Warehouse Items');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

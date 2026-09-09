'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { parseInventorySpreadsheet, ParsedBatchRow } from '@/lib/excel-import';

interface Product {
  _id: string;
  name: string;
  SKU: string;
  category: string;
  unit: string;
  defaultShelfLifeDays: number;
  cost?: number;
}

export default function RegisterBatchPage() {
  const router = useRouter();

  // Mode Switcher: Manual Single Entry vs Bulk Spreadsheet Import
  const [entryMode, setEntryMode] = useState<'manual' | 'import'>('manual');

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Fields (Manual Mode)
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productCategory, setProductCategory] = useState('Dairy');
  const [productUnit, setProductUnit] = useState('Litre Bottle');
  const [defaultShelfLife, setDefaultShelfLife] = useState('14');
  const [productCost, setProductCost] = useState('');

  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Bulk Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedBatchRow[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState<{
    importedCount: number;
    createdProductsCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  // Import Default Settings
  const [defaultImportCategory, setDefaultImportCategory] = useState('Dry Foods');
  const [defaultImportLocation, setDefaultImportLocation] = useState('Dry Warehouse');
  const [defaultImportQuantity, setDefaultImportQuantity] = useState(1);
  const [defaultImportUnit, setDefaultImportUnit] = useState('Bag');

  // UI Status
  const [urgencyPreview, setUrgencyPreview] = useState({ text: 'Awaiting Date', color: 'gray' });
  const [categories, setCategories] = useState<string[]>([
    'Dairy',
    'Bakery',
    'Meat & Seafood',
    'Canned Goods',
  ]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL query param for initial mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'import') {
        setEntryMode('import');
      }
    }
  }, []);

  // Fetch all products and dynamic categories/thresholds
  useEffect(() => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProducts(data))
      .catch(() => {});

    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.categories && data.categories.length > 0) {
          setCategories(data.categories);
          if (data.thresholds && data.thresholds.length > 0) {
            setThresholds(data.thresholds);
          }
        }
      })
      .catch(() => {
        setThresholds([
          { category: 'Dairy', greenMinDays: 30, yellowMinDays: 15, orangeMinDays: 7, redMinDays: 3 },
          { category: 'Bakery', greenMinDays: 7, yellowMinDays: 4, orangeMinDays: 2, redMinDays: 1 },
          { category: 'Meat & Seafood', greenMinDays: 14, yellowMinDays: 7, orangeMinDays: 3, redMinDays: 1 },
          { category: 'Canned Goods', greenMinDays: 120, yellowMinDays: 60, orangeMinDays: 30, redMinDays: 15 },
        ]);
      });
  }, []);

  // Filter products by SKU typing
  useEffect(() => {
    if (!skuSearch || selectedProduct) {
      setFilteredProducts([]);
      return;
    }
    const matched = products.filter((p) =>
      p.SKU.toLowerCase().includes(skuSearch.toLowerCase()) ||
      p.name.toLowerCase().includes(skuSearch.toLowerCase())
    );
    setFilteredProducts(matched.slice(0, 5));
  }, [skuSearch, products, selectedProduct]);

  // Update Expiry Date automatically when manufactureDate changes using defaultShelfLife
  const handleMfgDateChange = (val: string) => {
    setManufactureDate(val);
    if (val && defaultShelfLife) {
      const date = new Date(val);
      date.setDate(date.getDate() + Number(defaultShelfLife));
      setExpiryDate(date.toISOString().substring(0, 10));
    }
  };

  // Preview Urgency Chip based on Expiry Date
  useEffect(() => {
    if (!expiryDate) {
      setUrgencyPreview({ text: 'Awaiting Date', color: 'gray' });
      return;
    }

    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryMidnight = new Date(expiry);
    expiryMidnight.setHours(0, 0, 0, 0);

    const diffTime = expiryMidnight.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Get current category thresholds
    const currentThreshold = thresholds.find((t) => t.category === productCategory) || {
      greenMinDays: 30,
      yellowMinDays: 15,
      orangeMinDays: 7,
      redMinDays: 3,
    };

    if (diffDays <= 0) {
      setUrgencyPreview({ text: 'Expired', color: 'maroon' });
    } else if (diffDays < currentThreshold.redMinDays) {
      setUrgencyPreview({ text: `Urgent (${diffDays}d)`, color: 'red' });
    } else if (diffDays < currentThreshold.orangeMinDays) {
      setUrgencyPreview({ text: `Monitor (${diffDays}d) - Watch`, color: 'orange' });
    } else if (diffDays < currentThreshold.yellowMinDays) {
      setUrgencyPreview({ text: `Monitor (${diffDays}d) - Safe`, color: 'yellow' });
    } else {
      setUrgencyPreview({ text: `Fresh (${diffDays}d)`, color: 'green' });
    }
  }, [expiryDate, productCategory, thresholds]);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductName(p.name);
    setProductSku(p.SKU);
    if (!categories.includes(p.category)) {
      setCategories((prev) => [...prev, p.category].sort((a, b) => a.localeCompare(b)));
    }
    setProductCategory(p.category);
    setProductUnit(p.unit);
    setDefaultShelfLife(String(p.defaultShelfLifeDays));
    setProductCost(p.cost !== undefined ? String(p.cost) : '');
    setSkuSearch(p.SKU);

    // Auto-calculate expiry if mfg date is filled
    if (manufactureDate) {
      const date = new Date(manufactureDate);
      date.setDate(date.getDate() + p.defaultShelfLifeDays);
      setExpiryDate(date.toISOString().substring(0, 10));
    }
  };

  const clearSelectedProduct = () => {
    setSelectedProduct(null);
    setProductName('');
    setProductSku('');
    setSkuSearch('');
    setProductCost('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Construct request
    const batchPayload = {
      productId: selectedProduct?._id || undefined,
      productDetails: selectedProduct ? undefined : {
        name: productName,
        SKU: productSku,
        category: productCategory,
        unit: productUnit,
        defaultShelfLifeDays: Number(defaultShelfLife || 0),
        cost: productCost ? Number(productCost) : undefined,
      },
      batchNumber,
      quantity: Number(quantity),
      location,
      purchaseDate,
      manufactureDate,
      expiryDate,
    };

    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register stock batch');

      router.push('/inventory');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getUrgencyPreviewClass = (color: string) => {
    switch (color) {
      case 'maroon':
        return 'bg-urgency-maroon-bg border-urgency-maroon-border text-urgency-maroon-text';
      case 'red':
        return 'bg-urgency-red-bg border-urgency-red-border text-urgency-red-text';
      case 'orange':
        return 'bg-urgency-orange-bg border-urgency-orange-border text-urgency-orange-text';
      case 'yellow':
        return 'bg-urgency-yellow-bg border-urgency-yellow-border text-urgency-yellow-text';
      case 'green':
        return 'bg-urgency-green-bg border-urgency-green-border text-urgency-green-text';
      default:
        return 'bg-surface-container-high border-outline-variant text-on-surface';
    }
  };

  // Helper for computing row urgency live in the preview table
  const computeRowUrgency = (expiryDateStr: string, category: string): { color: string; label: string } => {
    if (!expiryDateStr) return { color: 'gray', label: 'No Date' };
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) return { color: 'gray', label: 'Invalid' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryMidnight = new Date(expiry);
    expiryMidnight.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiryMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return { color: 'maroon', label: `Expired (${Math.abs(diffDays)}d ago)` };
    }

    const t = thresholds.find((item) => item.category.toLowerCase() === category.toLowerCase());
    const redDays = t ? t.redMinDays : 3;
    const orangeDays = t ? t.orangeMinDays : 7;
    const yellowDays = t ? t.yellowMinDays : 15;

    if (diffDays <= redDays) {
      return { color: 'red', label: `Critical (${diffDays}d)` };
    } else if (diffDays <= orangeDays) {
      return { color: 'orange', label: `High Risk (${diffDays}d)` };
    } else if (diffDays <= yellowDays) {
      return { color: 'yellow', label: `Monitor (${diffDays}d)` };
    } else {
      return { color: 'green', label: `Fresh (${diffDays}d)` };
    }
  };

  const handleFileSelect = async (file: File) => {
    setImportError('');
    setImportSuccess(null);
    setIsParsing(true);
    setImportFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseInventorySpreadsheet(buffer, {
        category: defaultImportCategory,
        location: defaultImportLocation,
        quantity: defaultImportQuantity,
        unit: defaultImportUnit,
      });

      if (result.rows.length === 0) {
        throw new Error('No item rows could be found in the uploaded spreadsheet.');
      }

      setParsedRows(result.rows);
      setDetectedColumns(result.detectedColumns);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse spreadsheet file.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const updateParsedRow = (id: string, field: keyof ParsedBatchRow, value: any) => {
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        updated.isValid = Boolean(updated.name && updated.batchNumber && updated.expiryDate);
        return updated;
      })
    );
  };

  const removeParsedRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportError('No valid rows available to import.');
      return;
    }

    setIsImporting(true);
    setImportError('');
    try {
      const res = await fetch('/api/batches/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batches: validRows,
          defaultCategory: defaultImportCategory,
          defaultLocation: defaultImportLocation,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');

      setImportSuccess(data);
      if (!data.errors || data.errors.length === 0) {
        setParsedRows([]);
        setImportFile(null);
      }
    } catch (err: any) {
      setImportError(err.message || 'Something went wrong during bulk import.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Register Stock Batch</h1>
            <p className="text-sm text-on-surface-variant font-medium">Record a new incoming catalog item or import warehouse inventory sheets.</p>
          </div>

          <a
            href="/api/batches/import/template"
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-outline-variant bg-surface hover:bg-surface-container-high rounded text-xs font-bold text-on-surface transition-colors cursor-pointer w-fit shadow-xs"
          >
            <span className="material-symbols-outlined text-secondary text-[18px]">download</span>
            <span>Download Sample Excel Template</span>
          </a>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-outline-variant gap-4">
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              entryMode === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">edit_note</span>
            <span>Single Item Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('import')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              entryMode === 'import'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            <span>Bulk Spreadsheet Import (.xlsx, .csv)</span>
          </button>
        </div>

        {error && entryMode === 'manual' && (
          <div className="bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-sm flex items-center gap-2 max-w-4xl">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {entryMode === 'manual' ? (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
          {/* Left Column: Product Definition */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden space-y-4 shadow-xs">
            <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
            <h2 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary fill-icon">inventory_2</span>
              Product Reference
            </h2>

            {/* SKU Lookup search box */}
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                Catalog Lookup (SKU or Name)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  placeholder="Type SKU or Name to search..."
                  disabled={selectedProduct !== null}
                />
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={clearSelectedProduct}
                    className="px-3 py-2 border border-primary text-primary hover:bg-urgency-red-bg/10 rounded text-xs font-bold transition-all cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>

              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-surface border border-outline-variant rounded mt-1 shadow-lg z-30 divide-y divide-outline-variant/30">
                  {filteredProducts.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => selectProduct(p)}
                      className="w-full px-4 py-2 text-left hover:bg-surface-container-low text-sm font-semibold flex justify-between items-center cursor-pointer"
                    >
                      <span>{p.name}</span>
                      <span className="font-mono text-xs text-on-surface-variant">SKU: {p.SKU}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product parameters */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={selectedProduct !== null}
                  required
                  placeholder="Organic Whole Milk 1L"
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm disabled:bg-surface-container disabled:text-on-surface-variant/80 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Product SKU
                  </label>
                  <input
                    type="text"
                    value={productSku}
                    onChange={(e) => setProductSku(e.target.value)}
                    disabled={selectedProduct !== null}
                    required
                    placeholder="DAIRY-01"
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm disabled:bg-surface-container disabled:text-on-surface-variant/80 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Category
                  </label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    disabled={selectedProduct !== null}
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm disabled:bg-surface-container disabled:text-on-surface-variant/80 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Inventory Unit
                  </label>
                  <input
                    type="text"
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    disabled={selectedProduct !== null}
                    required
                    placeholder="e.g. Litre Bottle, 1kg Bag"
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm disabled:bg-surface-container disabled:text-on-surface-variant/80 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Default Shelf-Life (Days)
                  </label>
                  <input
                    type="number"
                    value={defaultShelfLife}
                    onChange={(e) => setDefaultShelfLife(e.target.value)}
                    disabled={selectedProduct !== null}
                    required
                    min={0}
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm disabled:bg-surface-container disabled:text-on-surface-variant/80 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Cost per Unit (₦) <span className="text-on-surface-variant/60 font-normal lowercase italic">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-on-surface-variant text-sm font-semibold font-sans">₦</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productCost}
                      onChange={(e) => setProductCost(e.target.value)}
                      disabled={selectedProduct !== null}
                      placeholder="e.g. 5.50"
                      className="pl-7 pr-3 py-2 block w-full border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm disabled:bg-surface-container disabled:text-on-surface-variant/80 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Batch Parameters */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden space-y-4 shadow-xs">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary fill-icon">calendar_month</span>
                Batch Details
              </h2>
              {/* Urgency Preview Chip */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold font-mono tracking-wider transition-colors duration-300 ${getUrgencyPreviewClass(urgencyPreview.color)}`}>
                <span className="material-symbols-outlined text-[16px]">{urgencyPreview.color === 'gray' ? 'info' : 'warning'}</span>
                <span>{urgencyPreview.text}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  required
                  placeholder="e.g. B-MILK-102"
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Quantity Received
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  min={1}
                  placeholder="e.g. 50"
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                Storage Location / Zone
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g. Cold-A2, Shelf-B3"
                className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                  className="block w-full px-2 py-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Mfg Date
                </label>
                <input
                  type="date"
                  value={manufactureDate}
                  onChange={(e) => handleMfgDateChange(e.target.value)}
                  required
                  className="block w-full px-2 py-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                  className="block w-full px-2 py-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
            </div>

            <div className="pt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => router.push('/inventory')}
                className="px-5 py-2.5 border border-outline-variant hover:bg-surface-container-low rounded font-bold text-sm cursor-pointer text-on-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-primary text-on-primary rounded font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Batch'}
              </button>
            </div>
          </div>
        </form>
        ) : (
          /* Bulk Spreadsheet Import View */
          <div className="space-y-6 max-w-6xl">
            {importSuccess && (
              <div className="bg-urgency-green-bg border border-urgency-green-border text-urgency-green-text rounded-xl p-5 space-y-3 animate-fade-in shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
                  <h3 className="text-base font-bold">Bulk Import Completed Successfully!</h3>
                </div>
                <p className="text-sm font-medium">
                  Successfully imported <strong>{importSuccess.importedCount}</strong> batches across{' '}
                  <strong>{importSuccess.createdProductsCount}</strong> newly cataloged products.
                  {importSuccess.skippedCount > 0 && ` (${importSuccess.skippedCount} rows were skipped)`}
                </p>
                {importSuccess.errors && importSuccess.errors.length > 0 && (
                  <div className="text-xs bg-surface/70 border border-outline-variant rounded p-3 text-on-surface space-y-1">
                    <p className="font-bold text-urgency-orange-text">Review Notes / Warnings:</p>
                    <ul className="list-disc pl-5 space-y-0.5 max-h-32 overflow-y-auto">
                      {importSuccess.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href="/inventory"
                    className="px-4 py-2 bg-primary text-on-primary rounded font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    <span>View Imported Inventory</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setImportSuccess(null);
                      setImportFile(null);
                      setParsedRows([]);
                    }}
                    className="px-4 py-2 border border-outline-variant rounded font-bold text-xs bg-surface text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    Import Another File
                  </button>
                </div>
              </div>
            )}

            {importError && (
              <div className="bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span className="font-semibold">{importError}</span>
              </div>
            )}

            {/* Step 1: Configuration Presets */}
            <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-xs space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface font-mono flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[16px]">tune</span>
                  <span>1. Import Defaults & Target Configuration</span>
                </h3>
                <span className="text-[11px] text-on-surface-variant font-medium">Applied to rows missing category or location</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Target Category
                  </label>
                  <select
                    value={defaultImportCategory}
                    onChange={(e) => setDefaultImportCategory(e.target.value)}
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Warehouse / Location
                  </label>
                  <input
                    type="text"
                    value={defaultImportLocation}
                    onChange={(e) => setDefaultImportLocation(e.target.value)}
                    placeholder="Dry Warehouse"
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Default Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={defaultImportQuantity}
                    onChange={(e) => setDefaultImportQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Default Packaging Unit
                  </label>
                  <input
                    type="text"
                    value={defaultImportUnit}
                    onChange={(e) => setDefaultImportUnit(e.target.value)}
                    placeholder="Bag, Carton, Unit"
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Upload Zone */}
            <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface font-mono flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[16px]">file_upload</span>
                <span>2. Upload Warehouse Spreadsheet</span>
              </h3>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-outline-variant hover:border-secondary transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-surface-container-lowest group"
                onClick={() => {
                  const input = document.getElementById('excel-file-input');
                  if (input) input.click();
                }}
              >
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <span className="material-symbols-outlined text-secondary text-5xl mb-2 group-hover:scale-105 transition-transform">
                  description
                </span>
                <p className="font-bold text-on-surface text-base">
                  {importFile ? importFile.name : 'Drag and drop your Excel or CSV file here'}
                </p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-md">
                  {importFile
                    ? `${(importFile.size / 1024).toFixed(1)} KB — Click or drop another file to replace`
                    : 'Auto-detects items, batch numbers (including N/A), production dates, and expiry dates (e.g. Jan-26, 2026-Aug, Dec-28)'}
                </p>
                {!importFile && (
                  <button
                    type="button"
                    className="mt-4 px-4 py-2 bg-primary text-on-primary rounded text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Select File from Device
                  </button>
                )}
              </div>
            </div>

            {/* Step 3: Interactive Preview & Edit Table */}
            {isParsing && (
              <div className="bg-surface border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                <p className="font-semibold text-sm">Parsing spreadsheet data and detecting dates...</p>
              </div>
            )}

            {parsedRows.length > 0 && !isParsing && (
              <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-outline-variant">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">table_chart</span>
                      <span>3. Data Verification & Preview</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant">Review, tweak, or remove items before confirming the import.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high font-mono text-xs font-bold text-on-surface">
                      Total: {parsedRows.length}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-urgency-green-bg text-urgency-green-text font-mono text-xs font-bold">
                      Valid: {parsedRows.filter((r) => r.isValid).length}
                    </span>
                    {parsedRows.some((r) => !r.isValid) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-urgency-red-bg text-urgency-red-text font-mono text-xs font-bold">
                        Issues: {parsedRows.filter((r) => !r.isValid).length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto border border-outline-variant rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-high border-b border-outline-variant text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">
                      <tr>
                        <th className="py-2.5 px-3 w-12">#</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Product / Item Name</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Batch Number</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Production Date</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Expiry Date</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Live Urgency</th>
                        <th className="py-2.5 px-3 w-20">Qty</th>
                        <th className="py-2.5 px-3 w-24">Unit</th>
                        <th className="py-2.5 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60 bg-surface">
                      {parsedRows.map((row, idx) => {
                        const urgency = computeRowUrgency(row.expiryDate, row.category || defaultImportCategory);
                        return (
                          <tr key={row.id} className="hover:bg-surface-container-low/40 transition-colors">
                            <td className="py-2 px-3 font-mono text-on-surface-variant font-bold">
                              {idx + 1}
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => updateParsedRow(row.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-semibold focus:outline-none focus:border-secondary"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.batchNumber}
                                onChange={(e) => updateParsedRow(row.id, 'batchNumber', e.target.value)}
                                className="w-full px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface font-mono focus:outline-none focus:border-secondary"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="date"
                                value={row.manufactureDate}
                                onChange={(e) => updateParsedRow(row.id, 'manufactureDate', e.target.value)}
                                className="w-full px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface focus:outline-none focus:border-secondary"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="date"
                                value={row.expiryDate}
                                onChange={(e) => updateParsedRow(row.id, 'expiryDate', e.target.value)}
                                className={`w-full px-2 py-1 bg-surface-container-lowest border rounded text-xs text-on-surface focus:outline-none focus:border-secondary ${
                                  !row.expiryDate ? 'border-urgency-red-border bg-urgency-red-bg/20' : 'border-outline-variant'
                                }`}
                              />
                            </td>

                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                                  urgency.color === 'maroon'
                                    ? 'bg-urgency-maroon-bg border border-urgency-maroon-border text-urgency-maroon-text'
                                    : urgency.color === 'red'
                                    ? 'bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text'
                                    : urgency.color === 'orange'
                                    ? 'bg-urgency-orange-bg border border-urgency-orange-border text-urgency-orange-text'
                                    : urgency.color === 'yellow'
                                    ? 'bg-urgency-yellow-bg border border-urgency-yellow-border text-urgency-yellow-text'
                                    : 'bg-urgency-green-bg border border-urgency-green-border text-urgency-green-text'
                                }`}
                              >
                                {urgency.label}
                              </span>
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) => updateParsedRow(row.id, 'quantity', Number(e.target.value) || 1)}
                                className="w-full px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface text-center focus:outline-none focus:border-secondary"
                              />
                            </td>

                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.unit}
                                onChange={(e) => updateParsedRow(row.id, 'unit', e.target.value)}
                                className="w-full px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface focus:outline-none focus:border-secondary"
                              />
                            </td>

                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeParsedRow(row.id)}
                                title="Remove row"
                                className="text-on-surface-variant hover:text-urgency-red-text transition-colors p-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Confirm Import Actions Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setImportFile(null);
                      setImportError('');
                    }}
                    className="px-4 py-2 border border-outline-variant text-on-surface rounded font-bold text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    Clear Table & Re-upload
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isImporting || parsedRows.filter((r) => r.isValid).length === 0}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
                  >
                    {isImporting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        <span>Importing Batches...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        <span>Confirm & Import {parsedRows.filter((r) => r.isValid).length} Batches</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

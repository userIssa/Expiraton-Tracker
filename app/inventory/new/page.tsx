'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

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

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Fields
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

  // UI Status
  const [urgencyPreview, setUrgencyPreview] = useState({ text: 'Awaiting Date', color: 'gray' });
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all products for lookup
  useEffect(() => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProducts(data))
      .catch(() => {});

    // Fetch category thresholds for preview calculations
    // We'll write this API in manager thresholds, for now we will hardcode the seeded defaults for preview
    setThresholds([
      { category: 'Dairy', greenMinDays: 30, yellowMinDays: 15, orangeMinDays: 7, redMinDays: 3 },
      { category: 'Bakery', greenMinDays: 7, yellowMinDays: 4, orangeMinDays: 2, redMinDays: 1 },
      { category: 'Meat & Seafood', greenMinDays: 14, yellowMinDays: 7, orangeMinDays: 3, redMinDays: 1 },
      { category: 'Canned Goods', greenMinDays: 120, yellowMinDays: 60, orangeMinDays: 30, redMinDays: 15 },
    ]);
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

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Register Stock Batch</h1>
          <p className="text-sm text-on-surface-variant font-medium">Record a new incoming catalog item or batch.</p>
        </div>

        {error && (
          <div className="bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-sm flex items-center gap-2 max-w-4xl">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        )}

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
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Meat & Seafood">Meat & Seafood</option>
                    <option value="Canned Goods">Canned Goods</option>
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
      </main>
    </div>
  );
}

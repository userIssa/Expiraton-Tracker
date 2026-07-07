'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface Product {
  _id: string;
  name: string;
  SKU: string;
  category: string;
  unit: string;
  defaultShelfLifeDays: number;
  cost: number;
}

const Naira = () => <span className="font-sans mr-0.5 text-[0.82em] opacity-80 select-none font-semibold">₦</span>;

export default function ProductCostsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Edit form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [costInput, setCostInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProducts = () => {
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load products');
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getCategoryCost = (category: string): number => {
    return 0.0;
  };

  const startEdit = (p: Product) => {
    setSelectedProduct(p);
    setCostInput(p.cost !== undefined && p.cost !== null ? String(p.cost) : String(getCategoryCost(p.category)));
    setSuccess('');
    setError('');
  };

  const cancelEdit = () => {
    setSelectedProduct(null);
    setCostInput('');
  };

  const handleSaveCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setError('');
    setSuccess('');
    setActionLoading(true);

    const costValue = Number(costInput);
    if (isNaN(costValue) || costValue < 0) {
      setError('Please enter a valid cost (must be 0 or greater).');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: costValue }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product cost');

      setSuccess(`Cost for "${selectedProduct.name}" updated to ₦${costValue.toFixed(2)}`);
      setSelectedProduct(null);
      setCostInput('');
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter products locally
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.SKU.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Unique categories list for filter dropdown
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-mono uppercase">Item Cost Manager</h1>
            <p className="text-sm text-on-surface-variant font-medium">Configure unit costs for product catalog items to accurately evaluate stock loss and values at risk.</p>
          </div>
        </div>

        {error && (
          <div className="bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-sm flex items-center gap-2 max-w-4xl">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-urgency-green-bg border border-urgency-green-border text-urgency-green-text rounded p-3 text-sm flex items-center gap-2 max-w-4xl">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {loading ? (
          <p className="text-on-surface-variant font-medium">Loading catalog items...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Products List (Left Panel - 2 cols on lg) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search and Filters Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center bg-surface border border-outline-variant rounded-xl p-4 shadow-xs">
                <div className="flex-1 w-full relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search catalog by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table wrapper */}
              <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-xs">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant">
                        <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4">Item Details</th>
                        <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-40">Category</th>
                        <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32">Unit Cost</th>
                        <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-28 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-outline-variant/30 text-on-surface">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-on-surface-variant font-medium">
                            No products found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => (
                          <tr 
                            key={p._id}
                            className={`hover:bg-surface-container-low/50 transition-colors group border-l-4 ${
                              selectedProduct?._id === p._id ? 'border-primary bg-primary/5' : 'border-transparent'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-bold text-on-surface">{p.name}</div>
                                <div className="text-xs text-on-surface-variant font-mono font-bold">SKU: {p.SKU}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono bg-surface-container-high text-on-surface-variant uppercase tracking-wider">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-on-surface text-sm flex items-center">
                              <Naira />{(p.cost || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => startEdit(p)}
                                className="px-3 py-1 bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface text-xs font-bold rounded cursor-pointer transition-colors"
                              >
                                Edit Cost
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Edit / Config Panel (Right Panel - 1 col on lg) */}
            <div className="space-y-4">
              {selectedProduct ? (
                <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden space-y-4 shadow-xs h-fit animate-scale-up">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                  
                  <div>
                    <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary fill-icon">payments</span>
                      Set Unit Cost
                    </h2>
                    <p className="text-xs text-on-surface-variant font-medium mt-1">Configure cost for <strong className="text-on-surface">{selectedProduct.name}</strong></p>
                  </div>

                  {/* Product quick info */}
                  <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 space-y-1.5 text-xs font-mono">
                    <div><span className="text-on-surface-variant font-semibold uppercase">SKU:</span> {selectedProduct.SKU}</div>
                    <div><span className="text-on-surface-variant font-semibold uppercase">Category:</span> {selectedProduct.category}</div>
                    <div><span className="text-on-surface-variant font-semibold uppercase">Unit Type:</span> {selectedProduct.unit}</div>
                    <div className="flex items-center">
                      <span className="text-on-surface-variant font-semibold uppercase mr-1">Current Cost:</span>{' '}
                      <Naira />{(selectedProduct.cost || 0).toFixed(2)}
                    </div>
                  </div>

                  <form onSubmit={handleSaveCost} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                        Cost per Unit (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-on-surface-variant text-sm font-semibold font-sans">₦</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={costInput}
                          onChange={(e) => setCostInput(e.target.value)}
                          className="pl-7 pr-3 py-2 w-full border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low rounded font-bold text-xs cursor-pointer text-on-surface"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-2 bg-primary text-on-primary rounded font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading ? 'Saving...' : 'Save Cost'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden text-center space-y-3 shadow-xs h-fit py-12">
                  <div className="absolute top-0 left-0 w-full h-1 bg-outline-variant"></div>
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">sell</span>
                  <h2 className="font-bold text-on-surface">No Product Selected</h2>
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                    Select a product from the list to update its unit cost configuration.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

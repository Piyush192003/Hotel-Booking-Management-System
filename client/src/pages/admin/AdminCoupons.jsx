import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete, getApiErrorMessage } from '../../services/apiClient';
import { formatCurrency, formatDate } from '../../utils/format';
import { Input } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

const EMPTY = { code: '', discountType: 'percent', discountValue: '', minimumBookingAmount: '', startDate: '', endDate: '', usageLimit: '' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/coupons')
      .then(({ data }) => {
        if (!alive) return;
        setCoupons(Array.isArray(data) ? data : data?.coupons || []);
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load coupons'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, []);
  // HANDLERS
  const openCreate = () => { setEditing('new'); setForm(EMPTY); };
  const openEdit = (c) => {
    setEditing(c._id);
    setForm({
      code: c.code || '', discountType: c.discountType || 'percent', discountValue: c.discountValue ?? '',
      minimumBookingAmount: c.minimumBookingAmount ?? '', startDate: c.startDate?.slice(0, 10) || '', endDate: c.endDate?.slice(0, 10) || '',
      usageLimit: c.usageLimit ?? '',
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      code: form.code.toUpperCase().trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      minimumBookingAmount: Number(form.minimumBookingAmount) || 0,
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      endDate: form.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
    };
    try {
      if (editing === 'new') {
        const { data } = await apiPost('/admin/coupons', payload);
        setCoupons((cs) => [data, ...cs]);
      } else {
        const { data } = await apiPatch(`/admin/coupons/${editing}`, payload);
        setCoupons((cs) => cs.map((c) => (c._id === editing ? { ...c, ...data } : c)));
      }
      setEditing(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save coupon'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await apiDelete(`/admin/coupons/${id}`);
      setCoupons((cs) => cs.filter((c) => c._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  if (status === 'loading') return <TableSkeleton rows={4} />;

  // RENDER
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{coupons.length} coupon{coupons.length === 1 ? '' : 's'}</p>
        <Button size="sm" onClick={openCreate}>+ New coupon</Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {coupons.length === 0 ? (
        <EmptyState title="No coupons" description="Create discount codes to run promotions." action={<Button size="sm" onClick={openCreate}>Create first coupon</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Min amount</th>
                <th className="px-4 py-3">Valid until</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {coupons.map((c) => (
                <tr key={c._id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3 font-mono font-bold text-ink-900">{c.code}</td>
                  <td className="px-4 py-3 text-ink-600">{c.discountType === 'percent' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}</td>
                  <td className="px-4 py-3 text-ink-600">{c.minimumBookingAmount ? formatCurrency(c.minimumBookingAmount) : '—'}</td>
                  <td className="px-4 py-3 text-ink-600">{c.endDate ? formatDate(c.endDate) : 'No expiry'}</td>
                  <td className="px-4 py-3 text-ink-600">{c.usedCount ?? 0}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                  <td className="px-4 py-3"><Badge status={c.active ? 'active' : 'blocked'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(c)} className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">Edit</button>
                      <button type="button" onClick={() => remove(c._id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Create coupon' : 'Edit coupon'}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Code" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER25" />
            <Input label="Discount value" type="number" min="1" required value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} placeholder="25" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="discount-type" className="label-base">Discount type</label>
              <select id="discount-type" className="input-base mt-1" value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}>
                <option value="percent">Percentage</option>
                <option value="fixed">Flat</option>
              </select>
            </div>
            <Input label="Min booking amount (₹)" type="number" min="0" value={form.minBookingAmount} onChange={(e) => setForm((f) => ({ ...f, minBookingAmount: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Valid from" type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} />
            <Input label="Valid to" type="date" value={form.validTo} onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))} />
          </div>
          <Input label="Usage limit (optional)" type="number" min="1" value={form.usageLimit} onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving}>{editing === 'new' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

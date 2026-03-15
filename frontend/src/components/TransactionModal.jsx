import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const INCOME_CATEGORIES  = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Refund', 'Bonus', 'Other Income'];
const EXPENSE_CATEGORIES = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
  'Healthcare', 'Education', 'Travel', 'Groceries', 'Rent', 'Insurance', 'Subscriptions', 'Other Expense'];

const today = () => new Date().toISOString().split('T')[0];

const EMPTY = { type: 'expense', amount: '', description: '', category: '', date: today(), notes: '' };

export default function TransactionModal({ isOpen, onClose, onSaved, editData }) {
  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const isEditing = !!editData;

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setApiError('');
      setForm(editData
        ? { type: editData.type, amount: String(editData.amount), description: editData.description,
            category: editData.category, date: editData.date, notes: editData.notes || '' }
        : EMPTY
      );
    }
  }, [isOpen, editData]);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      // Reset category when type changes
      if (name === 'type') next.category = '';
      return next;
    });
    setErrors(er => ({ ...er, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) errs.amount = 'Enter a valid positive amount.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (!form.category)           errs.category    = 'Please select a category.';
    if (!form.date)               errs.date        = 'Date is required.';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setApiError('');
    try {
      if (isEditing) {
        await api.put(`/transactions/${editData.id}`, form);
      } else {
        await api.post('/transactions', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      const serverErrs = err.response?.data?.errors;
      if (serverErrs) setErrors(serverErrs);
      else setApiError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{isEditing ? 'Edit Transaction' : 'Add Transaction'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Type toggle */}
          <div className="type-toggle">
            <button type="button" className={`type-btn income  ${form.type === 'income'  ? 'active' : ''}`}
              onClick={() => handleChange({ target: { name: 'type', value: 'income' }})}>
              ↑ Income
            </button>
            <button type="button" className={`type-btn expense ${form.type === 'expense' ? 'active' : ''}`}
              onClick={() => handleChange({ target: { name: 'type', value: 'expense' }})}>
              ↓ Expense
            </button>
          </div>

          {apiError && <div className="alert alert-error">{apiError}</div>}

          <form onSubmit={handleSubmit} id="txForm">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input type="number" name="amount" className={`form-control ${errors.amount ? 'error' : ''}`}
                  placeholder="0.00" step="0.01" min="0.01" value={form.amount} onChange={handleChange} />
                {errors.amount && <p className="form-error">{errors.amount}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" name="date" className={`form-control ${errors.date ? 'error' : ''}`}
                  value={form.date} onChange={handleChange} max={today()} />
                {errors.date && <p className="form-error">{errors.date}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input type="text" name="description" className={`form-control ${errors.description ? 'error' : ''}`}
                placeholder={form.type === 'income' ? 'e.g. Monthly salary' : 'e.g. Lunch at restaurant'}
                value={form.description} onChange={handleChange} />
              {errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" className={`form-control ${errors.category ? 'error' : ''}`}
                value={form.category} onChange={handleChange}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="form-error">{errors.category}</p>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
              <textarea name="notes" className="form-control" rows={2}
                placeholder="Any additional notes…" value={form.notes} onChange={handleChange}
                style={{ resize: 'vertical', minHeight: 64 }} />
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="txForm" className="btn btn-primary" disabled={loading}>
            {loading ? '…' : isEditing ? 'Save Changes' : `Add ${form.type === 'income' ? 'Income' : 'Expense'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

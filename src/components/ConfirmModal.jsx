import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ 
  title = 'Are you sure?', 
  description = 'Please confirm this action.', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onClose,
  confirmBtnClass = 'bg-purple-600 hover:bg-purple-700'
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-5">
          <div className="flex items-start">
            <div className="mr-3 mt-0.5 text-red-500">
              <AlertTriangle size={20} />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
          </div>
        </div>
        <div className="px-4 pb-4 pt-2 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useConfirm } from "@/hooks/useConfirm";

export default function ConfirmDialog() {
  const { open, message, onConfirm, close } = useConfirm();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-900 border border-neutral-700 rounded-md p-6 w-full max-w-sm text-white">
        <p className="mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={close}
            className="px-4 py-2 text-sm rounded bg-neutral-700 hover:bg-neutral-600 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              close();
              onConfirm();
            }}
            className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-500 transition"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

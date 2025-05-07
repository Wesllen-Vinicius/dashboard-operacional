"use client";

import { useEffect, useState } from "react";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { useErrorToast } from "@/hooks/useErrorToast";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "select"; // adiciona suporte a 'select'
  options?: { label: string; value: string }[]; // necessário para selects
};

interface SimpleFormProps<T> {
  fields: Field[];
  itemToEdit?: T | null;
  onCreate: (data: Partial<T>) => Promise<void>;
  onUpdate: (id: string, data: Partial<T>) => Promise<void>;
  onClear?: () => void;
  itemIdField?: keyof T; // default: 'id'
  formTitle?: string;
  successCreateMessage?: string;
  successUpdateMessage?: string;
  eventDispatchName?: string;
}

export default function SimpleForm<T extends Record<string, any>>({
  fields,
  itemToEdit,
  onCreate,
  onUpdate,
  onClear,
  itemIdField = "id",
  formTitle,
  successCreateMessage = "Criado com sucesso",
  successUpdateMessage = "Atualizado com sucesso",
  eventDispatchName,
}: SimpleFormProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(false);

  const success = useSuccessToast();
  const error = useErrorToast();

  useEffect(() => {
    setFormData(itemToEdit || {});
  }, [itemToEdit]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeVazio = fields.some(
      (f) => f.required && !String(formData[f.name] || "").trim()
    );
    if (nomeVazio) return;

    setLoading(true);
    try {
      if (itemToEdit && itemToEdit[itemIdField]) {
        await onUpdate(String(itemToEdit[itemIdField]), formData);
        success(successUpdateMessage);
        onClear?.();
      } else {
        await onCreate(formData);
        success(successCreateMessage);
      }

      setFormData({});
      if (eventDispatchName) {
        window.dispatchEvent(new Event(eventDispatchName));
      }
    } catch (err: any) {
      error(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formTitle && (
        <h3 className="text-lg text-white font-semibold">{formTitle}</h3>
      )}

      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm text-neutral-400 mb-1">
            {field.label}
          </label>

          {field.type === "select" ? (
            <select
              value={formData[field.name] ?? ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 transition"
              required={field.required}
            >
              <option value="">
                {field.placeholder || "Selecione uma opção"}
              </option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData[field.name] ?? ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 transition"
              placeholder={field.placeholder}
              required={field.required}
            />
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-neutral-600 hover:bg-neutral-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? itemToEdit
              ? "Atualizando..."
              : "Cadastrando..."
            : itemToEdit
            ? "Atualizar"
            : "Cadastrar"}
        </button>

        {itemToEdit && onClear && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setFormData({});
            }}
            className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-400 hover:text-white transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import ListSkeleton from "./ListSkeleton";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

interface DisplayField<T> {
  key: keyof T;
  label: string;
}

interface GenericListProps<T> {
  items: T[];
  searchableField: keyof T;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  loading?: boolean;
  renderItem?: (item: T) => React.ReactNode;
  searchPlaceholder?: string;
  emptyMessage?: string;
  skeleton?: React.ReactNode;
  displayFields?: DisplayField<T>[];
}

export function GenericList<T>({
  items,
  searchableField,
  onEdit,
  onDelete,
  loading = false,
  renderItem,
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum item encontrado.",
}: GenericListProps<T>) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter((item) => {
      const value = String(item[searchableField]).toLowerCase();
      return value.includes(search.toLowerCase());
    });
  }, [items, search, searchableField]);

  return (
    <div className="flex flex-col w-full h-full space-y-4">
      <label className="block text-sm text-neutral-400 mb-1">Pesquisar</label>
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 transition"
      />

      {loading ? (
        <ListSkeleton />
      ) : (
        <ul className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
          {filteredItems.length === 0 ? (
            <li className="text-neutral-500 italic">{emptyMessage}</li>
          ) : (
            filteredItems.map((item, index) => (
              <li
                key={index}
                className="flex items-center justify-between px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md"
              >
                <div className="flex-1 truncate">
                  {renderItem ? (
                    renderItem(item)
                  ) : (
                    <span className="text-white truncate">
                      {String(item[searchableField])}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-500 hover:text-blue-400 transition"
                      aria-label="Editar"
                    >
                      <FiEdit2 />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="text-red-500 hover:text-red-400 transition"
                      aria-label="Excluir"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

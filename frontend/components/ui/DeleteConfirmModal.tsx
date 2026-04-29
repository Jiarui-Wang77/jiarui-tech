"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The item name shown inside the body (e.g. conversation title, post title) */
  title: string;
  /** 'zh' | 'en' — controls all button/label text. Defaults to 'zh'. */
  locale?: string;
  /** Override the h2 heading. Falls back to locale-default "删除聊天？" / "Delete chat?" */
  heading?: string;
  /** Override the small gray subtext. Pass "" to hide it entirely. */
  subtext?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  locale = "zh",
  heading,
  subtext,
}: DeleteConfirmModalProps) {
  const isZh = locale === "zh";

  const defaultHeading = isZh ? "删除？"            : "Delete?";
  const bodyPrefix     = isZh ? "这会删除"           : "This will delete ";
  const bodySuffix     = isZh ? "。"                : ".";
  const defaultSubtext = isZh
    ? "此操作无法撤销。"
    : "This action cannot be undone.";
  const cancelLabel    = isZh ? "取消"              : "Cancel";
  const confirmLabel   = isZh ? "删除"              : "Delete";

  const resolvedHeading = heading  ?? defaultHeading;
  const resolvedSubtext = subtext  !== undefined ? subtext : defaultSubtext;

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="delete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal card */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
            <motion.div
              key="delete-modal"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl pointer-events-auto p-6 flex flex-col gap-5"
            >
              {/* Heading */}
              <h2
                id="delete-modal-title"
                className="text-xl font-semibold text-gray-900 leading-snug"
              >
                {resolvedHeading}
              </h2>

              {/* Body */}
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {bodyPrefix}
                  <strong className="font-semibold text-gray-900">
                    &ldquo;{title}&rdquo;
                  </strong>
                  {bodySuffix}
                </p>
                {resolvedSubtext && (
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {resolvedSubtext}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 active:bg-red-800 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

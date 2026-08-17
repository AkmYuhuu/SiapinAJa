"use client";

export default function AdminSupportChatStyles() {
  return (
    <style jsx global>{`
      .admin-support-page form textarea {
        box-sizing: border-box;
        min-height: 44px;
        max-height: 140px;
        overflow-y: auto;
        line-height: 1.45;
      }

      .admin-support-page form button[type="submit"] {
        min-width: 78px;
        min-height: 44px;
        flex: 0 0 auto;
        align-self: flex-end;
      }

      .admin-support-page section {
        min-width: 0;
      }

      .admin-support-page section:last-child {
        min-height: 0;
        overflow: hidden;
      }

      .admin-support-page section:last-child > div {
        min-height: 0;
      }

      .admin-support-page section:last-child [class*="overflow-y-auto"] {
        scrollbar-gutter: stable;
        scrollbar-width: thin;
      }

      .admin-support-page section:last-child [class*="overflow-y-auto"]::-webkit-scrollbar {
        width: 7px;
      }

      .admin-support-page section:last-child [class*="overflow-y-auto"]::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(107,114,128,.35);
      }
    `}</style>
  );
}

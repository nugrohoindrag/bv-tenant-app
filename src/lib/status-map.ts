// GENERATED — jangan edit manual. Sumber: buildingvision/contracts/status-map.yaml. Jalankan `npm run gen`.
export type Semantic = "success" | "warning" | "critical" | "info" | "neutral";
export type Variant = "solid" | "soft" | "outline";
export interface StatusDef { label_id: string; label_en: string; semantic: Semantic; variant: Variant; icon?: string }
export type ObjectType = "service_request" | "service_request_tenant" | "booking" | "visitor" | "invoice" | "payment" | "tenant_user" | "announcement" | "package" | "parking_permit" | "vehicle" | "tenant_feedback";
export const statusMap: Record<ObjectType, Record<string, StatusDef>> = {
  "service_request": {
    "new": {
      "label_id": "Baru",
      "label_en": "New",
      "semantic": "neutral",
      "variant": "soft"
    },
    "acknowledged": {
      "label_id": "Ditriase",
      "label_en": "Triaged",
      "semantic": "info",
      "variant": "soft"
    },
    "assigned": {
      "label_id": "Ditugaskan",
      "label_en": "Assigned",
      "semantic": "info",
      "variant": "soft"
    },
    "in_progress": {
      "label_id": "Sedang Dikerjakan",
      "label_en": "In Progress",
      "semantic": "info",
      "variant": "solid"
    },
    "waiting_for_tenant": {
      "label_id": "Menunggu Tenant",
      "label_en": "Waiting for Tenant",
      "semantic": "warning",
      "variant": "soft"
    },
    "resolved": {
      "label_id": "Terselesaikan",
      "label_en": "Resolved",
      "semantic": "success",
      "variant": "soft"
    },
    "closed": {
      "label_id": "Ditutup",
      "label_en": "Closed",
      "semantic": "success",
      "variant": "solid"
    },
    "cancelled": {
      "label_id": "Dibatalkan",
      "label_en": "Cancelled",
      "semantic": "neutral",
      "variant": "outline"
    }
  },
  "service_request_tenant": {
    "submitted": {
      "label_id": "Terkirim",
      "label_en": "Submitted",
      "semantic": "neutral",
      "variant": "soft"
    },
    "received": {
      "label_id": "Diterima",
      "label_en": "Received",
      "semantic": "info",
      "variant": "soft"
    },
    "being_assigned": {
      "label_id": "Sedang Ditugaskan",
      "label_en": "Being Assigned",
      "semantic": "info",
      "variant": "soft"
    },
    "in_progress": {
      "label_id": "Sedang Dikerjakan",
      "label_en": "In Progress",
      "semantic": "info",
      "variant": "solid"
    },
    "need_your_response": {
      "label_id": "Butuh Respons Anda",
      "label_en": "Need Your Response",
      "semantic": "warning",
      "variant": "solid"
    },
    "resolved": {
      "label_id": "Selesai",
      "label_en": "Resolved",
      "semantic": "success",
      "variant": "soft"
    },
    "closed": {
      "label_id": "Ditutup",
      "label_en": "Closed",
      "semantic": "success",
      "variant": "solid"
    },
    "cancelled": {
      "label_id": "Dibatalkan",
      "label_en": "Cancelled",
      "semantic": "neutral",
      "variant": "outline"
    }
  },
  "booking": {
    "pending": {
      "label_id": "Menunggu Persetujuan",
      "label_en": "Pending",
      "semantic": "warning",
      "variant": "soft"
    },
    "confirmed": {
      "label_id": "Dikonfirmasi",
      "label_en": "Confirmed",
      "semantic": "info",
      "variant": "soft"
    },
    "checked_in": {
      "label_id": "Berlangsung",
      "label_en": "Checked In",
      "semantic": "info",
      "variant": "solid"
    },
    "completed": {
      "label_id": "Selesai",
      "label_en": "Completed",
      "semantic": "success",
      "variant": "soft"
    },
    "cancelled": {
      "label_id": "Dibatalkan",
      "label_en": "Cancelled",
      "semantic": "neutral",
      "variant": "outline"
    },
    "rejected": {
      "label_id": "Ditolak",
      "label_en": "Rejected",
      "semantic": "critical",
      "variant": "soft"
    },
    "no_show": {
      "label_id": "Tidak Hadir",
      "label_en": "No Show",
      "semantic": "critical",
      "variant": "outline"
    }
  },
  "visitor": {
    "pending_approval": {
      "label_id": "Menunggu Persetujuan",
      "label_en": "Pending Approval",
      "semantic": "warning",
      "variant": "soft"
    },
    "registered": {
      "label_id": "Terdaftar",
      "label_en": "Registered",
      "semantic": "info",
      "variant": "soft"
    },
    "checked_in": {
      "label_id": "Sudah Masuk",
      "label_en": "Checked In",
      "semantic": "info",
      "variant": "solid"
    },
    "checked_out": {
      "label_id": "Sudah Keluar",
      "label_en": "Checked Out",
      "semantic": "success",
      "variant": "soft"
    },
    "expired": {
      "label_id": "Kedaluwarsa",
      "label_en": "Expired",
      "semantic": "neutral",
      "variant": "outline"
    },
    "cancelled": {
      "label_id": "Dibatalkan",
      "label_en": "Cancelled",
      "semantic": "neutral",
      "variant": "outline"
    },
    "denied": {
      "label_id": "Ditolak",
      "label_en": "Denied",
      "semantic": "critical",
      "variant": "soft"
    }
  },
  "invoice": {
    "draft": {
      "label_id": "Draft",
      "label_en": "Draft",
      "semantic": "neutral",
      "variant": "outline"
    },
    "issued": {
      "label_id": "Belum Dibayar",
      "label_en": "Unpaid",
      "semantic": "warning",
      "variant": "soft"
    },
    "partially_paid": {
      "label_id": "Dibayar Sebagian",
      "label_en": "Partially Paid",
      "semantic": "warning",
      "variant": "solid"
    },
    "paid": {
      "label_id": "Lunas",
      "label_en": "Paid",
      "semantic": "success",
      "variant": "solid"
    },
    "overdue": {
      "label_id": "Jatuh Tempo",
      "label_en": "Overdue",
      "semantic": "critical",
      "variant": "solid"
    },
    "cancelled": {
      "label_id": "Dibatalkan",
      "label_en": "Cancelled",
      "semantic": "neutral",
      "variant": "outline"
    }
  },
  "payment": {
    "initiated": {
      "label_id": "Menunggu Pembayaran",
      "label_en": "Pending",
      "semantic": "warning",
      "variant": "soft"
    },
    "pending": {
      "label_id": "Diproses",
      "label_en": "Processing",
      "semantic": "info",
      "variant": "soft"
    },
    "paid": {
      "label_id": "Berhasil",
      "label_en": "Paid",
      "semantic": "success",
      "variant": "solid"
    },
    "failed": {
      "label_id": "Gagal",
      "label_en": "Failed",
      "semantic": "critical",
      "variant": "soft"
    },
    "expired": {
      "label_id": "Kedaluwarsa",
      "label_en": "Expired",
      "semantic": "neutral",
      "variant": "outline"
    },
    "cancelled": {
      "label_id": "Dibatalkan",
      "label_en": "Cancelled",
      "semantic": "neutral",
      "variant": "outline"
    },
    "refunded": {
      "label_id": "Dikembalikan",
      "label_en": "Refunded",
      "semantic": "neutral",
      "variant": "soft"
    }
  },
  "tenant_user": {
    "pending_validation": {
      "label_id": "Menunggu Validasi",
      "label_en": "Pending Validation",
      "semantic": "warning",
      "variant": "soft"
    },
    "active": {
      "label_id": "Aktif",
      "label_en": "Active",
      "semantic": "success",
      "variant": "soft"
    },
    "rejected": {
      "label_id": "Ditolak",
      "label_en": "Rejected",
      "semantic": "critical",
      "variant": "soft"
    },
    "suspended": {
      "label_id": "Ditangguhkan",
      "label_en": "Suspended",
      "semantic": "neutral",
      "variant": "outline"
    }
  },
  "announcement": {
    "draft": {
      "label_id": "Draft",
      "label_en": "Draft",
      "semantic": "neutral",
      "variant": "outline"
    },
    "scheduled": {
      "label_id": "Terjadwal",
      "label_en": "Scheduled",
      "semantic": "info",
      "variant": "soft"
    },
    "published": {
      "label_id": "Terbit",
      "label_en": "Published",
      "semantic": "success",
      "variant": "soft"
    },
    "archived": {
      "label_id": "Diarsipkan",
      "label_en": "Archived",
      "semantic": "neutral",
      "variant": "outline"
    }
  },
  "package": {
    "received": {
      "label_id": "Diterima",
      "label_en": "Received",
      "semantic": "info",
      "variant": "soft"
    },
    "notified": {
      "label_id": "Menunggu Diambil",
      "label_en": "Awaiting Pickup",
      "semantic": "warning",
      "variant": "soft"
    },
    "picked_up": {
      "label_id": "Sudah Diambil",
      "label_en": "Picked Up",
      "semantic": "success",
      "variant": "soft"
    },
    "returned": {
      "label_id": "Dikembalikan",
      "label_en": "Returned",
      "semantic": "neutral",
      "variant": "outline"
    }
  },
  "parking_permit": {
    "requested": {
      "label_id": "Diajukan",
      "label_en": "Requested",
      "semantic": "warning",
      "variant": "soft"
    },
    "approved": {
      "label_id": "Disetujui",
      "label_en": "Approved",
      "semantic": "success",
      "variant": "soft"
    },
    "rejected": {
      "label_id": "Ditolak",
      "label_en": "Rejected",
      "semantic": "critical",
      "variant": "soft"
    },
    "cancelled": {
      "label_id": "Dibatalkan",
      "label_en": "Cancelled",
      "semantic": "neutral",
      "variant": "outline"
    },
    "expired": {
      "label_id": "Berakhir",
      "label_en": "Expired",
      "semantic": "neutral",
      "variant": "soft"
    },
    "revoked": {
      "label_id": "Dicabut",
      "label_en": "Revoked",
      "semantic": "critical",
      "variant": "outline"
    }
  },
  "vehicle": {
    "active": {
      "label_id": "Aktif",
      "label_en": "Active",
      "semantic": "success",
      "variant": "soft"
    },
    "inactive": {
      "label_id": "Nonaktif",
      "label_en": "Inactive",
      "semantic": "neutral",
      "variant": "outline"
    },
    "blacklisted": {
      "label_id": "Blacklist",
      "label_en": "Blacklisted",
      "semantic": "critical",
      "variant": "solid"
    }
  },
  "tenant_feedback": {
    "new": {
      "label_id": "Baru",
      "label_en": "New",
      "semantic": "info",
      "variant": "soft"
    },
    "in_review": {
      "label_id": "Ditinjau",
      "label_en": "In Review",
      "semantic": "warning",
      "variant": "soft"
    },
    "responded": {
      "label_id": "Ditanggapi",
      "label_en": "Responded",
      "semantic": "success",
      "variant": "soft"
    },
    "closed": {
      "label_id": "Ditutup",
      "label_en": "Closed",
      "semantic": "success",
      "variant": "solid"
    }
  }
} as const;
export function statusDef(objectType: ObjectType, status: string): StatusDef | undefined {
  return statusMap[objectType]?.[status];
}

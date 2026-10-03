const TONES: Record<string, string> = {
  published: "bg-[#e3efe2] text-[#2f6b3a]",
  approved: "bg-[#e3efe2] text-[#2f6b3a]",
  ready: "bg-[#e3efe2] text-[#2f6b3a]",
  confirmed: "bg-[#e3efe2] text-[#2f6b3a]",
  sent: "bg-[#e3efe2] text-[#2f6b3a]",
  closed: "bg-stone text-body",
  draft: "bg-stone text-body",
  unpublished: "bg-stone text-body",
  archived: "bg-stone text-body/70",
  hidden: "bg-stone text-body/70",
  new: "bg-[#f4e6cf] text-[#7a4b0c]",
  pending: "bg-[#f4e6cf] text-[#7a4b0c]",
  uploading: "bg-[#e5ecf5] text-[#2b4a73]",
  validating: "bg-[#e5ecf5] text-[#2b4a73]",
  processing: "bg-[#e5ecf5] text-[#2b4a73]",
  sending: "bg-[#e5ecf5] text-[#2b4a73]",
  contacted: "bg-[#e5ecf5] text-[#2b4a73]",
  in_progress: "bg-[#e5ecf5] text-[#2b4a73]",
  proposal_sent: "bg-[#efe5f5] text-[#5b2b73]",
  failed: "bg-[#f6e0dc] text-[#9b2c1f]",
  rejected: "bg-[#f6e0dc] text-[#9b2c1f]",
  declined: "bg-[#f6e0dc] text-[#9b2c1f]",
  cancelled: "bg-[#f6e0dc] text-[#9b2c1f]",
  spam: "bg-[#f6e0dc] text-[#9b2c1f]",
  changes: "bg-[#f4e6cf] text-[#7a4b0c]",
  featured: "bg-champagne/40 text-body",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? status.replace(/_/g, " ");
  return <span className={`a-badge capitalize ${TONES[status] ?? "bg-stone text-body"}`}>{text}</span>;
}

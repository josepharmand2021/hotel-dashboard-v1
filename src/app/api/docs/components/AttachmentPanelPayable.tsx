"use client";

// Suggested location: src/app/(app)/docs/components/AttachmentPanelPayable.tsx
// Usage (detail page):
//   import AttachmentPanelPayable from '@/app/(app)/docs/components/AttachmentPanelPayable';
//   <AttachmentPanelPayable payableId={id} role={role} />

import * as React from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  FileText,
  FileImage,
  Upload,
  Download,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// =============================================
// Types
// =============================================
export type Role = "viewer" | "admin" | "superadmin";
export type DocTypeCode = "INVOICE" | "FP";

export type DocSummary = {
  documentId: number;
  typeCode: DocTypeCode;
  title: string;
  number: string | null;
  issueDate: string | null; // YYYY-MM-DD
  version: number | null; // current main version
  storageKey: string | null; // main storage key (may be null if no version yet)
  mime: string | null;
  updatedAt: string; // ISO
};

export type AttachmentsResponse = {
  invoice?: DocSummary | null;
  fp?: DocSummary | null;
};

// =============================================
// Helpers
// =============================================
const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  });

async function readErr(res: Response) {
  const txt = await res.text();
  try {
    const j = JSON.parse(txt);
    return j.error || txt;
  } catch {
    return txt;
  }
}

function prettyMime(mime?: string | null) {
  if (!mime) return "-";
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/jpeg") return "JPG";
  if (mime === "image/png") return "PNG";
  return mime;
}

function humanDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d!;
  }
}

// =============================================
// Upload / Replace Dialog
// =============================================
function UploadReplaceDialog({
  payableId,
  typeCode,
  canEdit,
  onDone,
}: {
  payableId: number;
  typeCode: DocTypeCode;
  canEdit: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [number, setNumber] = React.useState("");
  const [issueDate, setIssueDate] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const accept = [".pdf", ".jpg", ".jpeg", ".png"].join(",");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Pilih file terlebih dahulu.");
      return;
    }

    const inferredMime =
      file.type ||
      (file.name.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : file.name.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg");

    if (!["application/pdf", "image/jpeg", "image/png"].includes(inferredMime)) {
      setError("Tipe file tidak didukung. Hanya PDF, JPG, PNG.");
      return;
    }

    setLoading(true);
    try {
      // 1) Minta signed upload URL + documentId + nextVersion + path
      const r1 = await fetch("/api/docs/signed-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payableId,
          typeCode,
          filename: file.name,
          title: `${typeCode} for PAY-${payableId}`,
          issueDate: issueDate || undefined,
          number: number || undefined,
        }),
      });
      if (!r1.ok) throw new Error(await readErr(r1));
      const j1 = await r1.json();

      // 2) Upload ke signed URL (PUT)
      //    - pakai x-upsert agar tidak 409 kalau file dengan path sama sudah ada
      const putRes = await fetch(j1.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": inferredMime,
          "x-upsert": "true",
        },
        body: file,
      });
      // treat 409 (already exists) as success juga untuk berjaga-jaga
      if (!putRes.ok && putRes.status !== 409) {
        throw new Error(`Upload gagal: ${putRes.status} ${await putRes.text()}`);
      }

      // 3) Finalize (catat version & update main)
      const r2 = await fetch("/api/docs/finalize-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: j1.documentId,
          version: j1.nextVersion,
          path: j1.path,
          mime: inferredMime,
          sizeBytes: file.size,
        }),
      });
      if (!r2.ok) throw new Error(await readErr(r2));

      setOpen(false);
      setFile(null);
      setNumber("");
      setIssueDate("");
      onDone();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Terjadi kesalahan saat upload.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!canEdit) return;
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!canEdit}>
          <Upload className="h-4 w-4 mr-1" /> Upload / Replace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload {typeCode}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="file">File (PDF / JPG / PNG)</Label>
              <Input
                id="file"
                type="file"
                accept={accept}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="number">Nomor (opsional)</Label>
              <Input
                id="number"
                placeholder="mis. INV-023"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="issueDate">Tanggal (opsional)</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div className="text-sm text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading || !file}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengunggah…
                </>
              ) : (
                <>Simpan</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// Doc Card
// =============================================
function DocCard({
  label,
  typeCode,
  doc,
  canEdit,
  role,
  onRefetch,
  payableId,
}: {
  label: string;
  typeCode: DocTypeCode;
  doc: DocSummary | null | undefined;
  canEdit: boolean;
  role: Role;
  onRefetch: () => void;
  payableId: number;
}) {
  const downloadingRef = React.useRef(false);
  const hasFile = !!doc?.storageKey;
  const icon =
    (doc?.mime ?? "").startsWith("application/pdf") ? (
      <FileText className="h-4 w-4" />
    ) : (
      <FileImage className="h-4 w-4" />
    );

  async function handleDownload() {
    if (downloadingRef.current || !doc?.storageKey) return;
    downloadingRef.current = true;
    try {
      const r = await fetch("/api/docs/signed-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: doc.storageKey, documentId: doc.documentId }),
      });
      if (!r.ok) throw new Error(await readErr(r));
      const j = await r.json();
      window.open(j.url, "_blank");
    } catch (e) {
      console.error(e);
      alert("Gagal membuat signed download URL");
    } finally {
      downloadingRef.current = false;
    }
  }

  return (
    <Card className="shadow-sm border-muted-foreground/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {hasFile ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Tersimpan v{doc?.version ?? 1}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" /> Belum ada
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="text-muted-foreground">Nomor</div>
          <div className="font-medium truncate">{doc?.number || "-"}</div>
          <div className="text-muted-foreground">Tanggal</div>
          <div className="font-medium">{humanDate(doc?.issueDate)}</div>
          <div className="text-muted-foreground">Tipe</div>
          <div className="font-medium">{prettyMime(doc?.mime)}</div>
        </div>
        <Separator className="my-2" />
        <div className="flex items-center gap-2">
          {hasFile ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {icon}
              <span
                className="truncate max-w-[220px]"
                title={doc?.storageKey ?? undefined}
              >
                {doc?.storageKey?.split("/").pop()}
              </span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Belum ada file</div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <UploadReplaceDialog
            payableId={payableId}
            typeCode={typeCode}
            canEdit={canEdit}
            onDone={onRefetch}
          />
          {role !== "viewer" && hasFile && (
            <Button size="sm" variant="ghost" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// Main Component
// =============================================
export default function AttachmentPanelPayable({
  payableId,
  role,
}: {
  payableId: number;
  role: Role;
}) {
  const { data, isLoading, mutate } = useSWR<AttachmentsResponse>(
    `/api/payables/${payableId}/attachments`,
    fetcher
  );
  const canEdit = role === "admin" || role === "superadmin";

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Dokumen Payable</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" /> Role: {role}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DocCard
          label="Invoice"
          typeCode="INVOICE"
          doc={data?.invoice ?? null}
          canEdit={canEdit}
          role={role}
          onRefetch={() => mutate()}
          payableId={payableId}
        />
        <DocCard
          label="Faktur Pajak"
          typeCode="FP"
          doc={data?.fp ?? null}
          canEdit={canEdit}
          role={role}
          onRefetch={() => mutate()}
          payableId={payableId}
        />
      </div>
    </div>
  );
}

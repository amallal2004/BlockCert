import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, Download, Hash, Blocks, Hexagon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSHA512Hash, generateMockTxHash } from "@/lib/crypto";
import { addCertificate } from "@/lib/blockchain";
import { addRecord, addStudentUser } from "@/lib/database";
import { StudentRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Electrical", "Information Technology", "Chemical", "Biotechnology"];

interface Props {
  onBack: () => void;
}

const AddRecordForm = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentRecord | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    studentName: "",
    rollNumber: "",
    department: "",
    academicYear: "",
    dateOfJoining: "",
    dateOfCompletion: "",
    totalMarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const marks = parseFloat(form.totalMarks);
      const hash = await generateSHA512Hash({ ...form, totalMarks: marks });
      const txHash = generateMockTxHash();
      const verifyUrl = `${window.location.origin}/verify?hash=${hash}`;
      addCertificate({ hash, studentName: form.studentName, rollNumber: form.rollNumber, department: form.department, timestamp: Date.now(), txHash });
      const record: StudentRecord = {
        id: crypto.randomUUID(), studentName: form.studentName, rollNumber: form.rollNumber, department: form.department, academicYear: form.academicYear,
        dateOfJoining: form.dateOfJoining, dateOfCompletion: form.dateOfCompletion, totalMarks: marks, certificateHash: hash, blockchainTxHash: txHash,
        qrCodeData: verifyUrl, createdAt: new Date().toISOString(), status: "registered",
      };
      addRecord(record);
      addStudentUser(form.studentName, form.rollNumber);
      setResult(record);
      toast({ title: "✅ Certificate Registered", description: "Hash stored on blockchain." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result?.rollNumber}_certificate_qr.png`;
    a.click();
  };

  if (result) {
    return (
      <div className="min-h-screen bg-background cyber-grid p-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="glass-card-green rounded-2xl p-8 neon-border-green">
              <div className="text-center mb-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                  className="mx-auto mb-4 h-20 w-20 rounded-full bg-neon-green/10 flex items-center justify-center neon-border-green neon-pulse">
                  <CheckCircle className="h-10 w-10 text-neon-green" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold tracking-wider">REGISTERED</h2>
                <p className="text-muted-foreground text-sm mt-1">Certificate stored on blockchain</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                {[
                  { label: "STUDENT", value: result.studentName },
                  { label: "ROLL NO", value: result.rollNumber },
                  { label: "DEPARTMENT", value: result.department },
                  { label: "MARKS", value: `${result.totalMarks}%` },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 rounded-xl p-3 border border-border/20">
                    <p className="text-muted-foreground text-xs font-display tracking-wider">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-xl bg-muted/20 border border-neon-cyan/10">
                  <div className="flex items-center gap-2 text-xs text-neon-cyan mb-1 font-display tracking-wider">
                    <Hash className="h-3 w-3" /> CERTIFICATE HASH
                  </div>
                  <p className="text-xs font-mono break-all text-muted-foreground">{result.certificateHash}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-neon-purple/10">
                  <div className="flex items-center gap-2 text-xs text-neon-purple mb-1 font-display tracking-wider">
                    <Blocks className="h-3 w-3" /> TX HASH
                  </div>
                  <p className="text-xs font-mono break-all text-muted-foreground">{result.blockchainTxHash}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div ref={qrRef} className="p-5 bg-foreground rounded-2xl neon-border-cyan neon-pulse">
                  <QRCodeCanvas value={result.qrCodeData} size={200} level="H" bgColor="#ffffff" fgColor="#0a0e1a" />
                </div>
                <Button onClick={downloadQR} className="btn-neon-cyan border-0 font-display tracking-wider text-sm rounded-xl h-11">
                  <Download className="mr-2 h-4 w-4" /> DOWNLOAD QR
                </Button>
              </div>

              <Button onClick={onBack} variant="ghost" className="w-full mt-6 text-muted-foreground hover:text-foreground font-display tracking-wider text-xs">
                BACK TO DASHBOARD
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const inputClass = "bg-muted/30 border-border/50 h-12 font-mono text-sm focus:border-primary focus:ring-primary/20";

  return (
    <div className="min-h-screen bg-background cyber-grid p-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="glass-card rounded-2xl p-8 neon-border-cyan">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl btn-neon-cyan flex items-center justify-center">
              <Hexagon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-wider">ADD RECORD</h2>
              <p className="text-muted-foreground text-sm">Register a new certificate on blockchain</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-display text-xs tracking-wider text-muted-foreground">STUDENT NAME</Label>
                <Input required value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Full name" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="font-display text-xs tracking-wider text-muted-foreground">ROLL NUMBER</Label>
                <Input required value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} placeholder="CS2024001" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-display text-xs tracking-wider text-muted-foreground">DEPARTMENT</Label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-display text-xs tracking-wider text-muted-foreground">ACADEMIC YEAR</Label>
                <Input required value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2020-2024" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-display text-xs tracking-wider text-muted-foreground">DATE OF JOINING</Label>
                <Input type="date" required value={form.dateOfJoining} onChange={e => setForm(f => ({ ...f, dateOfJoining: e.target.value }))} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="font-display text-xs tracking-wider text-muted-foreground">DATE OF COMPLETION</Label>
                <Input type="date" required value={form.dateOfCompletion} onChange={e => setForm(f => ({ ...f, dateOfCompletion: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-display text-xs tracking-wider text-muted-foreground">TOTAL MARKS (%)</Label>
              <Input type="number" required min={0} max={100} step={0.01} value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} placeholder="85.5" className={inputClass} />
            </div>
            <Button type="submit" className="w-full btn-neon-cyan border-0 h-12 font-display tracking-wider text-sm rounded-xl" disabled={loading || !form.department}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Blocks className="mr-2 h-4 w-4" />}
              {loading ? "REGISTERING..." : "REGISTER ON BLOCKCHAIN"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRecordForm;

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, Download, Hash, Blocks } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

      // Add to blockchain
      addCertificate({
        hash,
        studentName: form.studentName,
        rollNumber: form.rollNumber,
        department: form.department,
        timestamp: Date.now(),
        txHash,
      });

      // Add to database
      const record: StudentRecord = {
        id: crypto.randomUUID(),
        studentName: form.studentName,
        rollNumber: form.rollNumber,
        department: form.department,
        academicYear: form.academicYear,
        dateOfJoining: form.dateOfJoining,
        dateOfCompletion: form.dateOfCompletion,
        totalMarks: marks,
        certificateHash: hash,
        blockchainTxHash: txHash,
        qrCodeData: verifyUrl,
        createdAt: new Date().toISOString(),
        status: "registered",
      };
      addRecord(record);

      // Auto-create student user
      addStudentUser(form.studentName, form.rollNumber);

      setResult(record);
      toast({ title: "✅ Certificate Registered", description: "Hash stored on blockchain successfully." });
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
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-2 border-success/30 shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="font-display text-2xl">Certificate Registered!</CardTitle>
                <CardDescription>Successfully stored on the blockchain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Student</p><p className="font-medium">{result.studentName}</p></div>
                  <div><p className="text-muted-foreground">Roll Number</p><p className="font-medium">{result.rollNumber}</p></div>
                  <div><p className="text-muted-foreground">Department</p><p className="font-medium">{result.department}</p></div>
                  <div><p className="text-muted-foreground">Marks</p><p className="font-medium">{result.totalMarks}%</p></div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-chain-blue" />
                    <span className="text-muted-foreground">Certificate Hash:</span>
                  </div>
                  <p className="text-xs font-mono break-all">{result.certificateHash}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Blocks className="h-4 w-4 text-chain-purple" />
                    <span className="text-muted-foreground">Transaction Hash:</span>
                  </div>
                  <p className="text-xs font-mono break-all">{result.blockchainTxHash}</p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div ref={qrRef} className="p-4 bg-card rounded-xl border shadow-sm">
                    <QRCodeCanvas value={result.qrCodeData} size={200} level="H" />
                  </div>
                  <Button onClick={downloadQR} variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Download QR Code
                  </Button>
                </div>

                <Button onClick={onBack} className="w-full">Back to Dashboard</Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Card className="shadow-xl border-2">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Add Student Record</CardTitle>
            <CardDescription>Enter student details to generate a blockchain-backed certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student Name</Label>
                  <Input required value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input required value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} placeholder="e.g. CS2024001" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input required value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2020-2024" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Joining</Label>
                  <Input type="date" required value={form.dateOfJoining} onChange={e => setForm(f => ({ ...f, dateOfJoining: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Completion</Label>
                  <Input type="date" required value={form.dateOfCompletion} onChange={e => setForm(f => ({ ...f, dateOfCompletion: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Total Marks (%)</Label>
                <Input type="number" required min={0} max={100} step={0.01} value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} placeholder="e.g. 85.5" />
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0 h-11" disabled={loading || !form.department}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Blocks className="mr-2 h-4 w-4" />}
                {loading ? "Registering on Blockchain..." : "Register Certificate"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddRecordForm;

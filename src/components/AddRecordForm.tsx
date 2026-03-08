import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, Download, Hash, Blocks, Hexagon, Wallet, ExternalLink } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSHA512Hash } from "@/lib/crypto";
import { addCertificate } from "@/lib/blockchain";
import { addRecord, addStudentUser, getDepartments } from "@/lib/database";
import { StudentRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { connectWallet, isMetaMaskInstalled, getEtherscanTxUrl } from "@/lib/ethereum";

interface Props {
  onBack: () => void;
}

const AddRecordForm = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
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

  const metaMaskInstalled = isMetaMaskInstalled();

  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  const handleConnectWallet = async () => {
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
      toast({ title: "✅ Wallet Connected", description: `${address.slice(0, 6)}...${address.slice(-4)}` });
    } catch (err: any) {
      toast({ title: "Wallet Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const marks = parseFloat(form.totalMarks);
      const hash = await generateSHA512Hash({ ...form, totalMarks: marks });
      const verifyUrl = `${window.location.origin}/verify?hash=${hash}`;

      const blockchainEntry = await addCertificate({
        hash,
        studentName: form.studentName,
        rollNumber: form.rollNumber,
        department: form.department,
        timestamp: Date.now(),
        txHash: "",
      });

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
        blockchainTxHash: blockchainEntry.txHash,
        qrCodeData: verifyUrl,
        createdAt: new Date().toISOString(),
        status: "registered",
      };
      await addRecord(record);
      await addStudentUser(form.studentName, form.rollNumber);
      setResult(record);
      toast({
        title: "✅ Certificate Registered",
        description: "Hash stored on Sepolia blockchain & database!",
      });
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
    const isRealTx = result.blockchainTxHash.startsWith("0x") && result.blockchainTxHash.length === 66;
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
                <h2 className="font-display text-2xl font-bold tracking-wider">REGISTERED ON SEPOLIA</h2>
                <p className="text-muted-foreground text-sm mt-1">Certificate stored on Sepolia blockchain</p>
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
                  <div className="flex items-center justify-between text-xs text-neon-purple mb-1 font-display tracking-wider">
                    <div className="flex items-center gap-2">
                      <Blocks className="h-3 w-3" /> TX HASH
                    </div>
                    {isRealTx && (
                      <a href={getEtherscanTxUrl(result.blockchainTxHash)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-neon-cyan hover:underline">
                        <ExternalLink className="h-3 w-3" /> Etherscan
                      </a>
                    )}
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl btn-neon-cyan flex items-center justify-center">
                <Hexagon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-wider">ADD RECORD</h2>
                <p className="text-muted-foreground text-sm">Register a new certificate on Sepolia</p>
              </div>
            </div>

            {metaMaskInstalled && (
              <div>
                {walletAddress ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-xs">
                    <Wallet className="h-3 w-3 text-neon-green" />
                    <span className="font-mono text-neon-green">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <Button onClick={handleConnectWallet} size="sm" className="btn-neon-purple border-0 font-display tracking-wider text-xs rounded-xl">
                    <Wallet className="mr-2 h-3 w-3" /> CONNECT
                  </Button>
                )}
              </div>
            )}
          </div>

          {!metaMaskInstalled && (
            <div className="mb-6 p-4 rounded-xl bg-muted/20 border border-border/30 text-sm text-muted-foreground text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-semibold mb-1">MetaMask Required</p>
              <p className="text-xs mb-3">Install MetaMask to register certificates on Sepolia blockchain.</p>
              <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-neon-cyan hover:underline text-xs">
                <ExternalLink className="h-3 w-3" /> Install MetaMask
              </a>
            </div>
          )}

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
                  <SelectContent className="bg-card border-border">{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
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
            <Button
              type="submit"
              className="w-full btn-neon-cyan border-0 h-12 font-display tracking-wider text-sm rounded-xl"
              disabled={loading || !form.department || !metaMaskInstalled || !walletAddress}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Blocks className="mr-2 h-4 w-4" />}
              {loading ? "REGISTERING ON SEPOLIA..." : "REGISTER ON SEPOLIA"}
            </Button>
            {metaMaskInstalled && !walletAddress && (
              <p className="text-xs text-center text-muted-foreground">Connect your wallet first to register on-chain</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRecordForm;

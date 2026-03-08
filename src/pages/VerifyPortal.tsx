import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Upload, CheckCircle, XCircle, ArrowLeft, Hash, Blocks, User, Building, GraduationCap, Clock, Hexagon, ShieldAlert, Eye, ExternalLink } from "lucide-react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyCertificate } from "@/lib/blockchain";
import { getRecordByHash } from "@/lib/database";
import { VerificationResult } from "@/lib/types";
import { getEtherscanTxUrl, isContractConfigured } from "@/lib/ethereum";
import ParticleField from "@/components/ParticleField";

const VerifyPortal = () => {
  const [searchParams] = useSearchParams();
  const [hashInput, setHashInput] = useState(searchParams.get("hash") || "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verify = useCallback(async (hash: string) => {
    if (!hash.trim()) return;
    setLoading(true);
    try {
      const blockchainResult = await verifyCertificate(hash.trim());
      const dbRecord = getRecordByHash(hash.trim());
      if (blockchainResult.exists && blockchainResult.entry) {
        setResult({
          isValid: true, studentName: blockchainResult.entry.studentName, rollNumber: blockchainResult.entry.rollNumber,
          department: blockchainResult.entry.department, academicYear: dbRecord?.academicYear, totalMarks: dbRecord?.totalMarks,
          timestamp: blockchainResult.entry.timestamp, issuerAddress: blockchainResult.entry.issuerAddress,
          txHash: blockchainResult.entry.txHash, blockNumber: blockchainResult.entry.blockNumber,
        });
      } else {
        setResult({ isValid: false });
      }
    } catch {
      setResult({ isValid: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlHash = searchParams.get("hash");
    if (urlHash) { setHashInput(urlHash); verify(urlHash); }
  }, [searchParams, verify]);

  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        if (code) {
          const match = code.data.match(/[?&]hash=([a-fA-F0-9]+)/);
          const hash = match ? match[1] : code.data;
          setHashInput(hash); verify(hash);
        } else {
          setResult({ isValid: false });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file?.type.startsWith("image/")) processImage(file); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processImage(file); };

  return (
    <div className="min-h-screen bg-background cyber-grid relative">
      <ParticleField />

      <header className="border-b border-border/50 glass-card rounded-none relative z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl btn-neon-green flex items-center justify-center">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold tracking-wider">VERIFICATION PORTAL</h1>
              <p className="text-xs text-muted-foreground">No login required — verify instantly</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        <div className="space-y-6">
          {/* QR Upload */}
          <div className="glass-card rounded-2xl p-6 neon-border-cyan">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-4 w-4 text-neon-cyan" />
              <h3 className="font-display text-sm font-bold tracking-wider">UPLOAD QR CODE</h3>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${dragOver ? "border-neon-cyan bg-neon-cyan/5 shadow-[0_0_30px_hsl(195,100%,50%,0.1)]" : "border-border/30 hover:border-neon-cyan/40 hover:bg-muted/10"}`}
            >
              <Hexagon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm font-semibold">Drop QR code image here</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">PNG, JPG supported</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Manual Hash */}
          <div className="glass-card-purple rounded-2xl p-6 neon-border-purple">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-4 w-4 text-neon-purple" />
              <h3 className="font-display text-sm font-bold tracking-wider">ENTER HASH</h3>
            </div>
            <div className="flex gap-3">
              <Input
                value={hashInput}
                onChange={e => setHashInput(e.target.value)}
                placeholder="Paste SHA-512 hash..."
                className="bg-muted/30 border-border/50 h-12 font-mono text-xs focus:border-neon-purple focus:ring-neon-purple/20"
              />
              <Button onClick={() => verify(hashInput)} disabled={loading || !hashInput.trim()} className="btn-neon-purple border-0 shrink-0 font-display tracking-wider text-xs rounded-xl h-12 px-6">
                <Search className="mr-2 h-4 w-4" />
                VERIFY
              </Button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-12 text-center neon-border-cyan neon-pulse">
              <div className="h-12 w-12 mx-auto mb-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
              <p className="text-neon-cyan font-display tracking-wider text-sm">QUERYING BLOCKCHAIN...</p>
              <p className="text-muted-foreground text-xs mt-2 font-mono">Verifying hash on-chain</p>
            </motion.div>
          )}

          {/* Result */}
          {!loading && result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              {result.isValid ? (
                <div className="glass-card-green rounded-2xl p-8 neon-border-green">
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.4 }}
                      className="mx-auto mb-4 h-24 w-24 rounded-full bg-neon-green/10 flex items-center justify-center neon-border-green neon-pulse"
                    >
                      <CheckCircle className="h-12 w-12 text-neon-green" />
                    </motion.div>
                    <h2 className="font-display text-3xl font-black tracking-wider text-neon-green text-glow-green">AUTHENTIC</h2>
                    <p className="text-muted-foreground text-sm mt-2">Certificate verified on blockchain</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                    {[
                      { icon: User, label: "STUDENT", value: result.studentName },
                      { icon: Hash, label: "ROLL NO", value: result.rollNumber },
                      { icon: Building, label: "DEPT", value: result.department },
                      { icon: GraduationCap, label: "YEAR", value: result.academicYear },
                      { icon: GraduationCap, label: "MARKS", value: result.totalMarks ? `${result.totalMarks}%` : "N/A" },
                      { icon: Clock, label: "REGISTERED", value: result.timestamp ? new Date(result.timestamp).toLocaleDateString() : "N/A" },
                    ].map((item, i) => (
                      <div key={i} className="bg-muted/20 rounded-xl p-3 border border-neon-green/10 flex items-start gap-2">
                        <item.icon className="h-4 w-4 text-neon-green mt-0.5 shrink-0" />
                        <div>
                          <p className="text-muted-foreground text-xs font-display tracking-wider">{item.label}</p>
                          <p className="font-semibold text-sm">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 p-4 rounded-xl bg-muted/20 border border-border/20 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Blocks className="h-3 w-3 text-neon-purple" />
                      <span className="text-muted-foreground font-display tracking-wider">TX HASH:</span>
                      <span className="font-mono break-all">{result.txHash}</span>
                      {isContractConfigured() && result.txHash && (
                        <a href={getEtherscanTxUrl(result.txHash)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-neon-cyan hover:underline ml-auto shrink-0">
                          <ExternalLink className="h-3 w-3" /> Etherscan
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-display tracking-wider">BLOCK:</span>
                      <span className="font-mono text-neon-cyan">#{result.blockNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-display tracking-wider">ISSUER:</span>
                      <span className="font-mono break-all text-muted-foreground">{result.issuerAddress}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-8 text-center" style={{ border: "1px solid hsl(0, 85%, 55%, 0.3)", boxShadow: "0 0 30px hsl(0, 85%, 55%, 0.1)" }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="mx-auto mb-4 h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center"
                    style={{ border: "1px solid hsl(0, 85%, 55%, 0.3)" }}
                  >
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                  </motion.div>
                  <h2 className="font-display text-3xl font-black tracking-wider text-destructive">FAILED</h2>
                  <p className="text-muted-foreground text-sm mt-3 max-w-md mx-auto">
                    This hash does not exist on the blockchain. The certificate may be tampered, forged, or the QR code is invalid.
                  </p>
                  <div className="mt-6 p-4 rounded-xl bg-muted/20 border border-border/20 text-xs text-muted-foreground">
                    <p>SHA-512 produces a completely different hash if even one character changes. Blockchain is immutable — no one can alter stored records.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifyPortal;

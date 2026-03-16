import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Upload, CheckCircle, XCircle, ArrowLeft, Hash, Blocks, User, Building, GraduationCap, Clock, Hexagon, ShieldAlert, Eye, ExternalLink, WifiOff, RefreshCw, FileText } from "lucide-react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyCertificate } from "@/lib/blockchain";
import { getRecordByHash } from "@/lib/database";
import { getSignedUrl } from "@/lib/storage";
import { generateSHA512Hash } from "@/lib/crypto";
import { VerificationResult } from "@/lib/types";
import { getEtherscanTxUrl, isContractConfigured } from "@/lib/ethereum";
import ParticleField from "@/components/ParticleField";

interface ExtendedVerificationResult extends VerificationResult {
  cgpa?: number;
  photoUrl?: string;
  certificateUrl?: string;
  isTampered?: boolean;
  tamperMessage?: string;
}

const VerifyPortal = () => {
  const [searchParams] = useSearchParams();
  const [hashInput, setHashInput] = useState(searchParams.get("hash") || "");
  const [result, setResult] = useState<ExtendedVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verify = useCallback(async (hash: string) => {
    if (!hash.trim()) return;
    setLoading(true);
    setNetworkError(false);
    setResult(null);
    try {
      const blockchainResult = await verifyCertificate(hash.trim());
      const dbRecord = await getRecordByHash(hash.trim());

      let photoUrl = "";
      let certificateUrl = "";
      
      if (blockchainResult.exists && dbRecord) {
        // Recompute the master hash from current Supabase data
        const recomputed = await generateSHA512Hash({
          studentName: dbRecord.studentName,
          rollNumber: dbRecord.rollNumber,
          department: dbRecord.department,
          academicYear: dbRecord.academicYear,
          dateOfJoining: dbRecord.dateOfJoining,
          dateOfCompletion: dbRecord.dateOfCompletion,
          totalMarks: dbRecord.totalMarks,
          cgpa: dbRecord.cgpa,
          certificateFileHash: dbRecord.certificateFileHash,
          photoHash: dbRecord.photoHash,
        });

        if (recomputed !== hash.trim()) {
          // Data was tampered after registration
          setResult({
            isValid: false,
            isTampered: true,
            tamperMessage:
              "This record has been tampered with after registration. " +
              "The data no longer matches the blockchain record.",
          });
          return;
        }

        // Hash matches — record is authentic
        if (dbRecord.photoPath) {
          photoUrl = await getSignedUrl("photos", dbRecord.photoPath, 900);
        }
        if (dbRecord.certificateFilePath) {
          certificateUrl = await getSignedUrl("certificates", dbRecord.certificateFilePath, 900);
        }

        setResult({
          isValid: true,
          studentName: dbRecord.studentName,
          rollNumber: dbRecord.rollNumber,
          department: dbRecord.department,
          academicYear: dbRecord.academicYear,
          totalMarks: dbRecord.totalMarks,
          timestamp: blockchainResult.timestamp,
          blockNumber: blockchainResult.blockNumber,
          txHash: dbRecord.blockchainTxHash,
          cgpa: dbRecord.cgpa,
          photoUrl: photoUrl,
          certificateUrl: certificateUrl,
        });
      } else if (blockchainResult.exists) {
        // Hash exists on-chain but no DB record found
        setResult({
          isValid: true,
          timestamp: blockchainResult.timestamp,
          blockNumber: blockchainResult.blockNumber,
        });
      } else {
        setResult({ isValid: false });
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("NETWORK_ERROR") || msg.includes("Failed to fetch") || msg.includes("failed to detect network")) {
        setNetworkError(true);
      } else {
        setResult({ isValid: false });
      }
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

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card rounded-2xl p-12 text-center neon-border-cyan neon-pulse">
                <div className="h-12 w-12 mx-auto mb-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                <p className="text-neon-cyan font-display tracking-wider text-sm">QUERYING BLOCKCHAIN...</p>
                <p className="text-muted-foreground text-xs mt-2 font-mono">Verifying hash on-chain</p>
              </motion.div>
            )}

            {!loading && networkError && (
              <motion.div key="networkError" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <div className="glass-card rounded-2xl p-8 text-center neon-border-cyan" style={{ borderColor: "hsl(45, 85%, 55%)", boxShadow: "0 0 30px hsl(45, 85%, 55%, 0.15)" }}>
                  <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-yellow-500/10 flex items-center justify-center" style={{ border: "1px solid hsl(45, 85%, 55%, 0.4)" }}>
                    <WifiOff className="h-12 w-12 text-yellow-400" />
                  </div>
                  <h2 className="font-display text-2xl font-black tracking-wider text-yellow-400">CONNECTION FAILED</h2>
                  <p className="text-muted-foreground text-sm mt-3 max-w-md mx-auto">
                    Could not connect to the blockchain network. This is a temporary network issue — your certificate may still be valid.
                  </p>
                  <Button onClick={() => verify(hashInput)} className="mt-6 btn-neon-cyan border-0 font-display tracking-wider text-xs rounded-xl h-10 px-6">
                    <RefreshCw className="mr-2 h-4 w-4" /> RETRY VERIFICATION
                  </Button>
                </div>
              </motion.div>
            )}

            {!loading && !networkError && result && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                {result.isValid ? (
                  <div className="glass-card-green rounded-2xl p-8 neon-border-green shadow-xl">
                    <div className="text-center mb-0 relative">
                      {result.photoUrl && (
                        <div className="absolute left-0 top-0 hidden sm:block">
                           <div className="h-28 w-28 rounded-2xl overflow-hidden border-2 border-neon-green/30 shadow-[0_0_15px_rgba(0,255,128,0.2)]">
                              <img src={result.photoUrl} alt="Student Profile" className="w-full h-full object-cover"/>
                           </div>
                        </div>
                      )}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
                        className="mx-auto mb-4 h-20 w-20 rounded-full bg-neon-green/10 flex items-center justify-center neon-border-green neon-pulse"
                      >
                        <CheckCircle className="h-10 w-10 text-neon-green" />
                      </motion.div>
                      <h2 className="font-display text-3xl font-black tracking-wider text-neon-green text-glow-green">AUTHENTIC</h2>
                      <p className="text-muted-foreground text-sm mt-2">Hash verified on blockchain · Details from secure database</p>
                    </div>

                    {result.photoUrl && (
                      <div className="sm:hidden mt-6 flex justify-center">
                         <div className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-neon-green/30 shadow-[0_0_15px_rgba(0,255,128,0.2)]">
                            <img src={result.photoUrl} alt="Student Profile" className="w-full h-full object-cover"/>
                         </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm mt-8 mb-6">
                      {[
                        { icon: User, label: "STUDENT", value: result.studentName || "N/A" },
                        { icon: Hash, label: "ROLL NO", value: result.rollNumber || "N/A" },
                        { icon: Building, label: "DEPT", value: result.department || "N/A" },
                        { icon: GraduationCap, label: "YEAR", value: result.academicYear || "N/A" },
                        { icon: GraduationCap, label: "MARKS", value: result.totalMarks ? `${result.totalMarks}%` : "N/A" },
                        { icon: GraduationCap, label: "CGPA", value: result.cgpa ? result.cgpa : "N/A" },
                        { icon: Clock, label: "REGISTERED", value: result.timestamp ? new Date(result.timestamp).toLocaleDateString() : "N/A" },
                      ].map((item, i) => (
                        <div key={i} className="bg-muted/20 rounded-xl p-3 border border-neon-green/10 flex items-start gap-2">
                          <item.icon className="h-4 w-4 text-neon-green mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground text-[10px] font-display tracking-wider uppercase">{item.label}</p>
                            <p className="font-semibold text-sm leading-tight">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {result.certificateUrl && (
                        <div className="flex flex-col items-center gap-2 mb-6 p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20">
                           <Button asChild className="btn-neon-cyan border-0 font-display tracking-wider text-xs rounded-xl h-10 px-6 w-full sm:w-auto">
                              <a href={result.certificateUrl} target="_blank" rel="noopener noreferrer">
                                 <FileText className="mr-2 h-4 w-4" /> VIEW CERTIFICATE DOCUMENT
                              </a>
                           </Button>
                           <p className="text-[10px] text-muted-foreground">Certificate link expires in 15 minutes</p>
                        </div>
                    )}

                    <div className="space-y-2 p-4 rounded-xl bg-muted/20 border border-border/20 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Blocks className="h-3 w-3 text-neon-purple" />
                        <span className="text-muted-foreground font-display tracking-wider">TX HASH:</span>
                        <span className="font-mono break-all">{result.txHash || "N/A"}</span>
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
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-neon-green/5 border border-neon-green/20 text-xs text-center text-muted-foreground">
                      <p>🔒 <strong>Privacy-preserving:</strong> Only the cryptographic hash is stored on-chain. Student details are kept securely off-chain.</p>
                    </div>
                  </div>
                ) : result.isTampered ? (
                  <div className="glass-card rounded-2xl p-8 text-center" style={{ border: "1px solid hsl(30, 95%, 55%, 0.3)", boxShadow: "0 0 30px hsl(30, 95%, 55%, 0.15)" }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.4 }}
                      className="mx-auto mb-4 h-24 w-24 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "hsl(30, 95%, 55%, 0.1)", border: "1px solid hsl(30, 95%, 55%, 0.3)" }}
                    >
                      <ShieldAlert className="h-12 w-12" style={{ color: "hsl(30, 95%, 55%)" }} />
                    </motion.div>
                    <h2 className="font-display text-3xl font-black tracking-wider" style={{ color: "hsl(30, 95%, 55%)" }}>TAMPERED</h2>
                    <p className="text-muted-foreground text-sm mt-3 max-w-md mx-auto">
                      {result.tamperMessage}
                    </p>
                    <div className="mt-6 p-4 rounded-xl bg-muted/20 border border-border/20 text-xs text-muted-foreground">
                      <p>The hash exists on the blockchain, but the current database record does not match. Someone may have modified the student data after it was originally registered.</p>
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
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default VerifyPortal;

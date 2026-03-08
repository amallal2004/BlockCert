import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Upload, CheckCircle, XCircle, ArrowLeft, Hash, Blocks, User, Building, GraduationCap, Clock } from "lucide-react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { verifyCertificate } from "@/lib/blockchain";
import { getRecordByHash } from "@/lib/database";
import { VerificationResult } from "@/lib/types";

const VerifyPortal = () => {
  const [searchParams] = useSearchParams();
  const [hashInput, setHashInput] = useState(searchParams.get("hash") || "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verify = useCallback((hash: string) => {
    if (!hash.trim()) return;
    setLoading(true);
    // Simulate blockchain latency
    setTimeout(() => {
      const blockchainResult = verifyCertificate(hash.trim());
      const dbRecord = getRecordByHash(hash.trim());

      if (blockchainResult.exists && blockchainResult.entry) {
        setResult({
          isValid: true,
          studentName: blockchainResult.entry.studentName,
          rollNumber: blockchainResult.entry.rollNumber,
          department: blockchainResult.entry.department,
          academicYear: dbRecord?.academicYear,
          totalMarks: dbRecord?.totalMarks,
          timestamp: blockchainResult.entry.timestamp,
          issuerAddress: blockchainResult.entry.issuerAddress,
          txHash: blockchainResult.entry.txHash,
          blockNumber: blockchainResult.entry.blockNumber,
        });
      } else {
        setResult({ isValid: false });
      }
      setLoading(false);
    }, 800);
  }, []);

  // Auto-verify if hash in URL
  useEffect(() => {
    const urlHash = searchParams.get("hash");
    if (urlHash) {
      setHashInput(urlHash);
      verify(urlHash);
    }
  }, [searchParams, verify]);

  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        if (code) {
          // Extract hash from URL or use raw
          const url = code.data;
          const match = url.match(/[?&]hash=([a-fA-F0-9]+)/);
          const hash = match ? match[1] : url;
          setHashInput(hash);
          verify(hash);
        } else {
          setResult({ isValid: false });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) processImage(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-lg font-bold">Certificate Verification</h1>
            <p className="text-xs text-muted-foreground">No login required — verify any certificate instantly</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* QR Upload */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-display">Option 1: Upload QR Code</CardTitle>
              <CardDescription>Drag & drop or click to upload the certificate QR image</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}`}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drop QR code image here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </CardContent>
          </Card>

          {/* Manual Hash */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-display">Option 2: Enter Hash Manually</CardTitle>
              <CardDescription>Paste the SHA-512 certificate hash</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={hashInput}
                  onChange={e => setHashInput(e.target.value)}
                  placeholder="Paste SHA-512 hash here..."
                  className="font-mono text-xs"
                />
                <Button onClick={() => verify(hashInput)} disabled={loading || !hashInput.trim()} className="gradient-primary text-primary-foreground border-0 shrink-0">
                  <Search className="mr-2 h-4 w-4" />
                  Verify
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {loading && (
            <Card className="border-2 animate-pulse">
              <CardContent className="pt-6 text-center py-12">
                <div className="h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Querying blockchain...</p>
              </CardContent>
            </Card>
          )}

          {!loading && result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {result.isValid ? (
                <Card className="border-2 border-success/40 shadow-xl">
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-success" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-success">✅ Authentic Certificate</h2>
                      <p className="text-sm text-muted-foreground mt-1">This certificate is verified on the blockchain</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {[
                        { icon: User, label: "Student Name", value: result.studentName },
                        { icon: Hash, label: "Roll Number", value: result.rollNumber },
                        { icon: Building, label: "Department", value: result.department },
                        { icon: GraduationCap, label: "Academic Year", value: result.academicYear },
                        { icon: GraduationCap, label: "Total Marks", value: result.totalMarks ? `${result.totalMarks}%` : "N/A" },
                        { icon: Clock, label: "Registered", value: result.timestamp ? new Date(result.timestamp).toLocaleDateString() : "N/A" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground text-xs">{item.label}</p>
                            <p className="font-medium">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Blocks className="h-3 w-3 text-chain-purple" />
                        <span className="text-muted-foreground">Tx Hash:</span>
                        <span className="font-mono break-all">{result.txHash}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Block:</span>
                        <span className="font-mono">#{result.blockNumber}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Issuer:</span>
                        <span className="font-mono break-all">{result.issuerAddress}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-destructive/40 shadow-xl">
                  <CardContent className="pt-6 text-center py-12">
                    <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-destructive">❌ Verification Failed</h2>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                      This certificate hash does not exist on the blockchain. The certificate may be tampered with, forged, or the QR code is invalid.
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      If any field in the original certificate was modified (even by one character), the SHA-512 hash changes completely, causing verification to fail.
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifyPortal;

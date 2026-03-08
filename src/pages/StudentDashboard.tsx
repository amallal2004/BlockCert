import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, LogOut, Download, Hash, Blocks, CheckCircle, AlertTriangle, Hexagon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { getRecordByRollNumber } from "@/lib/database";
import { Button } from "@/components/ui/button";

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== "student") navigate("/login?role=student");
  }, [user, navigate]);

  if (!user || user.role !== "student") return null;
  const record = getRecordByRollNumber(user.rollNumber || "");

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record?.rollNumber}_certificate_qr.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="border-b border-border/50 glass-card rounded-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl btn-neon-purple flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold tracking-wider">STUDENT PORTAL</h1>
              <p className="text-xs text-muted-foreground font-mono">{user.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="text-muted-foreground hover:text-foreground font-display text-xs tracking-wider">
            <LogOut className="mr-2 h-4 w-4" /> LOGOUT
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {!record ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card rounded-2xl p-12 text-center neon-border-purple">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-warning" />
              <h2 className="font-display text-xl font-bold tracking-wider mb-2">NO CERTIFICATE</h2>
              <p className="text-muted-foreground">Your certificate hasn't been registered yet. Contact university admin.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-card rounded-2xl p-8 neon-border-cyan">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Hexagon className="h-6 w-6 text-neon-cyan" />
                  <div>
                    <h2 className="font-display text-lg font-bold tracking-wider">CERTIFICATE</h2>
                    <p className="text-muted-foreground text-xs">Blockchain-verified credential</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-display tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/20 neon-pulse">
                  <CheckCircle className="h-3 w-3" /> VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-8">
                {[
                  { label: "NAME", value: record.studentName },
                  { label: "ROLL NO", value: record.rollNumber },
                  { label: "DEPARTMENT", value: record.department },
                  { label: "YEAR", value: record.academicYear },
                  { label: "MARKS", value: `${record.totalMarks}%` },
                  { label: "STATUS", value: "On-Chain" },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 rounded-xl p-3 border border-border/20">
                    <p className="text-muted-foreground text-xs font-display tracking-wider">{item.label}</p>
                    <p className="font-semibold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-8">
                <div className="p-4 rounded-xl bg-muted/20 border border-neon-cyan/10">
                  <div className="flex items-center gap-2 text-xs text-neon-cyan mb-1 font-display tracking-wider">
                    <Hash className="h-3 w-3" /> SHA-512 HASH
                  </div>
                  <p className="text-xs font-mono break-all text-muted-foreground">{record.certificateHash}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-neon-purple/10">
                  <div className="flex items-center gap-2 text-xs text-neon-purple mb-1 font-display tracking-wider">
                    <Blocks className="h-3 w-3" /> TX HASH
                  </div>
                  <p className="text-xs font-mono break-all text-muted-foreground">{record.blockchainTxHash}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-5 pt-4 border-t border-border/20">
                <p className="text-xs font-display tracking-wider text-muted-foreground mt-4">VERIFICATION QR CODE</p>
                <div ref={qrRef} className="p-5 bg-foreground rounded-2xl neon-border-cyan neon-pulse">
                  <QRCodeCanvas value={record.qrCodeData} size={220} level="H" bgColor="#ffffff" fgColor="#0a0e1a" />
                </div>
                <Button onClick={downloadQR} size="lg" className="btn-neon-cyan border-0 font-display tracking-wider text-sm rounded-xl h-12">
                  <Download className="mr-2 h-5 w-5" /> DOWNLOAD QR CODE
                </Button>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Share this QR code with employers. They scan it to verify your certificate on the blockchain instantly.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, LogOut, Download, Hash, Blocks, CheckCircle, AlertTriangle, Hexagon, User, BookOpen, ExternalLink, FileText, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { getRecordByRollNumber } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { StudentRecord } from "@/lib/types";
import { getSignedUrl } from "@/lib/storage";
import { getEtherscanTxUrl } from "@/lib/ethereum";

interface ExtendedStudentRecord extends StudentRecord {
  photoUrl?: string;
  certificateUrl?: string;
}

const StudentDashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  const [record, setRecord] = useState<ExtendedStudentRecord | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [loadingCertUrl, setLoadingCertUrl] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "student")) { navigate("/login?role=student"); return; }
    
    const fetchRecord = async () => {
      try {
        const r = await getRecordByRollNumber(user.rollNumber || "");
        if (r) {
           let photoUrl = "";
           if (r.photoPath) {
             photoUrl = await getSignedUrl("photos", r.photoPath, 900);
           }
           setRecord({ ...r, photoUrl });
        } else {
           setRecord(undefined);
        }
      } catch (err) {
        console.error("Failed to fetch record:", err);
      } finally {
        setLoaded(true);
      }
    };
    fetchRecord();
  }, [user, navigate]);

  if (authLoading || !user || user.role !== "student" || !loaded) return null;

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record?.rollNumber}_certificate_qr.png`;
    a.click();
  };

  const handleViewCertificate = async () => {
    if (!record?.certificateFilePath) return;
    try {
      setLoadingCertUrl(true);
      const url = await getSignedUrl("certificates", record.certificateFilePath, 900);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to generate certificate URL:", err);
    } finally {
      setLoadingCertUrl(false);
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="border-b border-border/50 glass-card rounded-none sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {record?.photoUrl ? (
              <div className="h-10 w-10 rounded-xl overflow-hidden border border-neon-purple/30 shadow-[0_0_10px_rgba(150,0,255,0.2)]">
                <img src={record.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl btn-neon-purple flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="font-display text-sm font-bold tracking-wider text-neon-purple text-glow-purple">STUDENT PORTAL</h1>
              <p className="text-xs text-muted-foreground font-mono">{user.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="text-muted-foreground hover:text-foreground font-display text-xs tracking-wider">
            <LogOut className="mr-2 h-4 w-4" /> LOGOUT
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {!record ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card rounded-2xl p-12 text-center neon-border-purple border-dashed">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-warning opacity-80" />
              <h2 className="font-display text-xl font-bold tracking-wider mb-2 text-warning">NO CERTIFICATE FOUND</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">Your certificate hasn't been registered on the blockchain yet, or your roll number is incorrect. Contact the university administration.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Quick Stats & QR */}
            <div className="space-y-6 lg:col-span-1">
               <div className="glass-card rounded-2xl p-6 border-border/40 bg-gradient-to-b from-card/80 to-card/20 text-center">
                  {record.photoUrl ? (
                     <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-[0_4px_20px_rgba(0,0,0,0.5)] mb-4 relative group cursor-pointer">
                        <img src={record.photoUrl} alt="Student" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 border-2 border-neon-cyan rounded-full opacity-50"></div>
                     </div>
                  ) : (
                     <div className="mx-auto w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-4 border border-border/50">
                        <User className="h-10 w-10 text-muted-foreground/50" />
                     </div>
                  )}
                  <h3 className="font-display text-lg font-bold tracking-wider">{record.studentName}</h3>
                  <p className="text-sm font-mono text-neon-cyan mt-1">{record.rollNumber}</p>
                  
                  <div className="mt-6 flex flex-col items-center gap-4">
                     <p className="text-[10px] font-display tracking-widest text-muted-foreground uppercase">Verification QR</p>
                     <div ref={qrRef} className="p-3 bg-white rounded-xl shadow-lg border-2 border-neon-cyan/20">
                     <QRCodeCanvas value={record.qrCodeData} size={150} level="H" bgColor="#ffffff" fgColor="#0a0e1a" />
                     </div>
                     <Button onClick={downloadQR} variant="outline" size="sm" className="w-full font-display border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 text-xs">
                     <Download className="mr-2 h-3 w-3" /> DOWNLOAD QR
                     </Button>
                  </div>
               </div>

               {record.certificateFilePath && (
                  <div className="glass-card rounded-2xl p-6 border-neon-cyan/20 bg-neon-cyan/5 text-center">
                     <FileText className="h-8 w-8 text-neon-cyan mx-auto mb-3" />
                     <h3 className="font-display text-sm tracking-widest text-foreground mb-2">DIGITAL DOCUMENT</h3>
                     <Button onClick={handleViewCertificate} disabled={loadingCertUrl} className="w-full btn-neon-cyan border-0 font-display tracking-wider text-xs h-10">
                        {loadingCertUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />} 
                        VIEW FULL CERTIFICATE
                     </Button>
                     <p className="text-[10px] text-muted-foreground mt-3 leading-tight">Link expires in 15 minutes. Refresh page for a new secure link.</p>
                  </div>
               )}
            </div>

            {/* Right Column: Detailed Specs */}
            <div className="space-y-6 lg:col-span-2">
               <div className="glass-card rounded-2xl p-8 neon-border-cyan h-full flex flex-col">
               <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/30">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
                        <BookOpen className="h-5 w-5" />
                     </div>
                     <div>
                     <h2 className="font-display text-lg font-bold tracking-wider">ACADEMIC RECORD</h2>
                     <p className="text-muted-foreground text-xs font-mono">Blockchain-anchored credential</p>
                     </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,128,0.15)]">
                     <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                     <span className="text-[10px] font-display tracking-widest text-neon-green font-bold uppercase">Verified On-Chain</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-y-6 gap-x-4 flex-grow">
                  {[
                     { label: "DEPARTMENT", value: record.department },
                     { label: "ACADEMIC YEAR", value: record.academicYear },
                     { label: "JOINING DATE", value: new Date(record.dateOfJoining).toLocaleDateString() },
                     { label: "COMPLETION", value: new Date(record.dateOfCompletion).toLocaleDateString() },
                  ].map((item, i) => (
                     <div key={i}>
                     <p className="text-[10px] text-muted-foreground font-display tracking-widest uppercase mb-1">{item.label}</p>
                     <p className="text-sm font-medium">{item.value}</p>
                     </div>
                  ))}
                  
                  <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
                     <div className="bg-card/50 rounded-xl p-4 border border-border/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-neon-purple/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500" />
                        <p className="text-[10px] text-neon-purple font-display tracking-widest uppercase mb-1">FINAL SCORE</p>
                        <p className="text-2xl font-black font-mono text-foreground">{record.totalMarks}<span className="text-sm text-muted-foreground">%</span></p>
                     </div>
                     <div className="bg-card/50 rounded-xl p-4 border border-border/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-neon-cyan/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500" />
                        <p className="text-[10px] text-neon-cyan font-display tracking-widest uppercase mb-1">CUMULATIVE GPA</p>
                        <p className="text-2xl font-black font-mono text-foreground">{record.cgpa ? record.cgpa.toFixed(2) : "N/A"}</p>
                     </div>
                  </div>
               </div>

               <div className="mt-8 space-y-3 pt-6 border-t border-border/30">
                  <h4 className="text-[10px] font-display tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                     <Blocks className="w-3 h-3" /> Cryptographic Proofs
                  </h4>
                  <div className="p-4 rounded-xl bg-card border border-border/50 text-xs group cursor-default hover:border-neon-cyan/30 transition-colors">
                     <div className="flex items-center gap-2 text-neon-cyan mb-1.5 font-display tracking-wider">
                     <Hash className="h-3 w-3" /> SHA-512 RECORD HASH
                     </div>
                     <p className="font-mono break-all text-muted-foreground group-hover:text-foreground/80 transition-colors">{record.certificateHash}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50 text-xs group cursor-default hover:border-neon-purple/30 transition-colors">
                     <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-neon-purple font-display tracking-wider">
                           <Blocks className="h-3 w-3" /> BLOCKCHAIN TX HASH
                        </div>
                        <a href={getEtherscanTxUrl(record.blockchainTxHash)} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-1 text-neon-cyan hover:underline hover:text-white transition-colors">
                           <ExternalLink className="h-3 w-3" /> Etherscan
                        </a>
                     </div>
                     <p className="font-mono break-all text-muted-foreground group-hover:text-foreground/80 transition-colors">{record.blockchainTxHash}</p>
                  </div>
               </div>
               </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;

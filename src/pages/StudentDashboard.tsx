import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, LogOut, Download, Hash, Blocks, CheckCircle, AlertTriangle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { getRecordByRollNumber } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-success flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Student Portal</h1>
              <p className="text-xs text-muted-foreground">Welcome, {user.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {!record ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-2 border-warning/30">
              <CardContent className="pt-6 text-center py-16">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
                <h2 className="font-display text-xl font-semibold mb-2">No Certificate Found</h2>
                <p className="text-muted-foreground">Your certificate hasn't been registered yet. Please contact the university administration.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display text-2xl">Certificate Details</CardTitle>
                    <CardDescription>Your blockchain-verified academic certificate</CardDescription>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20">
                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {[
                    { label: "Name", value: record.studentName },
                    { label: "Roll Number", value: record.rollNumber },
                    { label: "Department", value: record.department },
                    { label: "Academic Year", value: record.academicYear },
                    { label: "Total Marks", value: `${record.totalMarks}%` },
                    { label: "Status", value: "Registered on Blockchain" },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-muted-foreground text-xs">{item.label}</p>
                      <p className="font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-chain-blue" />
                    <span className="text-muted-foreground">Certificate Hash (SHA-512):</span>
                  </div>
                  <p className="text-xs font-mono break-all">{record.certificateHash}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Blocks className="h-4 w-4 text-chain-purple" />
                    <span className="text-muted-foreground">Blockchain Tx Hash:</span>
                  </div>
                  <p className="text-xs font-mono break-all">{record.blockchainTxHash}</p>
                </div>

                <div className="flex flex-col items-center gap-4 pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Your Verification QR Code</p>
                  <div ref={qrRef} className="p-6 bg-card rounded-2xl border-2 shadow-sm">
                    <QRCodeCanvas value={record.qrCodeData} size={220} level="H" />
                  </div>
                  <Button onClick={downloadQR} size="lg" className="gradient-primary text-primary-foreground border-0">
                    <Download className="mr-2 h-5 w-5" /> Download QR Code
                  </Button>
                  <p className="text-xs text-muted-foreground text-center max-w-sm">
                    Share this QR code with employers. They can scan it to instantly verify your certificate authenticity.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;

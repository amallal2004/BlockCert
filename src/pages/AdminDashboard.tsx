import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, List, ShieldCheck, LogOut, Activity, Blocks, Hash, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecords } from "@/lib/database";
import { getBlockchainStats, verifyChainIntegrity } from "@/lib/blockchain";
import { useToast } from "@/hooks/use-toast";
import AddRecordForm from "@/components/AddRecordForm";
import RecordsTable from "@/components/RecordsTable";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState<"dashboard" | "add" | "records">("dashboard");
  const [records, setRecords] = useState(getRecords());
  const stats = getBlockchainStats();

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login?role=admin");
  }, [user, navigate]);

  const handleVerifyChain = () => {
    const result = verifyChainIntegrity();
    toast({
      title: result.isValid ? "✅ Chain Verified" : "❌ Chain Compromised",
      description: result.message,
      variant: result.isValid ? "default" : "destructive",
    });
  };

  const refreshRecords = () => setRecords(getRecords());

  if (view === "add") {
    return <AddRecordForm onBack={() => { setView("dashboard"); refreshRecords(); }} />;
  }

  if (view === "records") {
    return <RecordsTable records={records} onBack={() => setView("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Blocks className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome, {user?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Certificates", value: stats.totalCertificates, icon: Hash, color: "text-chain-blue" },
            { label: "Blockchain Blocks", value: stats.totalBlocks, icon: Blocks, color: "text-chain-purple" },
            { label: "Last Activity", value: stats.lastBlockTimestamp ? new Date(stats.lastBlockTimestamp).toLocaleDateString() : "N/A", icon: Clock, color: "text-chain-green" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                      <s.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-display font-bold">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/30" onClick={() => setView("add")}>
            <CardContent className="pt-6 text-center">
              <Plus className="h-10 w-10 mx-auto mb-3 text-chain-blue" />
              <h3 className="font-display font-semibold text-lg">Add New Record</h3>
              <p className="text-sm text-muted-foreground mt-1">Register a student certificate</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/30" onClick={() => setView("records")}>
            <CardContent className="pt-6 text-center">
              <List className="h-10 w-10 mx-auto mb-3 text-chain-purple" />
              <h3 className="font-display font-semibold text-lg">View All Records</h3>
              <p className="text-sm text-muted-foreground mt-1">{records.length} certificates registered</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/30" onClick={handleVerifyChain}>
            <CardContent className="pt-6 text-center">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-chain-green" />
              <h3 className="font-display font-semibold text-lg">Verify Blockchain</h3>
              <p className="text-sm text-muted-foreground mt-1">Check chain integrity</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Activity className="h-5 w-5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No records yet. Add your first student certificate!</p>
            ) : (
              <div className="space-y-3">
                {records.slice(-5).reverse().map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground">{r.rollNumber} · {r.department}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;

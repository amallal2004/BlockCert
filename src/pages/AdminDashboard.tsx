import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, List, LogOut, Activity, Blocks, Hash, Clock, Hexagon, Zap, Building, Users, Wallet, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getRecords } from "@/lib/database";
import { getBlockchainStats } from "@/lib/blockchain";
import { useToast } from "@/hooks/use-toast";
import AddRecordForm from "@/components/AddRecordForm";
import RecordsTable from "@/components/RecordsTable";
import DepartmentManager from "@/components/DepartmentManager";
import StudentManager from "@/components/StudentManager";
import { connectWallet, isMetaMaskInstalled, getEtherscanAddressUrl, getContractAddress } from "@/lib/ethereum";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState<"dashboard" | "add" | "records" | "departments" | "students">("dashboard");
  const [records, setRecords] = useState(getRecords());
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [onChainTotal, setOnChainTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login?role=admin");
  }, [user, navigate]);

  useEffect(() => {
    getBlockchainStats().then(s => setOnChainTotal(s.totalCertificates)).catch(() => {});
  }, [records]);

  const handleConnectWallet = async () => {
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
      toast({ title: "✅ Wallet Connected", description: `${address.slice(0, 6)}...${address.slice(-4)}` });
    } catch (err: any) {
      toast({ title: "Wallet Error", description: err.message, variant: "destructive" });
    }
  };

  const refreshRecords = () => setRecords(getRecords());

  if (view === "add") return <AddRecordForm onBack={() => { setView("dashboard"); refreshRecords(); }} />;
  if (view === "records") return <RecordsTable records={records} onBack={() => setView("dashboard")} />;
  if (view === "departments") return <DepartmentManager onBack={() => setView("dashboard")} />;
  if (view === "students") return <StudentManager onBack={() => setView("dashboard")} />;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="border-b border-border/50 glass-card rounded-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl btn-neon-cyan flex items-center justify-center">
              <Blocks className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold tracking-wider">ADMIN DASHBOARD</h1>
              <p className="text-xs text-muted-foreground font-mono">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isMetaMaskInstalled() ? (
              walletAddress ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-xs">
                  <Wallet className="h-3 w-3 text-neon-green" />
                  <span className="font-mono text-neon-green">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
              ) : (
                <Button onClick={handleConnectWallet} size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground font-display text-xs tracking-wider">
                  <Wallet className="mr-2 h-4 w-4" /> CONNECT WALLET
                </Button>
              )
            ) : (
              <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border/20 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Wallet className="h-3 w-3" /> Install MetaMask
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="text-muted-foreground hover:text-foreground font-display text-xs tracking-wider">
              <LogOut className="mr-2 h-4 w-4" /> LOGOUT
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "ON-CHAIN CERTS", value: onChainTotal !== null ? onChainTotal : "...", icon: Hash, glassClass: "glass-card", borderClass: "neon-border-cyan", iconColor: "text-neon-cyan" },
            { label: "LOCAL RECORDS", value: records.length, icon: Blocks, glassClass: "glass-card-purple", borderClass: "neon-border-purple", iconColor: "text-neon-purple" },
            { label: "NETWORK", value: "Sepolia", icon: Clock, glassClass: "glass-card-green", borderClass: "neon-border-green", iconColor: "text-neon-green" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className={`${s.glassClass} rounded-2xl p-6`}>
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center ${s.iconColor} ${s.borderClass}`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">{s.label}</p>
                    <p className="text-3xl font-display font-black">{s.value}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Plus, title: "ADD RECORD", desc: "Register a certificate", onClick: () => setView("add"), glassClass: "glass-card", iconColor: "text-neon-cyan", borderClass: "neon-border-cyan" },
            { icon: List, title: "VIEW RECORDS", desc: `${records.length} registered`, onClick: () => setView("records"), glassClass: "glass-card-purple", iconColor: "text-neon-purple", borderClass: "neon-border-purple" },
            { icon: Building, title: "DEPARTMENTS", desc: "Manage departments", onClick: () => setView("departments"), glassClass: "glass-card", iconColor: "text-neon-pink", borderClass: "neon-border-cyan" },
            { icon: Users, title: "STUDENTS", desc: "Manage credentials", onClick: () => setView("students"), glassClass: "glass-card-purple", iconColor: "text-neon-blue", borderClass: "neon-border-purple" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              onClick={item.onClick}
              className={`${item.glassClass} rounded-2xl p-8 text-center cursor-pointer hover:scale-[1.03] transition-all duration-300 group`}
            >
              <div className={`h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center ${item.iconColor} ${item.borderClass} group-hover:neon-pulse`}>
                <item.icon className="h-8 w-8" />
              </div>
              <h3 className="font-display font-bold text-sm tracking-wider mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Contract Info */}
        <div className="glass-card rounded-2xl p-4 mb-8 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Blocks className="h-4 w-4 text-neon-cyan" />
            <span className="font-display tracking-wider text-muted-foreground">CONTRACT:</span>
            <span className="font-mono text-neon-cyan">{getContractAddress().slice(0, 10)}...{getContractAddress().slice(-8)}</span>
          </div>
          <a href={getEtherscanAddressUrl(getContractAddress())} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-neon-cyan hover:underline">
            <ExternalLink className="h-3 w-3" /> View on Etherscan
          </a>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border/30 flex items-center gap-2">
            <Activity className="h-5 w-5 text-neon-cyan" />
            <h2 className="font-display text-sm font-bold tracking-wider">RECENT ACTIVITY</h2>
          </div>
          <div className="p-6">
            {records.length === 0 ? (
              <div className="text-center py-12">
                <Hexagon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-muted-foreground text-sm">No records yet. Add your first certificate!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.slice(-5).reverse().map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-neon-cyan" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.rollNumber} · {r.department}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

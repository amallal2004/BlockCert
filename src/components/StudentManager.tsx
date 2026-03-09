import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, RotateCcw, Lock, Copy, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStudentUsers, resetStudentPassword } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/types";

interface Props {
  onBack: () => void;
}

const StudentManager = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [students, setStudents] = useState<User[]>([]);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const loadStudents = async () => {
    const users = await getStudentUsers();
    setStudents(users);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleReset = async (userId: string) => {
    try {
      const newPwd = await resetStudentPassword(userId);
      await loadStudents();
      setResetPasswords(prev => ({ ...prev, [userId]: newPwd }));
      toast({ title: "✅ Password Reset", description: "Copy the new password below and share it with the student." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCopy = (userId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [userId]: true }));
    toast({ title: "📋 Copied!", description: "Password copied to clipboard." });
    setTimeout(() => setCopied(prev => ({ ...prev, [userId]: false })), 2000);
  };

  const dismissPassword = (userId: string) => {
    setResetPasswords(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background cyber-grid p-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="glass-card rounded-2xl p-8 neon-border-cyan">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl btn-neon-cyan flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-wider">STUDENT ACCOUNTS</h2>
              <p className="text-muted-foreground text-sm">Manage credentials & reset passwords</p>
            </div>
          </div>

          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/20 border border-border/30 focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm transition-colors"
            />
          </div>

          {(() => {
            const filteredStudents = students.filter(
              (s) =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (<>

            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-muted-foreground text-sm">No student accounts yet. They are created when you register a certificate.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student, i) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-neon-cyan/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{student.rollNumber}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(student.id)}
                        className="text-neon-cyan hover:text-neon-cyan/80 font-display text-xs tracking-wider"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> RESET PASSWORD
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-display tracking-wider">USER:</span>
                        <span className="font-mono text-neon-cyan">{student.username}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-display tracking-wider">PASS:</span>
                        <span className="font-mono text-muted-foreground">••••••••</span>
                      </div>
                    </div>

                    {resetPasswords[student.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 p-3 rounded-lg bg-neon-green/5 border border-neon-green/20"
                      >
                        <p className="text-xs text-neon-green font-display tracking-wider mb-2">⚠️ NEW PASSWORD — COPY NOW</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted/30 px-3 py-2 rounded-lg font-mono text-sm text-foreground select-all">
                            {resetPasswords[student.id]}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopy(student.id, resetPasswords[student.id])}
                            className="text-neon-green hover:text-neon-green/80 shrink-0"
                          >
                            {copied[student.id] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <button
                          onClick={() => dismissPassword(student.id)}
                          className="text-xs text-muted-foreground hover:text-foreground mt-2 font-display tracking-wider"
                        >
                          DISMISS
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-muted/10 border border-border/10 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-3 w-3 text-neon-purple" />
              <span className="font-display tracking-wider text-neon-purple">NOTE</span>
            </div>
            <p>Student accounts are auto-created when you register a certificate. Username & default password = roll number (lowercase). Click RESET PASSWORD to generate a new password — copy it immediately and share with the student.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManager;

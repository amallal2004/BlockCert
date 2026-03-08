import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, KeyRound, Eye, EyeOff, RotateCcw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStudentUsers, resetStudentPassword } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onBack: () => void;
}

const StudentManager = ({ onBack }: Props) => {
  const { toast } = useToast();
  const students = getStudentUsers();
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleReset = (userId: string) => {
    try {
      resetStudentPassword(userId, newPassword);
      toast({ title: "✅ Password Reset", description: "Student password has been updated." });
      setResetId(null);
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
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

          {students.length === 0 ? (
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
                        onClick={() => { setResetId(resetId === student.id ? null : student.id); setNewPassword(""); }}
                        className="text-neon-cyan hover:text-neon-cyan/80 font-display text-xs tracking-wider"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> RESET
                      </Button>
                    </div>

                    {/* Current credentials */}
                    <div className="flex items-center gap-4 text-xs mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-display tracking-wider">USER:</span>
                        <span className="font-mono text-neon-cyan">{student.username}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-display tracking-wider">PASS:</span>
                        <span className="font-mono">{showPasswords[student.id] ? student.password : "••••••"}</span>
                        <button onClick={() => toggleShowPassword(student.id)} className="text-muted-foreground hover:text-foreground">
                          {showPasswords[student.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Reset form */}
                    {resetId === student.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-border/20"
                      >
                        <div className="flex gap-2">
                          <Input
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New password (min 4 chars)"
                            type="text"
                            className="bg-muted/30 border-border/50 h-10 font-mono text-sm focus:border-neon-cyan"
                          />
                          <Button
                            onClick={() => handleReset(student.id)}
                            disabled={newPassword.length < 4}
                            className="btn-neon-cyan border-0 shrink-0 font-display tracking-wider text-xs rounded-xl h-10 px-4"
                          >
                            <KeyRound className="mr-1 h-3 w-3" /> SET
                          </Button>
                        </div>
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
            <p>Student accounts are auto-created when you register a certificate. Username = roll number (lowercase). Default password = roll number. You can reset passwords here anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManager;

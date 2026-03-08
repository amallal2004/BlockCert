import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Eye, EyeOff, RotateCcw, Lock } from "lucide-react";
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
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const loadStudents = async () => {
    const users = await getStudentUsers();
    setStudents(users);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleReset = async (userId: string) => {
    try {
      const newPwd = await resetStudentPassword(userId);
      await loadStudents();
      toast({ title: "✅ Password Reset", description: `New password: ${newPwd}` });
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
                        onClick={() => handleReset(student.id)}
                        className="text-neon-cyan hover:text-neon-cyan/80 font-display text-xs tracking-wider"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> RESET
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-display tracking-wider">USER:</span>
                        <span className="font-mono text-neon-cyan">{student.username}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-display tracking-wider">PASS:</span>
                        <span className="font-mono">{showPasswords[student.id] ? student.password : "••••••••"}</span>
                        <button onClick={() => toggleShowPassword(student.id)} className="text-muted-foreground hover:text-foreground">
                          {showPasswords[student.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
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
            <p>Student accounts are auto-created when you register a certificate. Username = roll number (lowercase). Passwords are auto-generated. Click RESET to regenerate a new password instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManager;

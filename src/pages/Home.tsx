import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, GraduationCap, Search, Lock, CheckCircle, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8">
              <Blocks className="h-4 w-4" />
              Powered by Blockchain Technology
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="text-gradient">Blockchain-Based</span>
              <br />
              Certificate Validation
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              A tamper-proof system where universities register student records on the blockchain. 
              Employers can instantly verify authenticity — no trust required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground border-0 text-base px-8 h-12">
                <Link to="/login?role=admin">
                  <Shield className="mr-2 h-5 w-5" />
                  Admin Login
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base px-8 h-12">
                <Link to="/login?role=student">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Student Login
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="text-base px-8 h-12">
                <Link to="/verify">
                  <Search className="mr-2 h-5 w-5" />
                  Verify Now
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-card border-t border-b">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                title: "Hash & Register",
                desc: "University admin enters student details. SHA-512 hash is computed and stored on the blockchain.",
                color: "text-chain-blue",
              },
              {
                icon: CheckCircle,
                title: "QR Code Generated",
                desc: "A unique QR code encoding the verification URL + hash is generated for the student.",
                color: "text-chain-green",
              },
              {
                icon: Search,
                title: "Instant Verification",
                desc: "Anyone scans the QR code or pastes the hash. Blockchain confirms authenticity in seconds.",
                color: "text-chain-purple",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="text-center p-8 rounded-xl border bg-background hover:shadow-lg transition-shadow"
              >
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl bg-muted mb-6 ${item.color}`}>
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        <p>Blockchain Certificate Validation System — Final Year Project Demo</p>
        <p className="mt-1">Demo credentials: admin/admin or student1/student1</p>
      </footer>
    </div>
  );
};

export default Home;

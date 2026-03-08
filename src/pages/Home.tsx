import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, GraduationCap, Search, Lock, CheckCircle, Blocks, Hexagon, Zap, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import ParticleField from "@/components/ParticleField";

const Home = () => {
  return (
    <div className="min-h-screen bg-background cyber-grid relative">
      <ParticleField />

      {/* Hero */}
      <section className="relative overflow-hidden scanlines">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-neon-purple/5 blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 py-24 md:py-40 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full neon-border-cyan px-5 py-2 text-sm font-semibold text-neon-cyan mb-10 bg-neon-cyan/5"
            >
              <Hexagon className="h-4 w-4 animate-neon-flicker" />
              POWERED BY BLOCKCHAIN
              <Zap className="h-4 w-4" />
            </motion.div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-wider mb-8 leading-tight">
              <span className="text-gradient-cyber text-glow-cyan">BLOCK</span>
              <span className="text-foreground">CERT</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-14 font-sans leading-relaxed"
            >
              A tamper-proof certificate validation system built on blockchain. 
              Universities register records. Employers verify instantly. 
              <span className="text-neon-cyan font-semibold"> Zero trust required.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="btn-neon-cyan border-0 text-base px-8 h-14 rounded-xl font-display tracking-wider text-sm">
                <Link to="/login?role=admin">
                  <Shield className="mr-2 h-5 w-5" />
                  ADMIN LOGIN
                </Link>
              </Button>
              <Button asChild size="lg" className="btn-neon-purple border-0 text-base px-8 h-14 rounded-xl font-display tracking-wider text-sm">
                <Link to="/login?role=student">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  STUDENT LOGIN
                </Link>
              </Button>
              <Button asChild size="lg" className="btn-neon-green border-0 text-base px-8 h-14 rounded-xl font-display tracking-wider text-sm">
                <Link to="/verify">
                  <Eye className="mr-2 h-5 w-5" />
                  VERIFY NOW
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4 tracking-wider"
          >
            HOW IT <span className="text-gradient-cyber">WORKS</span>
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">Three steps to tamper-proof verification</p>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                title: "HASH & REGISTER",
                desc: "University admin enters student details. SHA-512 hash is computed and stored immutably on the blockchain.",
                glassClass: "glass-card",
                borderClass: "neon-border-cyan",
                iconColor: "text-neon-cyan",
                step: "01",
              },
              {
                icon: CheckCircle,
                title: "QR GENERATED",
                desc: "A unique QR code encoding the verification URL + hash is generated for the student to download.",
                glassClass: "glass-card-purple",
                borderClass: "neon-border-purple",
                iconColor: "text-neon-purple",
                step: "02",
              },
              {
                icon: Search,
                title: "INSTANT VERIFY",
                desc: "Anyone scans the QR or pastes the hash. Blockchain confirms authenticity in seconds. Zero trust needed.",
                glassClass: "glass-card-green",
                borderClass: "neon-border-green",
                iconColor: "text-neon-green",
                step: "03",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className={`${item.glassClass} rounded-2xl p-8 hover:scale-[1.02] transition-transform duration-300 group relative overflow-hidden`}
              >
                <div className="absolute top-4 right-4 font-display text-4xl font-black text-foreground/5">
                  {item.step}
                </div>
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl bg-muted/50 mb-6 ${item.iconColor} ${item.borderClass}`}>
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-bold mb-3 tracking-wider">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4">
          <div className="glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center justify-around gap-8">
            {[
              { value: "SHA-512", label: "Hashing Algorithm", color: "text-neon-cyan" },
              { value: "IMMUTABLE", label: "Blockchain Ledger", color: "text-neon-purple" },
              { value: "< 3 SEC", label: "Verification Time", color: "text-neon-green" },
              { value: "0%", label: "False Positive Rate", color: "text-neon-pink" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className={`font-display text-2xl md:text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-muted-foreground text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50 relative z-10">
        <p className="font-display tracking-wider text-xs">BLOCKCERT — BLOCKCHAIN CERTIFICATE VALIDATION SYSTEM</p>
        <p className="mt-2 text-muted-foreground/60">Admin: admin / admin123 · Students: login with roll number (provided by admin)</p>
      </footer>
    </div>
  );
};

export default Home;

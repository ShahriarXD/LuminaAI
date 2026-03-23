import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HeroOrb } from "@/components/HeroOrb";
import { Brain, FolderKanban, Mic, Search, Moon, Share2, ArrowRight } from "lucide-react";

const features = [
{ icon: Brain, title: "Deep Think Mode", desc: "Step-by-step reasoning with detailed analytical responses" },
{ icon: FolderKanban, title: "Project Workspaces", desc: "Organize chats into separate projects with custom context" },
{ icon: Mic, title: "Voice Input", desc: "Speak instead of typing with a premium listening experience" },
{ icon: Search, title: "Smart Search", desc: "Find any conversation instantly with keyword search" },
{ icon: Moon, title: "Dark & Light", desc: "Beautiful interface that adapts to your preference" },
{ icon: Share2, title: "Share & Export", desc: "Share chats publicly or export as PDF/Markdown" }];


export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Check your email for confirmation!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 z-50 w-full glass border-b border-border/30">
        
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="font-display text-sm font-bold text-primary">C</span>
            </div>
            <span className="font-display text-lg font-bold text-foreground">ChatBot</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {setShowAuth(true);setIsLogin(true);}}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground">
              
              Sign In
            </button>
            <button
              onClick={() => {setShowAuth(true);setIsLogin(false);}}
              className="rounded-full gradient-send px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110 active:scale-[0.97]">
              
              Get Started
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-20">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center">
          
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            ✨ AI-Powered Intelligence
          </span>
          <h1
            className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
            style={{ lineHeight: "1.08" }}>
            
            <span className="text-gradient-muted">Your Smart</span>{" "}
            <span className="text-foreground">AI</span>
            <br />
            <span className="text-foreground">Chat Assistant</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
            A premium AI chatbot with deep thinking, project workspaces, voice input, and beautiful design.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {setShowAuth(true);setIsLogin(false);}}
              className="flex items-center gap-2 rounded-full gradient-send px-7 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110">
              
              Start for Free <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8">
          
          <HeroOrb />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center font-display text-3xl font-bold text-foreground sm:text-4xl">
            
            ​KM
          </motion.h2>
          <p className="mx-auto mt-3 max-w-md text-center text-muted-foreground">
            Powerful features designed to make your AI experience exceptional.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) =>
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-strong group rounded-2xl p-6 transition-all duration-300 hover:shadow-glass-hover hover:-translate-y-1">
              
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl glass-strong rounded-3xl p-12 text-center shadow-glass">
          
          <h2 className="font-display text-3xl font-bold text-foreground">Ready to get started?</h2>
          <p className="mt-3 text-muted-foreground">Create your free account and start chatting with AI today.</p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {setShowAuth(true);setIsLogin(false);}}
            className="mt-8 inline-flex items-center gap-2 rounded-full gradient-send px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110">
            
            Create Free Account <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </section>

      {/* Auth Modal */}
      {showAuth &&
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-xl px-4"
        onClick={() => setShowAuth(false)}>
        
          <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong w-full max-w-sm rounded-2xl p-8 shadow-glass"
          onClick={(e) => e.stopPropagation()}>
          
            <h2 className="mb-6 text-center font-display text-2xl font-bold text-foreground">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
            
              <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
            
              <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl gradient-send py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:shadow-glow active:scale-[0.97] disabled:opacity-50">
              
                {loading ? "..." : isLogin ? "Sign In" : "Sign Up"}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      }
    </div>);

}
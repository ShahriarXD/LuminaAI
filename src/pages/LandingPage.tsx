import { useState, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HeroOrb } from "@/components/HeroOrb";
import {
  Brain, FolderKanban, Mic, Search, Share2, ArrowRight, Globe, FileText,
  MemoryStick, Code2, MessageSquare, Zap, Check, Sparkles, BookOpen, Users,
  TrendingUp, Lightbulb, ChevronRight } from
"lucide-react";

/* ─── data ─── */
const floatingChips = [
{ label: "Deep Think", icon: Brain, x: -160, y: -40, delay: 0.6 },
{ label: "Web Search", icon: Globe, x: 155, y: -55, delay: 0.8 },
{ label: "Voice Input", icon: Mic, x: -145, y: 50, delay: 1.0 },
{ label: "Memory", icon: MemoryStick, x: 160, y: 40, delay: 1.2 }];


const features = [
{ icon: Brain, title: "Deep Think & Research", desc: "Multi-step reasoning with chain-of-thought analysis for complex questions and deep research tasks.", accent: "primary" },
{ icon: Globe, title: "Web Search + Citations", desc: "Real-time internet search with inline source citations so you can verify every answer.", accent: "accent" },
{ icon: FileText, title: "Chat With Your Files", desc: "Upload documents and let AI understand, summarize, and answer questions from your own knowledge base.", accent: "primary" },
{ icon: FolderKanban, title: "Project Workspaces", desc: "Organize conversations into dedicated workspaces with custom context and system prompts.", accent: "accent" },
{ icon: MemoryStick, title: "Long-Term Memory", desc: "AI remembers what matters across conversations — your preferences, past decisions, and context.", accent: "primary" },
{ icon: Mic, title: "Voice Input & Output", desc: "Speak naturally and listen to responses with a premium voice experience.", accent: "accent" },
{ icon: Share2, title: "Share & Export", desc: "Share conversations publicly or export as PDF and Markdown for documentation.", accent: "primary" },
{ icon: Code2, title: "Developer-Friendly Code", desc: "Syntax-highlighted code blocks with copy buttons and language detection built in.", accent: "accent" },
{ icon: Search, title: "Search All Chats", desc: "Instantly find any conversation across your entire history with keyword search.", accent: "primary" }];


const steps = [
{ num: "01", title: "Ask naturally", desc: "Type or speak your question. Attach files, enable deep think, or trigger web search — all from one input.", icon: MessageSquare },
{ num: "02", title: "AI thinks deeply", desc: "The AI reasons step-by-step, searches the web, retrieves your documents, and recalls past context.", icon: Zap },
{ num: "03", title: "Get structured answers", desc: "Receive beautifully formatted responses with sources, code blocks, and memory — all saved for later.", icon: Sparkles }];


const differentiators = [
{ feature: "Long-term memory", us: true, them: false },
{ feature: "Web search with citations", us: true, them: false },
{ feature: "Project workspaces", us: true, them: false },
{ feature: "File & document RAG", us: true, them: false },
{ feature: "Voice input & output", us: true, them: false },
{ feature: "Chat sharing & export", us: true, them: false },
{ feature: "Deep research mode", us: true, them: false },
{ feature: "Basic chat", us: true, them: true }];


const useCases = [
{ icon: Code2, title: "Developers", desc: "Debug code, explore APIs, and get syntax-highlighted answers with copy-paste ready blocks." },
{ icon: BookOpen, title: "Researchers", desc: "Deep research with web citations, file analysis, and long-term memory across projects." },
{ icon: Lightbulb, title: "Founders", desc: "Brainstorm, strategize, and organize ideas in project workspaces with persistent context." },
{ icon: Users, title: "Students", desc: "Study smarter with explanations, summaries, and memory that tracks your learning journey." },
{ icon: TrendingUp, title: "Analysts", desc: "Analyze data, search markets, and build knowledge bases with document uploads and search." },
{ icon: MessageSquare, title: "Content Creators", desc: "Write, edit, and refine content with an AI that remembers your style and preferences." }];


/* ─── section wrapper with scroll animation ─── */
function Section({ children, className = "", delay = 0, id }: {children: React.ReactNode;className?: string;delay?: number;id?: string;}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}>
      
      {children}
    </motion.section>);

}

/* ─── main ─── */
export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.96]);

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

  const openAuth = (login: boolean) => {setShowAuth(true);setIsLogin(login);};

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Nav ── */}
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
            <span className="font-display text-lg font-bold text-foreground">Lumina by KM ❤️      </span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#use-cases" className="hover:text-foreground transition-colors">Use Cases</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuth(true)}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground">
              
              Sign In
            </button>
            <button
              onClick={() => openAuth(false)}
              className="rounded-full gradient-send px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:shadow-glow hover:brightness-110 active:scale-[0.97]">
              
              Get Started
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-20 pb-12">
        
        {/* Background gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 h-[700px] w-[700px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />
        </div>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center max-w-3xl mx-auto">
          
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-Powered Deep Research & Memory
          </motion.span>

          <h1
            className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ lineHeight: "1.08" }}>
            
            <span className="text-foreground">Think deeper.</span>
            <br />
            <span className="text-gradient-muted">Remember everything.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            An AI workspace that researches the web, remembers your context, understands your files, and delivers structured answers — all in one premium experience.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openAuth(false)}
              className="flex items-center gap-2 rounded-full gradient-send px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110">
              
              Get Started Free <ArrowRight className="h-4 w-4" />
            </motion.button>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur-sm px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-card/80">
              
              Explore Features <ChevronRight className="h-4 w-4" />
            </motion.a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/70">
            No credit card required · Free to start · AI-powered research, memory & voice
          </p>
        </motion.div>

        {/* Orb + floating chips */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mt-10 sm:mt-14 z-10">
          
          <HeroOrb />

          {/* Floating capability chips */}
          {floatingChips.map((chip) =>
          <motion.div
            key={chip.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: chip.delay, duration: 0.5 }}
            className="absolute hidden sm:flex items-center gap-1.5 glass-strong rounded-full px-3 py-1.5 text-[11px] font-medium text-foreground/80 shadow-sm"
            style={{ left: `calc(50% + ${chip.x}px)`, top: `calc(50% + ${chip.y}px)` }}>
            
              <chip.icon className="h-3 w-3 text-primary" />
              {chip.label}
            </motion.div>
          )}
        </motion.div>
      </motion.section>

      {/* ── Product Preview ── */}
      <Section className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              A premium AI workspace
            </h2>
            <p className="mt-3 max-w-lg mx-auto text-muted-foreground">
              More than a chatbot. A full research and productivity environment designed for deep work.
            </p>
          </div>

          {/* Mock product preview */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass-strong rounded-2xl p-1.5 shadow-lg overflow-hidden">
            
            <div className="rounded-xl bg-background/80 overflow-hidden">
              {/* Mock header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="rounded-md bg-muted/50 px-12 py-1 text-[10px] text-muted-foreground">chatbot.ai</div>
                </div>
              </div>
              {/* Mock chat */}
              <div className="px-6 sm:px-12 py-8 space-y-4 min-h-[260px]">
                <div className="flex justify-end">
                  <div className="rounded-2xl gradient-send text-primary-foreground px-4 py-2.5 text-sm max-w-[70%]">
                    What are the latest trends in AI agents for 2025?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="glass rounded-2xl px-4 py-3 text-sm text-foreground/90 max-w-[80%] space-y-2">
                    <p className="font-semibold text-foreground">Here are the key AI agent trends for 2025:</p>
                    <div className="space-y-1.5 text-muted-foreground text-xs">
                      <p className="flex gap-2"><span className="text-primary font-bold">1.</span> Multi-agent collaboration frameworks</p>
                      <p className="flex gap-2"><span className="text-primary font-bold">2.</span> Tool-use and function calling at scale</p>
                      <p className="flex gap-2"><span className="text-primary font-bold">3.</span> Long-term memory and personalization</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="text-[10px] bg-accent/10 text-accent rounded-full px-2 py-0.5">arxiv.org</span>
                      <span className="text-[10px] bg-accent/10 text-accent rounded-full px-2 py-0.5">techcrunch.com</span>
                      <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">3 sources</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
            {[
            { label: "Deep Research", value: "Multi-step" },
            { label: "Web Sources", value: "Real-time" },
            { label: "Memory", value: "Persistent" },
            { label: "File Support", value: "PDF, Docs" }].
            map((stat, i) =>
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center py-4">
              
                <div className="font-display text-base font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Features ── */}
      <Section id="features" className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Features</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
              Everything you need to think better
            </h2>
            <p className="mt-3 max-w-md mx-auto text-muted-foreground">
              A complete toolkit for research, reasoning, and knowledge management.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) =>
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="glass-strong group rounded-2xl p-6 transition-shadow duration-300 hover:shadow-lg cursor-default">
              
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
              f.accent === "primary" ?
              "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" :
              "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground"}`
              }>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </Section>

      {/* ── How It Works ── */}
      <Section id="how-it-works" className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">How It Works</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
              From question to insight
            </h2>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-3">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-10 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20" />

            {steps.map((s, i) =>
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative">
              
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl glass-strong shadow-sm">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">{s.num}</span>
                <h3 className="mt-1 font-display text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Why Different ── */}
      <Section className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Why Us</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
              Not your average chatbot
            </h2>
            <p className="mt-3 max-w-md mx-auto text-muted-foreground text-sm">
              See how a full AI workspace compares to a basic chat experience.
            </p>
          </div>

          <div className="glass-strong rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 px-6 py-3 border-b border-border/40 text-xs font-semibold text-muted-foreground">
              <span>Feature</span>
              <span className="text-center text-primary">Lumina</span>
              <span className="text-center">Basic AI Chat</span>
            </div>
            {differentiators.map((d, i) =>
            <motion.div
              key={d.feature}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-3 px-6 py-3 border-b border-border/20 last:border-0 text-sm">
              
                <span className="text-foreground/80 text-xs">{d.feature}</span>
                <span className="text-center">
                  {d.us ? <Check className="inline h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground/40">—</span>}
                </span>
                <span className="text-center">
                  {d.them ? <Check className="inline h-4 w-4 text-muted-foreground/40" /> : <span className="text-muted-foreground/40">—</span>}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Use Cases ── */}
      <Section id="use-cases" className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Use Cases</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
              Built for deep work
            </h2>
            <p className="mt-3 max-w-md mx-auto text-muted-foreground text-sm">
              Whether you're coding, researching, or building — this is your AI workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc, i) =>
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              className="glass-strong rounded-2xl p-5 transition-shadow duration-300 hover:shadow-lg">
              
                <uc.icon className="h-5 w-5 text-accent mb-3" />
                <h3 className="font-display text-sm font-semibold text-foreground">{uc.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{uc.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Trust / Social Proof ── */}
      <Section className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
            "Research, memory, voice & files in one workspace",
            "Powered by modern AI workflows",
            "Built for deep work"].
            map((badge) =>
            <span key={badge} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-primary" />
                {badge}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
            { quote: "Finally an AI that remembers what I told it last week. Game changer for research.", role: "Researcher" },
            { quote: "The project workspaces and file upload completely changed how I work with AI.", role: "Developer" },
            { quote: "Premium feel, fast, and actually useful. This is what AI chat should be.", role: "Founder" }].
            map((t, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-strong rounded-2xl p-5 text-left">
              
                <p className="text-xs leading-relaxed text-foreground/80 italic">"{t.quote}"</p>
                <p className="mt-3 text-[11px] font-semibold text-muted-foreground">— {t.role}</p>
              </motion.div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <Section className="py-20 sm:py-28 px-4">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl">
          {/* BG glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-[80%] rounded-full bg-primary/10 blur-[80px]" />
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-40 w-[60%] rounded-full bg-accent/10 blur-[80px]" />
          </div>

          <div className="relative glass-strong rounded-3xl p-10 sm:p-16 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              Start thinking with a
              <br />
              <span className="text-gradient-muted">smarter AI workspace</span>
            </h2>
            <p className="mt-4 max-w-md mx-auto text-sm text-muted-foreground">
              Research, remember, and build faster. Free to start, no credit card required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openAuth(false)}
                className="flex items-center gap-2 rounded-full gradient-send px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110">
                
                Create Free Account <ArrowRight className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openAuth(true)}
                className="flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur-sm px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-card/80">
                
                Sign In
              </motion.button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 text-center border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Lumina. Built for deep work.<br />
          Made With ❤️ by K M SHAHRIAR HOSSAIN.
        </p>
      </footer>

      {/* ── Auth Modal ── */}
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
          className="glass-strong w-full max-w-sm rounded-2xl p-8 shadow-lg"
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
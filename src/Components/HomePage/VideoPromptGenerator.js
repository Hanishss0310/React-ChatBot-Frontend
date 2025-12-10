import React, { useEffect, useRef, useState } from "react";

// REMASTERED VIDEO GENERATOR (autoplay overlay + robust filename matching)
const SparklesIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4 mr-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SUGGESTIONS = [
  "Integumentary System",
  "Endocrine System",
  "Digestive System",
  "Respiratory System",
  "Neural Networks",
  "Large Language Models",
  "Machine Learning",
  "Convolutional Neural Networks",
  "ML Kit Dual-Layer Architecture",
  "Allide Angles",
  "Change of base formula",
  "Laws of Logarithms"
];

export default function VideoPromptGenerator() {
  const [prompt, setPrompt] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultCaption, setResultCaption] = useState(null);
  const [error, setError] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const progressRef = useRef(null);
  const videoRef = useRef(null);

  function pickVideoCandidates(text) {
    if (!text) return [];
    const t = text.toLowerCase();
    const candidates = [];

    function addVariants(base) {
      candidates.push(`/Videos/${base}.mp4`);
      candidates.push(`/Videos/${base}..mp4`);
      candidates.push(`/Videos/${base.toLowerCase()}.mp4`);
      candidates.push(`/Videos/${base.replace(/\s+/g, "")}.mp4`);
    }

    if (t.includes("integumentary") || t.includes("skin")) addVariants("IntegumentarySystem");
    if (t.includes("endocrine") || t.includes("hormone")) addVariants("EndocrineSystem");
    if (t.includes("digestive") || t.includes("digestion") || t.includes("intestine") || t.includes("stomach")) addVariants("DigestiveSystem");
    if (t.includes("respiratory") || t.includes("lung") || t.includes("breath") || t.includes("respire")) addVariants("RespiratorySystem");

    if (t.includes("muscle") && t.includes("anatomy")) addVariants("MuscleAnatomy");
    if (t.includes("skeleton") && t.includes("anatomy")) addVariants("SkeletonAnatomy");
    if (t.includes("muscle")) addVariants("MuscleAnatomy");
    if (t.includes("skeleton")) addVariants("SkeletonAnatomy");
    if (t.includes("anatomy")) { addVariants("SkeletonAnatomy"); addVariants("MuscleAnatomy"); }

    if (t.includes("neural network") || t.includes("neural networks")) addVariants("NeuralNetworks");
    if (t.includes("large language model") || t.includes("large language models") || t.includes("llm")) addVariants("LargeLanguageModels");
    if (t.includes("machine learning") || t === "ml" || t.includes("machine-learning")) addVariants("MachineLearning");
    if (t.includes("convolutional neural") || t.includes("cnn") || t.includes("convolutional")) addVariants("ConvolutionalNeuralNetworks");
    if (t.includes("ml kit") || t.includes("dual-layer") || t.includes("dual layer")) addVariants("MLKitDualLayerArchitecture");

    if (t.includes("change of base") || t.includes("change of base formula") || t.includes("change of base")) addVariants("Changeofbaseformula");

    if (t.includes("logarithm") || t.includes("laws of logarithms") || t.includes("law of logarithm") || t.includes("logarithms")) {
      candidates.push("/Videos/LawsofLogaththms.mp4"); // match screenshot typo
      addVariants("LawsOfLogarithms");
    }

    if (t.includes("allide") || t.includes("allied") || t.includes("angle") || t.includes("angles") || t.includes("alternate angles")) {
      candidates.push("/Videos/AllideAngles.mp4");
      addVariants("AnglesOverview");
    }

    if (candidates.length === 0) {
      if (t.includes("biology") || t.includes("anatomy")) { addVariants("SkeletonAnatomy"); addVariants("MuscleAnatomy"); }
      if (t.includes("ml") || t.includes("ai")) { addVariants("MachineLearning"); addVariants("NeuralNetworks"); addVariants("LargeLanguageModels"); }
    }

    return [...new Set(candidates)];
  }

  async function checkVideoExists(path) {
    try {
      const res = await fetch(path, { method: "HEAD" });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async function findFirstExistingVideo(candidates) {
    for (const c of candidates) {
      if (!c) continue;
      const ok = await checkVideoExists(c);
      if (ok) return c;
    }
    return "";
  }

  async function startGeneration() {
    if (!prompt.trim()) return;

    setAutoplayBlocked(false);
    const candidates = pickVideoCandidates(prompt);
    if (!candidates || candidates.length === 0) {
      setResultCaption("⚠️ No matching model/video found in database.");
      setError("No match for prompt — try a suggestion or different phrasing.");
      return;
    }

    setError(null);
    setVideoPath("");
    setIsGenerating(true);
    setProgress(0);
    setResultCaption(null);

    const duration = 18000 + Math.random() * 7000;
    const t0 = Date.now();

    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      const pct = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      setProgress(Math.floor(eased * 100));

      if (pct >= 1) {
        clearInterval(progressRef.current);
        progressRef.current = null;

        findFirstExistingVideo(candidates).then((clip) => {
          if (!clip) {
            setIsGenerating(false);
            setError(`No video file found for prompt. Checked candidates: ${candidates.slice(0,6).join(", ")}...`);
            setResultCaption(null);
            setVideoPath("");
            setProgress(0);
            console.error(`No candidates found for prompt "${prompt}".`);
            return;
          }
          finishGeneration(clip);
        }).catch((err) => {
          setIsGenerating(false);
          setError("Error while checking video files.");
          setProgress(0);
          console.error(err);
        });
      }
    }, 30);
  }

  function finishGeneration(clip) {
    const name = clip.split("/").pop().replace(/\.[^/.]+$/, "");
    const caption = `Generated: ${name} · ${prompt.trim()}`;

    setIsGenerating(false);
    setProgress(100);
    setResultCaption(caption);
    setVideoPath(clip);

    setTimeout(() => {
      try {
        const v = videoRef.current;
        if (v) {
          v.currentTime = 0;
          v.muted = true;
          v.play().then(() => {
            setAutoplayBlocked(false);
          }).catch((err) => {
            console.warn("Autoplay blocked; user gesture needed.", err);
            setAutoplayBlocked(true);
          });
        }
      } catch (_) {}
    }, 250);

    try {
      const ev = new CustomEvent("vp:insert", {
        detail: { name: name + ".mp4", videoPath: clip }
      });
      window.dispatchEvent(ev);
    } catch (_) {}
  }

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  function applySuggestion(text) {
    setPrompt(text);
  }

  return (
    <div className="w-full max-w-2xl mx-auto font-sans antialiased text-white">
      <div className="relative backdrop-blur-2xl bg-black/20 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden p-1">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-widest uppercase text-white/70 drop-shadow-sm">AI Video Engine</h2>
            {isGenerating && <span className="flex items-center text-xs font-bold text-purple-300 animate-pulse drop-shadow-sm">Processing Request...</span>}
          </div>

          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full p-4 pr-32 rounded-2xl resize-none outline-none text-[15px] leading-relaxed bg-black/30 border border-white/10"
              placeholder="Describe the animation you need... (try a suggestion below)"
            />
            <div className="absolute bottom-3 right-3">
              <button
                onClick={startGeneration}
                disabled={isGenerating || !prompt}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${isGenerating ? "bg-slate-700/80 cursor-not-allowed opacity-70" : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-500/30 border border-white/20"}`}
              >
                {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <SparklesIcon />}
                {isGenerating ? "Rendering" : "Generate"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => applySuggestion(s)}
                className="text-xs px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 border border-white/8"
              >
                {s}
              </button>
            ))}
          </div>

          {error && <div className="mt-3 text-sm text-amber-300 flex items-start gap-2"><AlertIcon />{error}</div>}
        </div>

        <div className="relative mx-2 mb-2 rounded-2xl overflow-hidden bg-black/50 shadow-inner ring-1 ring-white/10 aspect-video group">
          {!videoPath && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
                <div className="w-2 h-2 bg-white/40 rounded-full" />
              </div>
              <p className="text-sm font-medium drop-shadow">Ready to visualize</p>
            </div>
          )}

          {videoPath && (
            <>
              <video
                ref={videoRef}
                src={videoPath}
                controls
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
                style={{
                  filter: `blur(${(1 - progress / 100) * 25}px) grayscale(${Math.max(0, 1 - (progress / 100) * 1.2)}) contrast(${0.8 + (progress / 100) * 0.4})`,
                  transform: `scale(${1.08 + (1 - progress / 100) * 0.07})`,
                  opacity: 0.3 + (progress / 100) * 0.7,
                  transition: isGenerating ? "none" : "all 1.5s cubic-bezier(0.22,1,0.36,1)"
                }}
              />
              {autoplayBlocked && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto">
                  <button
                    onClick={() => {
                      const v = videoRef.current;
                      if (!v) return;
                      v.muted = true;
                      v.play().then(() => {
                        setAutoplayBlocked(false);
                      }).catch((err) => {
                        console.warn("Play still blocked:", err);
                      });
                    }}
                    className="px-6 py-3 rounded-2xl bg-white/90 text-black font-bold shadow-lg"
                  >
                    ▶ Click to play
                  </button>
                </div>
              )}
            </>
          )}

          {isGenerating && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md bg-black/30">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-xs font-bold text-white uppercase tracking-wider drop-shadow-md">
                  <span>Synthesizing Scene</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-black/40 ring-1 ring-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400" style={{ width: `${progress}%`, transition: "width 0.03s linear" }} />
                </div>
              </div>
            </div>
          )}

          {!isGenerating && resultCaption && (
            <div className="absolute top-4 left-4 z-10">
              <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-xl border border-white/20 text-xs font-bold text-white shadow-xl animate-[fadeIn_0.5s_ease-out_forwards]">
                {resultCaption}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-start p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200/90 text-xs leading-relaxed shadow-lg">
        <div className="mt-0.5 shrink-0"><AlertIcon /></div>
        <div>
          <strong className="text-amber-100 block mb-1 font-bold">Content Usage Warning</strong>
          This tool generates simulation videos for educational and illustrative purposes only.
        </div>
      </div>

      <style>{`\n        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }\n        .animate-shimmer { background-size: 200% auto; animation: shimmer 3s linear infinite; }\n        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }\n      `}</style>
    </div>
  );
}

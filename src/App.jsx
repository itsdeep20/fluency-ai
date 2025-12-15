import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, Menu, X, RefreshCw, BookOpen, GraduationCap, Globe, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, ArrowRight, Clock, Info, HelpCircle, Loader2 } from 'lucide-react';

// --- Configuration ---
// 1. FOR DEPLOYMENT (Vercel/Local): Uncomment the line below (remove //)
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

// 2. FOR PREVIEW (Canvas): Keep this line empty.
const apiKey = ""; 

// --- System Prompts for Scenarios ---
const SCENARIOS = [
  // --- Quick Roleplay Category ---
  {
    id: 'coffee_shop',
    category: 'roleplay',
    title: 'The Coffee Shop',
    role: 'Barista',
    icon: '☕',
    difficulty: 'Beginner',
    description: 'Order a drink and a snack.',
    systemPrompt: "You are a friendly barista at a busy coffee shop in London. Keep your responses short (1-2 sentences). If the user makes a grammar mistake, YOU MUST output a special block: 'Correction: [Correct Sentence] | Reason: [Brief explanation of error] | Example: [A similar correct sentence]'. Then, on a new line, reply naturally to the roleplay."
  },
  {
    id: 'job_interview',
    category: 'roleplay',
    title: 'Job Interview',
    role: 'Hiring Manager',
    icon: '💼',
    difficulty: 'Advanced',
    description: 'Answer questions about your experience.',
    systemPrompt: "You are a professional hiring manager. Be polite but formal. If the user makes a grammar mistake, YOU MUST output a special block: 'Correction: [Correct Sentence] | Reason: [Brief explanation] | Example: [A similar correct sentence]'. Then, on a new line, ask the next interview question."
  },
  {
    id: 'new_friend',
    category: 'roleplay',
    title: 'Meeting a Friend',
    role: 'New Friend',
    icon: '👋',
    difficulty: 'Intermediate',
    description: 'Casual conversation at a park.',
    systemPrompt: "You are a new friend meeting the user at a park. Be casual. If the user makes a grammar mistake, YOU MUST output a special block: 'Correction: [Correct Sentence] | Reason: [Brief explanation] | Example: [A similar correct sentence]'. Then, on a new line, reply naturally."
  },
  
  // --- Immersive Simulation Category ---
  {
    id: 'airport_sim',
    category: 'simulation',
    title: 'Full Airport Journey',
    role: 'Airport Staff (Multiple)',
    icon: <Globe size={20} />,
    difficulty: 'Intermediate',
    description: 'Check-in -> Security -> Boarding -> Flight.',
    systemPrompt: "You are the narrator and various staff members of an airport simulation. Guide the user through these 4 distinct stages. Start at Stage 1. \n\nStage 1: Check-in Desk. Act as the agent asking for passport and bags.\nStage 2: Security Check. Act as the officer asking to empty pockets/remove shoes.\nStage 3: Gate Boarding. Act as the gate agent calling group numbers.\nStage 4: In-Flight. Act as the flight attendant offering meals.\n\nOnly move to the next stage when the user successfully completes the interaction. Signal the transition by writing '*Scene: [New Location]*' in bold. If the user makes a grammar mistake, YOU MUST output a special block: 'Correction: [Correct Sentence] | Reason: [Brief explanation] | Example: [Example]'. Then reply as the character."
  },
  {
    id: 'train_sim',
    category: 'simulation',
    title: 'Train Adventure',
    role: 'Station Master',
    icon: <div className="font-bold text-xs">TR</div>, 
    difficulty: 'Beginner',
    description: 'Ticket Window -> Platform -> Onboard.',
    systemPrompt: "You are guiding the user through a train journey. \n\nStage 1: Ticket Window. Act as the seller. Ask destination and class (First/Second).\nStage 2: Finding the Platform. Act as a helper/conductor directing them.\nStage 3: Onboard. Act as the ticket inspector checking tickets.\n\nMove through stages naturally. Signal transitions with '*Scene: [New Location]*'. If the user makes a grammar mistake, YOU MUST output a special block: 'Correction: [Correct Sentence] | Reason: [Brief explanation] | Example: [Example]'."
  }
];

const App = () => {
  // --- State ---
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "Hi there! Welcome to the cafe. What can I get started for you today?", timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // Insights State
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [correctionsLog, setCorrectionsLog] = useState([]);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Explanation Modal State
  const [explanationModal, setExplanationModal] = useState({ isOpen: false, isLoading: false, content: null, correctionContext: null });

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // --- Speech Recognition Setup ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Handlers ---

  const handleScenarioChange = (scenario) => {
    setActiveScenario(scenario);
    setMessages([{ 
      id: Date.now(), 
      sender: 'ai', 
      text: getIntroMessage(scenario),
      timestamp: new Date()
    }]);
    setCorrectionsLog([]);
    setAnalysisReport(null);
    setSidebarOpen(false);
  };

  const getIntroMessage = (scenario) => {
    if (scenario.id === 'airport_sim') return "Welcome to Heathrow Airport! *Scene: Check-in Desk*. \n\nGood morning. Where are you flying to today, and may I see your passport?";
    if (scenario.id === 'train_sim') return "Welcome to Grand Central Station. *Scene: Ticket Window*. \n\nHello! How can I help you? Where are you planning to travel today?";
    
    // Default intros for roleplays
    switch(scenario.id) {
      case 'coffee_shop': return "Hi there! Welcome to the cafe. What can I get started for you today?";
      case 'job_interview': return "Good morning. Thank you for coming in. Tell me a little bit about yourself.";
      case 'new_friend': return "Hey! Nice to meet you. I love this park, do you come here often?";
      default: return "Hello!";
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const currentTime = new Date();
    const userMsg = { id: Date.now(), sender: 'user', text: inputText, timestamp: currentTime };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const historyContext = messages.slice(-6).map(m => `${m.sender === 'user' ? 'User' : activeScenario.role}: ${m.text}`).join('\n');
      
      const prompt = `
        ${activeScenario.systemPrompt}
        
        Current Conversation History:
        ${historyContext}
        User: ${userMsg.text}
        ${activeScenario.role}:
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I lost my train of thought.";

      let displayMessages = [];
      
      // Check for structured correction block
      if (aiText.includes("Correction:")) {
        const parts = aiText.split("Correction:");
        let roleplayPart = parts[0].trim(); 
        const rest = parts[1]; 

        let correctionText = "";
        let reasonText = "";
        let exampleText = "";
        let finalRoleplay = "";
        
        const detailsAndRoleplay = rest.split("\n"); 
        const correctionBlock = detailsAndRoleplay[0]; 
        finalRoleplay = detailsAndRoleplay.slice(1).join("\n").trim(); 

        const blockParts = correctionBlock.split("|");
        correctionText = blockParts[0]?.trim();
        
        const reasonPart = blockParts.find(p => p.trim().startsWith("Reason:"));
        reasonText = reasonPart ? reasonPart.replace("Reason:", "").trim() : "Grammar adjustment.";

        const examplePart = blockParts.find(p => p.trim().startsWith("Example:"));
        exampleText = examplePart ? examplePart.replace("Example:", "").trim() : "";

        const actualResponseText = finalRoleplay || roleplayPart || "...";

        // 1. Add AI Response
        displayMessages.push({ id: Date.now() + 1, sender: 'ai', text: actualResponseText, timestamp: new Date() });

        // 2. Add Correction System Message
        const correctionObj = {
            id: Date.now() + 2,
            sender: 'system',
            text: correctionText, // The correction
            original: userMsg.text, // The user's original mistake
            reason: reasonText,
            example: exampleText,
            timestamp: new Date()
        };
        displayMessages.push(correctionObj);

        // 3. Log to Sidebar
        setCorrectionsLog(prev => [...prev, {
            id: Date.now(),
            original: userMsg.text,
            correction: correctionText,
            reason: reasonText,
            example: exampleText,
            timestamp: currentTime 
        }]);

      } else {
        displayMessages.push({ id: Date.now() + 1, sender: 'ai', text: aiText, timestamp: new Date() });
      }

      setMessages(prev => [...prev, ...displayMessages]);

    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'system', text: "Error connecting to AI tutor.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainMore = async (msg) => {
    // Open modal immediately with loading state
    setExplanationModal({ isOpen: true, isLoading: true, content: null, correctionContext: msg });

    try {
        const prompt = `
            You are an expert English tutor. The user made a mistake in a roleplay conversation.
            
            Original Sentence (User Mistake): "${msg.original || 'N/A'}"
            Correction Provided: "${msg.text}"
            Brief Reason Given: "${msg.reason}"
            
            Please provide a detailed, easy-to-understand explanation of the grammar rule behind this mistake. 
            Explain WHY the original sentence was incorrect and HOW to use the rule correctly.
            Keep the tone educational, encouraging, and clear.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const explanationText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate explanation.";
        
        setExplanationModal({ isOpen: true, isLoading: false, content: explanationText, correctionContext: msg });

    } catch (error) {
        console.error("Explanation Error:", error);
        setExplanationModal({ isOpen: true, isLoading: false, content: "Sorry, I couldn't connect to the server to explain this right now.", correctionContext: msg });
    }
  };

  const generateAnalysis = async () => {
    if (messages.length < 4) {
        alert("Please chat a bit more before analyzing!");
        return;
    }
    setIsAnalyzing(true);
    
    try {
        const historyContext = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
        const prompt = `
            Analyze the following English conversation.
            Provide:
            1. Session Summary (2 sentences max).
            2. Repetitive mistakes.
            3. Major strength.
            4. Area for improvement.
            
            Format as JSON:
            {
                "summary": "...",
                "mistakes": ["..."],
                "strength": "...",
                "improvement": "..."
            }

            Conversation:
            ${historyContext}
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
        setAnalysisReport(result);

    } catch (error) {
        console.error("Analysis Error", error);
        alert("Could not generate report at this time.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const formatTime = (dateObj) => {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- Render ---

  return (
    <div className="flex h-screen bg-slate-200 font-sans text-slate-800 overflow-hidden relative">
      
      {/* Sidebar - Navigation */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xl">
            <GraduationCap size={28} />
            <span>Fluency AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto h-full pb-20 custom-scrollbar">
          {/* New Sidebar Button for Report */}
          <button 
             onClick={() => { setIsInsightsOpen(true); setSidebarOpen(false); }}
             className="w-full bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-xl flex items-center gap-3 mb-6 hover:bg-amber-100 transition-colors shadow-sm"
          >
             <div className="bg-amber-200 p-1.5 rounded-full">
                <TrendingUp size={18} className="text-amber-700" />
             </div>
             <div className="text-left">
                <div className="font-bold text-sm">View Full Report</div>
                <div className="text-xs text-amber-600/80">Analysis & Insights</div>
             </div>
          </button>

          {/* Quick Roleplay Section */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Quick Roleplay</h3>
            <div className="space-y-2">
              {SCENARIOS.filter(s => s.category === 'roleplay').map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioChange(scenario)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start space-x-3 shadow-sm ${activeScenario.id === scenario.id ? 'bg-emerald-600 text-white ring-2 ring-emerald-200 shadow-emerald-200' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'}`}
                >
                  <span className={`text-xl rounded-full p-1.5 ${activeScenario.id === scenario.id ? 'bg-emerald-500/30 text-white' : 'bg-slate-100'}`}>{scenario.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <div className={`font-semibold ${activeScenario.id === scenario.id ? 'text-white' : 'text-slate-700'}`}>{scenario.title}</div>
                    </div>
                    <div className={`text-xs mt-1 line-clamp-1 ${activeScenario.id === scenario.id ? 'text-emerald-100' : 'text-slate-500'}`}>{scenario.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Immersive Simulation Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
               <Globe size={12} /> Immersive Sims
            </h3>
            <div className="space-y-2">
              {SCENARIOS.filter(s => s.category === 'simulation').map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioChange(scenario)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start space-x-3 shadow-sm ${activeScenario.id === scenario.id ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 shadow-indigo-200' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'}`}
                >
                  <span className={`text-xl rounded-full p-1.5 flex items-center justify-center w-8 h-8 ${activeScenario.id === scenario.id ? 'bg-indigo-500/30 text-white' : 'bg-indigo-50 text-indigo-600'}`}>{scenario.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <div className={`font-semibold ${activeScenario.id === scenario.id ? 'text-white' : 'text-slate-700'}`}>{scenario.title}</div>
                    </div>
                    <div className={`text-xs mt-1 line-clamp-1 ${activeScenario.id === scenario.id ? 'text-indigo-100' : 'text-slate-500'}`}>{scenario.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mini Stats */}
          <div className="mt-8 bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg">
             <div className="flex items-center space-x-2 font-semibold mb-2 opacity-90">
                <BookOpen size={16} />
                <span className="text-sm">Session Errors</span>
             </div>
             <p className="text-4xl font-bold">{correctionsLog.length}</p>
             <p className="text-xs opacity-75 mt-1">Mistakes identified & logged</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 bg-[#e5ddd5]">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4a5568 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* Unified Responsive Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-20 shadow-sm">
           <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-600 p-1 hover:bg-slate-100 rounded-full">
               <Menu size={24} />
             </button>
             
             <div className="flex items-center gap-3">
                 <div className={`h-10 w-10 rounded-full hidden md:flex items-center justify-center text-xl shadow-inner border ${activeScenario.category === 'simulation' ? 'bg-indigo-100 border-indigo-200 text-indigo-600' : 'bg-emerald-100 border-emerald-200'}`}>
                   {activeScenario.icon}
                 </div>
                 <div>
                   <h2 className="font-bold text-slate-800 text-base md:text-lg leading-tight">{activeScenario.title}</h2>
                   <p className="text-xs text-emerald-600 font-medium flex items-center">
                     <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                     <span className="hidden md:inline">Typing...</span>
                     <span className="md:hidden">Online</span>
                   </p>
                 </div>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full font-semibold text-xs md:text-sm transition-all shadow-sm ${isInsightsOpen ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
             >
                <TrendingUp size={16} />
                <span className="inline">Insights & Report</span>
                {correctionsLog.length > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isInsightsOpen ? 'bg-slate-600' : 'bg-slate-200 text-slate-800'}`}>{correctionsLog.length}</span>}
             </button>

             <button 
                onClick={() => handleScenarioChange(activeScenario)}
                className="text-slate-400 hover:text-emerald-600 transition-colors p-2 rounded-full hover:bg-slate-100" 
                title="Reset Chat"
            >
                <RefreshCw size={20} />
            </button>
           </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
              
              {/* Message Bubble */}
              <div 
                className={`
                  max-w-[90%] md:max-w-[65%] p-3 shadow-sm relative text-sm md:text-base
                  ${msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-none' 
                    : msg.sender === 'system'
                      ? 'bg-white border-l-4 border-amber-500 rounded-lg w-full max-w-lg mx-auto shadow-md'
                      : 'bg-white text-slate-800 rounded-2xl rounded-tl-none'
                  }
                `}
              >
                {/* System Message Content (Correction) */}
                {msg.sender === 'system' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1">
                       <Sparkles size={16} className="text-amber-500" />
                       <span className="font-bold text-amber-600 text-xs uppercase tracking-wider">Grammar Fix</span>
                       <span className="ml-auto text-slate-400 text-[10px] font-mono">{formatTime(msg.timestamp)}</span>
                    </div>
                    
                    <div>
                        <span className="font-semibold text-slate-700 block text-xs mb-1">Correction:</span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">{msg.text}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                        <div className="bg-slate-50 p-2 rounded">
                            <span className="font-semibold text-slate-500 block mb-0.5">Why?</span>
                            <span className="text-slate-700">{msg.reason}</span>
                        </div>
                        {msg.example && (
                             <div className="bg-slate-50 p-2 rounded">
                                <span className="font-semibold text-slate-500 block mb-0.5">Example:</span>
                                <span className="text-slate-700 italic">"{msg.example}"</span>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => handleExplainMore(msg)}
                        className="mt-2 w-full text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                        <HelpCircle size={14} /> Explain More
                    </button>
                  </div>
                ) : (
                  // Normal Message Content
                  <div className="relative">
                     <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                     <div className={`text-[10px] mt-1 text-right select-none ${msg.sender === 'user' ? 'text-emerald-100/80' : 'text-slate-400'}`}>
                       {formatTime(msg.timestamp)}
                       {msg.sender === 'user' && <span className="ml-1 inline-block">✓</span>}
                     </div>
                  </div>
                )}
              </div>

            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[#f0f2f5] px-4 py-3 shadow-inner z-30">
          <div className="max-w-4xl mx-auto flex items-end space-x-2">
            
            <button 
              onClick={toggleListening}
              className={`p-3 rounded-full transition-all duration-300 flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-200 shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 shadow-sm border border-slate-200'}`}
              title="Speak"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <div className="flex-1 bg-white rounded-2xl flex items-center p-1 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all shadow-sm">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                placeholder={isListening ? "Listening..." : "Type a message..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 resize-none max-h-32 py-2.5 px-3 placeholder:text-slate-400 text-sm md:text-base"
                rows="1"
                style={{minHeight: '44px'}} 
              />
            </div>

            <button 
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`p-3 rounded-full transition-all duration-300 shadow-md flex-shrink-0 ${!inputText.trim() || isLoading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95'}`}
            >
              <Send size={20} className={isLoading ? 'opacity-0' : 'opacity-100'} />
              {isLoading && <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
            </button>
          </div>
        </div>

      </div>

      {/* Insights Side Panel (Right) */}
      <div className={`fixed inset-y-0 right-0 z-40 w-full md:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isInsightsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
         
         {/* Header */}
         <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2 font-bold text-lg">
               <TrendingUp className="text-emerald-400" />
               Performance Report
            </div>
            <button onClick={() => setIsInsightsOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-full">
               <X size={20} />
            </button>
         </div>

         {/* Content Scroll */}
         <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 custom-scrollbar">
            
            {/* Analyze Button Section */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-1 text-slate-800">Session Analysis</h3>
                    <p className="text-slate-500 text-sm mb-4">Generate a summary of your conversation, strengths, and weaknesses.</p>
                    <button 
                        onClick={generateAnalysis}
                        disabled={isAnalyzing}
                        className="bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-lg shadow hover:bg-emerald-700 transition-colors w-full flex justify-center items-center gap-2 disabled:opacity-70"
                    >
                        {isAnalyzing ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating...</>
                        ) : (
                            <><Lightbulb size={18} /> Analyze Now</>
                        )}
                    </button>
                </div>
            </div>

            {/* Analysis Result */}
            {analysisReport && (
                <div className="space-y-4 animate-fade-in-up">
                    
                    {/* Summary Box */}
                    <div className="bg-slate-800 text-slate-100 rounded-xl p-4 shadow-md border-l-4 border-emerald-500">
                        <h4 className="flex items-center gap-2 font-bold mb-2 text-xs uppercase tracking-wide text-emerald-400">
                            <Info size={14} /> Session Summary
                        </h4>
                        <p className="text-sm leading-relaxed opacity-90">{analysisReport.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <h4 className="flex items-center gap-2 font-bold text-emerald-700 mb-2 text-xs uppercase tracking-wide">
                                <CheckCircle size={14} /> Top Strength
                            </h4>
                            <p className="text-sm text-slate-700 font-medium">{analysisReport.strength}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <h4 className="flex items-center gap-2 font-bold text-blue-700 mb-2 text-xs uppercase tracking-wide">
                                <ArrowRight size={14} /> To Improve
                            </h4>
                            <p className="text-sm text-slate-700 font-medium">{analysisReport.improvement}</p>
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold text-red-600 mb-2 text-xs uppercase tracking-wide">
                            <AlertTriangle size={14} /> Recurring Patterns
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                            {analysisReport.mistakes.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            {/* Correction Log */}
            <div>
               <div className="flex justify-between items-end mb-3">
                   <h3 className="font-bold text-slate-700 flex items-center gap-2">
                       Detailed Log
                   </h3>
                   <span className="text-xs text-slate-400 font-mono">{correctionsLog.length} Issues</span>
               </div>
               
               {correctionsLog.length === 0 ? (
                   <div className="text-center py-12 bg-white border border-dashed border-slate-300 rounded-xl">
                       <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500">
                           <CheckCircle size={24} />
                       </div>
                       <p className="font-medium text-slate-600">Perfect Streak!</p>
                       <p className="text-xs text-slate-400 mt-1">No grammar mistakes detected yet.</p>
                   </div>
               ) : (
                   <div className="space-y-4">
                       {correctionsLog.slice().reverse().map((log) => (
                           <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
                               <div className="absolute top-3 right-3 flex items-center text-[10px] text-slate-400 font-mono">
                                   <Clock size={10} className="mr-1" />
                                   {formatTime(log.timestamp)}
                               </div>
                               
                               <div className="mb-3 pr-10">
                                   <div className="flex items-center gap-2 mb-1">
                                       <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mistake</span>
                                   </div>
                                   <p className="text-slate-600 line-through text-sm pl-3.5 border-l-2 border-red-100">{log.original}</p>
                               </div>

                               <div className="mb-3">
                                   <div className="flex items-center gap-2 mb-1">
                                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                       <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Correction</span>
                                   </div>
                                   <p className="text-emerald-800 font-medium text-sm pl-3.5 border-l-2 border-emerald-100 bg-emerald-50/50 py-1 rounded-r">{log.correction}</p>
                               </div>

                               <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                   <p className="text-xs text-slate-500">
                                       <span className="font-semibold text-slate-700">Reason:</span> {log.reason}
                                   </p>
                                   {log.example && (
                                       <p className="text-xs text-slate-500">
                                           <span className="font-semibold text-slate-700">Try instead:</span> <span className="italic">"{log.example}"</span>
                                       </p>
                                   )}
                                   <button 
                                      onClick={() => handleExplainMore(log)}
                                      className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 w-fit"
                                   >
                                      <HelpCircle size={12} /> Detailed Explanation
                                   </button>
                               </div>
                           </div>
                       ))}
                   </div>
               )}
            </div>

         </div>
      </div>

      {/* Explanation Modal */}
      {explanationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                 <Sparkles size={20} className="text-amber-600" />
                 Grammar Deep Dive
              </div>
              <button 
                onClick={() => setExplanationModal(prev => ({ ...prev, isOpen: false }))}
                className="hover:bg-amber-100 p-1 rounded-full text-amber-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {explanationModal.isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Loader2 size={32} className="animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm font-medium">Consulting Grammar Professor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Context Block */}
                  {explanationModal.correctionContext && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-sm mb-4">
                       <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">Context</span>
                       </div>
                       <div className="grid grid-cols-1 gap-2">
                           <div>
                              <span className="text-red-500 text-xs font-bold block">You said:</span>
                              <span className="text-slate-600 line-through decoration-red-300">{explanationModal.correctionContext.original || explanationModal.correctionContext.text}</span>
                           </div>
                           <div>
                              <span className="text-emerald-600 text-xs font-bold block">Correction:</span>
                              <span className="text-slate-800 font-medium">{explanationModal.correctionContext.correction || explanationModal.correctionContext.text}</span>
                           </div>
                       </div>
                    </div>
                  )}

                  <div className="prose prose-sm prose-slate max-w-none">
                     <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                        {explanationModal.content}
                     </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
               <button 
                 onClick={() => setExplanationModal(prev => ({ ...prev, isOpen: false }))}
                 className="bg-slate-800 text-white px-6 py-2 rounded-full font-semibold text-sm hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
               >
                 Got it, thanks!
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
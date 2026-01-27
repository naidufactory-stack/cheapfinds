import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, Camera, ArrowRight, Globe, AlignLeft, ScanEye, ChevronDown, Check, X, Upload, MapPin, Zap, Award, AlertCircle, RefreshCw, Trash2, Info, Settings, LogOut, Layers, Box, MessageSquare, MessageSquarePlus, Tag, User as UserIcon, Lock } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { ResultsView } from './components/ResultsView';
import { ImageCropper } from './components/ImageCropper';
import { SearchHistory } from './components/SearchHistory';
import { ChatInterface } from './components/ChatInterface';
import { FeedbackModal } from './components/FeedbackModal';
import { AuthModal } from './components/AuthModal';
import { searchProduct, processChatMessage } from './services/geminiService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { AppState, SearchResult, SearchHistoryItem, SearchMode, ChatMessage } from './types';

const COUNTRIES = [
  { name: 'Global', iso: 'global' },
  { name: 'Argentina', iso: 'ar' },
  { name: 'Australia', iso: 'au' },
  { name: 'Austria', iso: 'at' },
  { name: 'Belgium', iso: 'be' },
  { name: 'Brazil', iso: 'br' },
  { name: 'Canada', iso: 'ca' },
  { name: 'China', iso: 'cn' },
  { name: 'Denmark', iso: 'dk' },
  { name: 'Egypt', iso: 'eg' },
  { name: 'Finland', iso: 'fi' },
  { name: 'France', iso: 'fr' },
  { name: 'Germany', iso: 'de' },
  { name: 'Greece', iso: 'gr' },
  { name: 'Hong Kong', iso: 'hk' },
  { name: 'India', iso: 'in' },
  { name: 'Indonesia', iso: 'id' },
  { name: 'Ireland', iso: 'ie' },
  { name: 'Israel', iso: 'il' },
  { name: 'Italy', iso: 'it' },
  { name: 'Japan', iso: 'jp' },
  { name: 'Malaysia', iso: 'my' },
  { name: 'Mexico', iso: 'mx' },
  { name: 'Netherlands', iso: 'nl' },
  { name: 'New Zealand', iso: 'nz' },
  { name: 'Nigeria', iso: 'ng' },
  { name: 'Norway', iso: 'no' },
  { name: 'Philippines', iso: 'ph' },
  { name: 'Poland', iso: 'pl' },
  { name: 'Portugal', iso: 'pt' },
  { name: 'Russia', iso: 'ru' },
  { name: 'Saudi Arabia', iso: 'sa' },
  { name: 'Singapore', iso: 'sg' },
  { name: 'South Africa', iso: 'za' },
  { name: 'South Korea', iso: 'kr' },
  { name: 'Spain', iso: 'es' },
  { name: 'Sweden', iso: 'se' },
  { name: 'Switzerland', iso: 'ch' },
  { name: 'Taiwan', iso: 'tw' },
  { name: 'Thailand', iso: 'th' },
  { name: 'Turkey', iso: 'tr' },
  { name: 'UAE', iso: 'ae' },
  { name: 'United Kingdom', iso: 'gb' },
  { name: 'United States', iso: 'us' },
  { name: 'Vietnam', iso: 'vn' },
];

const LOADING_PHRASES = [
  "Finding the lowest price just for you…",
  "Scanning thousands of products…",
  "Hold on… your wallet is about to thank you.",
  "Finding deals your ex never could.",
  "Searching every corner of the internet…",
  "Deals coming in hot…",
  "Checking every retailer twice…",
  "Your bargain is loading — don’t blink.",
  "Almost there… we found something juicy."
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.SINGLE);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [description, setDescription] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Cropper State (Single mode only)
  const [tempImage, setTempImage] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // Country Selection State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default to Global
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Profile Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [result, setResult] = useState<SearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loading Animation State
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  // Listen for Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      // If user logs out while in a restricted mode, switch back to SINGLE
      if (!currentUser && (searchMode === SearchMode.MULTI || searchMode === SearchMode.CHAT)) {
        setSearchMode(SearchMode.SINGLE);
      }
    });
    return () => unsubscribe();
  }, [searchMode]);

  // Handle Shared Link on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        const decodedString = decodeURIComponent(atob(shareData));
        const decodedResult = JSON.parse(decodedString);
        
        if (decodedResult && decodedResult.text) {
          setResult(decodedResult);
          setAppState(AppState.SUCCESS);
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (e) {
        console.error("Failed to parse shared result:", e);
      }
    }
  }, []);

  // Auto-detect user's country based on IP
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://get.geojs.io/v1/ip/country.json');
        
        if (!response.ok) {
           throw new Error('GeoJS fetch failed');
        }
        
        const data = await response.json();
        const countryCode = data.country?.toLowerCase();
        
        if (countryCode) {
          const matched = COUNTRIES.find(c => c.iso === countryCode);
          if (matched) {
            setSelectedCountry(matched);
          }
        }
      } catch (e) {
        console.warn('Country detection failed, falling back to default:', e);
      }
    };

    detectCountry();
  }, []);

  // Cycle loading phrases
  useEffect(() => {
    let interval: any;
    if (appState === AppState.ANALYZING) {
      setLoadingPhraseIndex(0); // Reset on start
      interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 2500); 
    }
    return () => clearInterval(interval);
  }, [appState]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsProfileOpen(false);
      handleClearAll();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // Handle Image Selection
  const handleImagesSelected = (files: File[]) => {
    if (searchMode === SearchMode.SINGLE) {
      if (files.length > 0) {
        setTempImage(files[0]);
        setIsCropperOpen(true);
      }
    } else {
      setSelectedImages(prev => [...prev, ...files]);
      if (appState === AppState.SUCCESS || appState === AppState.ERROR) {
        setAppState(AppState.IDLE);
        setResult(null);
      }
    }
  };

  const handleCropConfirm = (croppedFile: File) => {
    setSelectedImages([croppedFile]);
    setTempImage(null);
    setIsCropperOpen(false);
    
    if (appState === AppState.SUCCESS || appState === AppState.ERROR) {
      setAppState(AppState.IDLE);
      setResult(null);
    }
    setErrorMsg(null);
  };

  const handleCropCancel = () => {
    setTempImage(null);
    setIsCropperOpen(false);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
    
    if (newImages.length === 0 && !description) {
      setAppState(AppState.IDLE);
      setResult(null);
    }
  };

  const handleClearAll = () => {
    setSelectedImages([]);
    setDescription('');
    setChatMessages([]);
    setAppState(AppState.IDLE);
    setResult(null);
    setErrorMsg(null);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    if (appState === AppState.SUCCESS || appState === AppState.ERROR) {
      setAppState(AppState.IDLE);
      setResult(null);
    }
  };

  const toggleSearchMode = (mode: SearchMode) => {
    // Gate restricted modes
    if ((mode === SearchMode.MULTI || mode === SearchMode.CHAT) && !user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (searchMode !== mode) {
      setSearchMode(mode);
      // Trim images if moving Multi -> Single
      if (mode === SearchMode.SINGLE && selectedImages.length > 1) {
        setSelectedImages([selectedImages[0]]);
      }
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
      
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let msg = "Could not access camera.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = "Camera permission denied. Please allow access in your browser settings.";
      } else if (err.name === 'NotFoundError') {
          msg = "No camera device found.";
      }
      
      setCameraError(msg);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
              stopCamera();
              handleImagesSelected([file]);
            } else {
              setCameraError("Failed to capture image. Please try again.");
            }
          }, 'image/jpeg', 0.9);
        } catch (e) {
          console.error(e);
          setCameraError("Error processing image capture.");
        }
      }
    }
  };

  const handleSearch = async () => {
    if (selectedImages.length === 0 && !description.trim()) return;

    setAppState(AppState.ANALYZING);
    setErrorMsg(null);

    try {
      const data = await searchProduct(selectedImages, description, selectedCountry.name, searchMode);
      setResult(data);
      setAppState(AppState.SUCCESS);
      
      const newItem: SearchHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        images: [...selectedImages],
        description: description,
        result: data,
        mode: searchMode
      };
      setSearchHistory(prev => [newItem, ...prev]);

    } catch (err: any) {
      console.error(err);
      setAppState(AppState.ERROR);
      setErrorMsg(err.message || "Something went wrong while searching.");
    }
  };

  const handleChatMessage = async (text: string) => {
    if (!text.trim()) return;

    // Gate Chat
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setIsChatLoading(true);

    try {
      const responseText = await processChatMessage(updatedHistory, text, selectedCountry.name);
      
      const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = { role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleHistorySelect = (item: SearchHistoryItem) => {
    // If accessing history of a restricted mode, check auth
    if ((item.mode === SearchMode.MULTI || item.mode === SearchMode.CHAT) && !user) {
      setIsAuthModalOpen(true);
      return;
    }

    setSelectedImages(item.images || []);
    setDescription(item.description);
    setResult(item.result);
    setSearchMode(item.mode || SearchMode.SINGLE);
    setAppState(AppState.SUCCESS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B1120] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-black">
      {/* Header */}
      <header className="bg-[#0B1120]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            <div className="relative">
               <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20"></div>
               <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-2 rounded-xl text-cyan-400">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <Search size={36} strokeWidth={2.5} className="text-cyan-400 absolute inset-0" />
                    <Tag size={16} strokeWidth={2.5} className="text-white absolute top-[7px] left-[7px] fill-cyan-500 transform rotate-12" />
                  </div>
               </div>
            </div>
            {/* Logo Text */}
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Cheap</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 ml-0.5">Finds</span>
            </h1>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsHowItWorksOpen(true)}
              className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <Info size={16} />
              <span>How it works</span>
            </button>
            
            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
              title="Share Feedback"
            >
              <MessageSquarePlus size={22} />
            </button>

            {/* Profile / Auth Dropdown */}
            {user ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="group flex items-center gap-2 outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden ring-2 ring-transparent group-hover:ring-cyan-500/30 transition-all flex items-center justify-center">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-400 font-bold text-lg">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-800 mb-2">
                      <p className="text-sm font-bold text-white truncate">{user.displayName || 'User'}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400 flex items-center gap-3 transition-colors">
                      <Settings size={16} />
                      Settings
                    </button>
                    
                    <button 
                      onClick={() => {
                        setIsFeedbackOpen(true);
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400 flex items-center gap-3 transition-colors"
                    >
                      <MessageSquarePlus size={16} />
                      Give Feedback
                    </button>

                    <button 
                      onClick={() => {
                        setIsHowItWorksOpen(true);
                        setIsProfileOpen(false);
                      }}
                      className="md:hidden w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400 flex items-center gap-3 transition-colors"
                    >
                      <Info size={16} />
                      How it works
                    </button>
                    <div className="my-1.5 border-t border-slate-800"></div>
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-cyan-900/20 text-slate-300 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/30 rounded-lg transition-all text-sm font-semibold"
              >
                <UserIcon size={16} />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Best Deal</span>
          </h2>
          <p className="text-base text-slate-400">
            Upload images, describe products, or chat with our AI to find the cheapest sources.
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-12 md:mb-16 space-y-6">
          
          {/* Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 grid grid-cols-3 w-full sm:w-auto relative">
              <button
                onClick={() => toggleSearchMode(SearchMode.SINGLE)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative z-10 whitespace-nowrap ${searchMode === SearchMode.SINGLE ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Box size={16} />
                Single
              </button>
              <button
                onClick={() => toggleSearchMode(SearchMode.MULTI)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative z-10 whitespace-nowrap group ${searchMode === SearchMode.MULTI ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {!user && <Lock size={12} className="text-cyan-500 mr-1 opacity-70 group-hover:opacity-100" />}
                <Layers size={16} />
                Multi
              </button>
              <button
                onClick={() => toggleSearchMode(SearchMode.CHAT)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative z-10 whitespace-nowrap group ${searchMode === SearchMode.CHAT ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                 {!user && <Lock size={12} className="text-cyan-500 mr-1 opacity-70 group-hover:opacity-100" />}
                <MessageSquare size={16} />
                Shop with AI
              </button>
              
              {/* Sliding Background */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc((100%-8px)/3)] bg-slate-800 rounded-lg transition-transform duration-300 ease-out border border-slate-700/50 
                  ${searchMode === SearchMode.SINGLE ? 'translate-x-0' : searchMode === SearchMode.MULTI ? 'translate-x-[100%]' : 'translate-x-[200%]'}`} 
              />
            </div>
          </div>

          {searchMode === SearchMode.CHAT ? (
            /* Chat Interface */
            <ChatInterface 
              messages={chatMessages} 
              onSendMessage={handleChatMessage} 
              isLoading={isChatLoading} 
            />
          ) : (
            /* Standard Inputs (Single/Multi) */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-3">
                <div className="flex justify-between items-center min-h-[32px] px-1">
                  <div>
                    {(selectedImages.length > 0 || description) && (
                        <button 
                          onClick={handleClearAll}
                          className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium animate-in fade-in"
                        >
                          <Trash2 size={16} />
                          <span>Clear All</span>
                        </button>
                    )}
                  </div>
                  <button 
                    onClick={startCamera}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-cyan-900/30 text-cyan-400 hover:text-cyan-300 rounded-lg transition-colors text-sm font-medium border border-slate-700/50 hover:border-cyan-500/30"
                  >
                    <Camera size={16} />
                    <span>Use Camera</span>
                  </button>
                </div>
                
                <ImageUploader 
                  onImagesSelected={handleImagesSelected} 
                  selectedImages={selectedImages}
                  onRemoveImage={handleRemoveImage}
                  allowMultiple={searchMode === SearchMode.MULTI}
                />
              </div>

              <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 p-1 focus-within:border-cyan-500/50 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all shadow-lg shadow-black/20">
                <div className="flex items-start gap-3 p-3">
                  <div className="p-1 text-slate-500 mt-1">
                    <AlignLeft size={24} />
                  </div>
                  <textarea
                      value={description}
                      onChange={handleDescriptionChange}
                      placeholder={searchMode === SearchMode.MULTI 
                        ? "List products here (e.g., 'iPhone 15, Sony WH-1000XM5, iPad Air')..." 
                        : "Type a product name or description here (optional if image is uploaded)..."}
                      className="w-full min-h-[80px] outline-none text-slate-200 placeholder:text-slate-500 resize-y bg-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-stretch justify-center bg-slate-900 p-4 rounded-2xl shadow-lg border border-slate-800 z-40 relative">
                
                {/* Custom Country Dropdown */}
                <div className="relative w-full md:w-64" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`
                      w-full h-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all
                      ${isDropdownOpen ? 'bg-slate-800 border-cyan-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}
                    `}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {selectedCountry.iso === 'global' ? (
                        <Globe size={20} className="text-cyan-400 shrink-0" />
                      ) : (
                        <img 
                          src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                          srcSet={`https://flagcdn.com/w80/${selectedCountry.iso}.png 2x`}
                          alt={selectedCountry.name} 
                          className="w-6 h-auto rounded-sm shrink-0 object-cover"
                        />
                      )}
                      <span className="text-slate-200 font-medium truncate">{selectedCountry.name}</span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1">
                      {COUNTRIES.map((country) => (
                        <button
                          key={country.iso}
                          onClick={() => {
                            setSelectedCountry(country);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left group"
                        >
                          <div className="w-6 shrink-0 flex justify-center">
                            {country.iso === 'global' ? (
                              <Globe size={18} className="text-slate-400 group-hover:text-cyan-400" />
                            ) : (
                              <img 
                                src={`https://flagcdn.com/w40/${country.iso}.png`}
                                alt={country.name}
                                className="w-6 h-auto rounded-sm shadow-sm"
                              />
                            )}
                          </div>
                          <span className={`text-sm flex-1 truncate ${selectedCountry.iso === country.iso ? 'text-cyan-400 font-semibold' : 'text-slate-300'}`}>
                            {country.name}
                          </span>
                          {selectedCountry.iso === country.iso && (
                            <Check size={14} className="text-cyan-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  disabled={(selectedImages.length === 0 && !description.trim()) || appState === AppState.ANALYZING}
                  className={`
                    flex-1 flex items-center justify-center gap-3 px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 relative overflow-hidden group
                    ${(selectedImages.length === 0 && !description.trim())
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                      : appState === AppState.ANALYZING 
                        ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 hover:scale-[1.02] active:scale-[0.98] shadow-cyan-500/20'
                    }
                  `}
                >
                  {appState === AppState.ANALYZING ? (
                    <>
                      <Loader2 className="animate-spin" />
                      <span className="hidden sm:inline">Scanning Market...</span>
                      <span className="sm:hidden">Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Search size={20} strokeWidth={3} />
                      Find Best Prices
                    </>
                  )}
                </button>
              </div>

              {/* Error Message */}
              {appState === AppState.ERROR && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-red-500/20 p-1 rounded-full">
                    <Camera size={16} />
                  </div>
                  <p>{errorMsg}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading / Skeleton State (Standard Mode) */}
        {appState === AppState.ANALYZING && searchMode !== SearchMode.CHAT && (
          <div className="border-t border-slate-800 pt-12 animate-in fade-in duration-500">
             
             {/* Catchy Animation Section */}
             <div className="flex flex-col items-center justify-center mb-16 relative">
                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                    {/* Pulsing Backdrops */}
                    <div className="absolute inset-0 bg-cyan-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute inset-4 bg-blue-500/20 rounded-full animate-ping delay-75" style={{ animationDuration: '2s' }}></div>
                    
                    {/* Spinning Rings */}
                    <div className="absolute inset-0 border-2 border-transparent border-t-cyan-500/50 border-r-cyan-500/30 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-2 border-2 border-transparent border-b-blue-500/50 border-l-blue-500/30 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
                    <div className="absolute inset-8 border border-transparent border-t-white/20 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>

                    {/* Center Icon */}
                    <div className="relative z-10 bg-slate-900/90 border border-slate-700 p-5 rounded-full shadow-2xl shadow-cyan-500/20 backdrop-blur-sm">
                        <ScanEye size={40} className="text-cyan-400 animate-pulse" />
                    </div>
                </div>

                <div className="h-16 flex items-center justify-center">
                  <h3 key={loadingPhraseIndex} className="text-xl md:text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl px-4">
                    {LOADING_PHRASES[loadingPhraseIndex]}
                  </h3>
                </div>
             </div>
             
             {/* Structure Skeleton */}
             <div className="w-full opacity-40 blur-[1px] pointer-events-none transition-all duration-1000">
               {searchMode === SearchMode.MULTI ? (
                  /* Multi-Product Skeleton */
                  <div className="max-w-4xl mx-auto space-y-12">
                    {[1, 2].map((i) => (
                      <div key={i} className="space-y-6">
                        {/* Product Header Placeholder */}
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                          <div className="h-10 w-10 bg-slate-800 rounded-lg"></div>
                          <div className="h-8 w-1/3 bg-slate-800 rounded"></div>
                        </div>
                        
                        {/* Podium Placeholders */}
                        <div className="space-y-4">
                           <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50"></div>
                           <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50"></div>
                           <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50"></div>
                        </div>
                      </div>
                    ))}
                  </div>
               ) : (
                  /* Single Product Skeleton */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                       <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                             <div className="h-10 w-10 bg-slate-800 rounded-lg"></div>
                             <div className="h-6 w-40 bg-slate-800 rounded"></div>
                          </div>
                          <div className="space-y-4">
                             <div className="h-4 w-full bg-slate-800 rounded"></div>
                             <div className="h-4 w-5/6 bg-slate-800 rounded"></div>
                          </div>
                          <div className="mt-8 space-y-6">
                             <div className="h-32 bg-slate-800/50 rounded-xl"></div>
                             <div className="h-24 bg-slate-800/50 rounded-xl"></div>
                          </div>
                       </div>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                       <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                          <div className="flex items-center gap-2 mb-4">
                             <div className="h-5 w-5 bg-slate-800 rounded"></div>
                             <div className="h-5 w-24 bg-slate-800 rounded"></div>
                          </div>
                          <div className="space-y-3">
                             {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-slate-800 rounded-xl"></div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
               )}
             </div>
          </div>
        )}

        {/* Results Section (Standard Mode) */}
        {appState === AppState.SUCCESS && result && searchMode !== SearchMode.CHAT && (
          <div className="border-t border-slate-800 pt-12 animate-in fade-in duration-700">
             <div className="flex items-center gap-2 mb-8 justify-center md:justify-start">
                <h3 className="text-2xl font-bold text-white">Search Results</h3>
                <ArrowRight size={20} className="text-slate-500" />
             </div>
             <ResultsView result={result} userImage={selectedImages} />
          </div>
        )}

        {/* Search History (Hide in Chat Mode) */}
        {searchMode !== SearchMode.CHAT && (
           <SearchHistory history={searchHistory} onSelect={handleHistorySelect} />
        )}

      </main>

      <footer className="bg-[#0B1120] border-t border-slate-800 py-10 mt-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
             <div className="relative w-6 h-6 flex items-center justify-center">
                <Search size={24} className="text-cyan-500 absolute inset-0" strokeWidth={2.5} />
                <Tag size={10} className="text-cyan-200 absolute top-[5px] left-[5px] fill-cyan-500 transform rotate-12" strokeWidth={3} />
             </div>
             <span className="font-bold text-slate-300">CheapFinds</span>
          </div>
          <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} CheapFinds. Powered by Gemini 2.5.</p>
        </div>
      </footer>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
             {cameraError ? (
               <div className="flex flex-col items-center justify-center p-6 text-center max-w-md z-20 animate-in zoom-in-95">
                 <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <AlertCircle size={32} className="text-red-500" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
                 <p className="text-slate-400 mb-8 leading-relaxed">{cameraError}</p>
                 <button
                    onClick={() => startCamera()}
                    className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/10"
                 >
                    <RefreshCw size={18} />
                    Try Again
                 </button>
               </div>
             ) : (
               <>
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted
                   className="absolute min-w-full min-h-full object-cover"
                 />
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[80%] h-[60%] border-2 border-white/30 rounded-3xl relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-500 rounded-tl-xl -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-500 rounded-tr-xl -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-500 rounded-bl-xl -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-500 rounded-br-xl -mb-1 -mr-1"></div>
                    </div>
                 </div>
               </>
             )}
             
             <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-30">
               <button 
                 onClick={stopCamera}
                 className="p-3 bg-black/40 text-white rounded-full backdrop-blur-md hover:bg-black/60 transition-colors"
                 aria-label="Close Camera"
               >
                 <X size={24} />
               </button>
             </div>
          </div>
          
          {!cameraError && (
            <div className="h-36 bg-black flex items-center justify-center gap-12 pb-8 pt-6 px-6 z-30">
               <button 
                 onClick={stopCamera}
                 className="text-slate-300 font-medium hover:text-white transition-colors"
               >
                 Cancel
               </button>
               
               <button 
                 onClick={capturePhoto}
                 className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors shadow-lg shadow-white/20 active:scale-95 group"
                 aria-label="Take Photo"
               >
                 <div className="w-14 h-14 rounded-full border-2 border-black group-active:scale-90 transition-transform"></div>
               </button>
               
               <div className="w-[52px]"></div>
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Cropper Modal - Only active in Single Mode */}
      {isCropperOpen && tempImage && (
        <ImageCropper 
          imageFile={tempImage}
          onCropConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* How It Works Modal */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-2xl font-bold text-white">How it Works</h2>
              <button 
                onClick={() => setIsHowItWorksOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">1. Snap & Describe</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Upload photos or describe products. Switch to Multi-mode to search for a list of items at once.
                  </p>
                </div>
              </div>
              
              {/* ... other steps similar ... */}
               <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">2. Choose Region</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Select your country to find local retailers, accurate shipping estimates, and correct currency.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">3. AI Search</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Our Gemini-powered AI identifies the product and scours the internet for real-time listings.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                  <Award size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">4. Save Money</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Instantly see the top 3 deals ranked Gold, Silver, and Bronze based on price and reliability.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/50">
              <button 
                onClick={() => setIsHowItWorksOpen(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
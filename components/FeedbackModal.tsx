import React, { useState } from 'react';
import { X, Star, Send, ThumbsUp } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setRating(0);
        setFeedback('');
        onClose();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-xl font-bold text-white">Share Feedback</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {isSent ? (
          <div className="p-10 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 text-green-400 border border-green-500/20">
              <ThumbsUp size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
            <p className="text-slate-400">Your feedback helps us improve CheapFinds.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Rating */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Rate your experience</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star 
                      size={32} 
                      className={`
                        transition-colors duration-200 
                        ${(hoverRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}
                      `} 
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Comments (Optional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What do you like? What can we improve?"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all min-h-[120px] resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={rating === 0 || isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>Sending...</>
              ) : (
                <>
                  <Send size={18} />
                  Submit Feedback
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
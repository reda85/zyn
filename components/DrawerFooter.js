import { useState } from "react";

import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/utils/supabase/client";
import { Send } from "lucide-react";

export default function DrawerFooter({ pin, onCommentAdded }) {
  const [isFocused, setIsFocused] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user,profile } = useUserData(); // Get current logged-in user
  const [newComment, setNewComment] = useState(null)

  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      console.log('comment', comment)
      console.log('sender_id', profile.id)
      console.log('pin_id', pin.id)
      const { data, error } = await supabase
        .from('comments')
        .insert([
          { 
            comment: comment, 
            pin_id: pin.id, 
            sender_id: profile.id 
          },
        ])
        .select();

      if (error) {console.log(error);throw error;}

      // Clear input and notify parent component to refresh the list
      setComment('');
       onCommentAdded({
  ...data[0],
  user: profile,
  created_at: new Date().toISOString(),
});
      
    } catch (error) {
      console.error("Error posting comment:", error.message);
      alert("Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-white border-t border-slate-100">
      <div className="flex-1 relative">
        <textarea
          rows={1}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ajouter un commentaire"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full resize-none border border-slate-200 rounded-2xl px-4 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
       onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }}
       />

        {/* Post button, shown when focused or when text is present */}
        {(isFocused || comment.length > 0) && (
          <button
            onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing before click
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
            className="absolute right-2 top-1/2 -translate-y-1/2
             flex items-center justify-center
             h-8 w-8 rounded-full
             bg-black text-white
             hover:bg-slate-800
             disabled:bg-slate-300 disabled:cursor-not-allowed
             transition-all"
          >
            {isSubmitting ? '...' : <Send size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
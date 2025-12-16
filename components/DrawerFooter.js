import { useState } from "react";

import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/utils/supabase/client";

export default function DrawerFooter({ pin, onCommentAdded }) {
  const [isFocused, setIsFocused] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user,profile } = useUserData(); // Get current logged-in user

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

      if (error) throw error;

      // Clear input and notify parent component to refresh the list
      setComment('');
      if (onCommentAdded) onCommentAdded(data[0]);
      
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
          placeholder="Write a comment..."
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full resize-none border border-slate-200 rounded-2xl px-4 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
        />

        {/* Post button, shown when focused or when text is present */}
        {(isFocused || comment.length > 0) && (
          <button
            onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing before click
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
            className="absolute bottom-1.5 right-2 text-xs font-bold text-white bg-black hover:bg-slate-800 px-4 py-1.5 rounded-full disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        )}
      </div>
    </div>
  );
}
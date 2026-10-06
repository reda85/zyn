import { useState } from "react";

import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/utils/supabase/client";
import { Send } from "lucide-react";

export default function DrawerFooter({ pin, onCommentAdded }) {
  const [isFocused, setIsFocused] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useUserData();

  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            comment: comment,
            pin_id: pin.id,
            sender_id: profile.id,
            username: profile.name,
          },
        ])
        .select();

      if (error) throw error;

      setComment('');
      onCommentAdded?.({
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
    <div className="flex items-start gap-3 p-4 bg-white border-t border-[#eeeeec]">
      <div className="flex-1 relative">
        <textarea
          rows={1}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ajouter un commentaire"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full resize-none border border-[#e5e5e2] rounded-[4px] px-4 py-2 pr-16 text-[13px] text-[#0d0d0c] placeholder:text-[#b8b8b3] focus:outline-none focus:border-[#0d0d0c] transition-colors"
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
            className="absolute right-2 top-1/2 -translate-y-1/2
             flex items-center justify-center
             h-7 w-7 rounded-[3px]
             bg-[#0d0d0c] text-white
             hover:bg-[#1a1a18]
             disabled:bg-[#d6d6d2] disabled:cursor-not-allowed
             transition-colors"
          >
            {isSubmitting ? '...' : <Send size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}
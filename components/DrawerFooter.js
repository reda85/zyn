import { useState } from "react";

export default function DrawerFooter({ pin, submit }) {

    const [isFocused, setIsFocused] = useState(false);
  const [comment, setComment] = useState('');
  return (
    <div className="flex items-start gap-3">
    {/* Profile picture (placeholder) */}
   {/*<div className="rounded p-1 bg-stone-100"> {pin?.assigned_to?.name[0]}</div> */}
    {/* Comment input box */}
    <div className="flex-1 relative">
          <textarea
            rows={1}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment..."
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full resize-none border rounded-2xl px-4 py-2 pr-16 text-sm focus:outline-none focus:ring focus:ring-blue-200"
          ></textarea>

          {/* Post button, shown only when focused */}
          {isFocused && (
            <button
              onMouseDown={(e) => e.preventDefault()} // prevent blur
              className="absolute bottom-2 right-3 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full"
            >
              Post
            </button>
          )}
        </div>
  </div>
  );
}
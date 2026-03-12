import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, Mail, MessageSquare } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
}

export default function ShareButton({ title, text, url }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${text}\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    setOpen(false);
  };

  const handleText = () => {
    const body = encodeURIComponent(`${text}\n${url}`);
    window.open(`sms:?&body=${body}`, "_self");
    setOpen(false);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
    setOpen(false);
  };

  return (
    <div className="share-wrapper" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="share-button"
        title="Share"
        aria-label="Share"
      >
        <Share2 size={18} />
      </button>

      {open && (
        <div className="share-menu">
          <button className="share-menu-item" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
          <button className="share-menu-item" onClick={handleEmail}>
            <Mail size={16} />
            <span>Email</span>
          </button>
          <button className="share-menu-item" onClick={handleText}>
            <MessageSquare size={16} />
            <span>Text</span>
          </button>
          {"share" in navigator && (
            <button className="share-menu-item" onClick={handleNativeShare}>
              <Share2 size={16} />
              <span>More...</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

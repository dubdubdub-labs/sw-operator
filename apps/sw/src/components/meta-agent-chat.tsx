"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
} from "framer-motion";
import { ArrowUpIcon, MessageCircle, XIcon } from "lucide-react";
import { useState } from "react";

export function MetaAgentChat() {
  const [isOpen, setIsOpen] = useState(false);

  const fabSize = 56;
  const fabRadius = fabSize / 2;

  const clipClosed = `circle(${fabRadius}px at calc(100% - ${fabRadius}px) calc(100% - ${fabRadius}px))`;
  // Big enough to reveal the whole popover; 150% is a safe overshoot for any aspect ratio
  const clipOpen = `circle(150% at calc(100% - ${fabRadius}px) calc(100% - ${fabRadius}px))`;

  const sharedTransition: Transition = {
    type: "spring",
    stiffness: 700,
    damping: 40,
  };

  return (
    <LayoutGroup>
      <div className="fixed right-3 bottom-3 z-50">
        <AnimatePresence mode="popLayout">
          {!isOpen && (
            <motion.button
              animate={{ opacity: 1, scale: 1 }}
              aria-label="Open chat"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/75 hover:bg-white focus:outline-none"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              key="fab-closed"
              layoutId="fab"
              onClick={() => setIsOpen(true)}
              transition={sharedTransition}
            >
              <motion.span
                className="grid place-items-center"
                layoutId="fab-icon"
              >
                <MessageCircle className="size-5 text-foreground/80" />
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div
          animate={{
            clipPath: isOpen ? clipOpen : clipClosed,
            opacity: isOpen ? 1 : 0.001,
          }}
          // keep it mounted so the shared element has a stable target;
          // pointer events only when open
          className="absolute right-0 bottom-0 h-80 w-80"
          style={{
            willChange: "clip-path",
            pointerEvents: isOpen ? "auto" : "none",
          }}
          transition={{
            clipPath: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
            opacity: { duration: 0.2 },
          }}
        >
          <div className="glass3d flex h-full w-full flex-col rounded-3xl">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2 font-medium text-foreground/80">
                Meta Agent chat
              </div>
              <Button
                aria-label="Close chat"
                className="group h-8 w-8 rounded-full bg-white/50 p-0"
                onClick={() => setIsOpen(false)}
                size="sm"
                variant="ghost"
              >
                <XIcon
                  className="size-4 text-foreground/25 group-hover:text-foreground/75"
                  strokeWidth={3}
                />
              </Button>
            </div>
            <div className="flex-1" />
            <div className="p-2">
              <div className="relative flex gap-2">
                <Input
                  className="h-10 flex-1 rounded-full border-none bg-white/25 pr-14 shadow-none"
                  placeholder="Type your message..."
                />
                <AnimatePresence mode="popLayout">
                  {isOpen && (
                    <motion.button
                      aria-label="Send message"
                      className="-translate-y-1/2 absolute top-1/2 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/50"
                      key="fab-open"
                      layoutId="fab"
                      transition={sharedTransition}
                      type="button"
                    >
                      <motion.span
                        className="grid place-items-center"
                        layoutId="fab-icon"
                      >
                        <ArrowUpIcon
                          className="size-4.5 text-foreground/80"
                          strokeWidth={2.5}
                        />
                      </motion.span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </LayoutGroup>
  );
}

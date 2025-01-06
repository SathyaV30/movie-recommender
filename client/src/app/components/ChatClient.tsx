"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { BACKEND_URL } from "../config";

interface Message {
  role: "user" | "assistant";
  content: string;
  recs?: TMDBMovie[];
}

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  media_type: string;
}

interface ChatClientProps {
  initialMessages?: Message[];
}

/** 
 * A helper function to parse **bold** text within messages.
 * Example: "This is **bold** text" -> will render a <strong> for "bold".
 */
const parseContent = (content: string) =>
  content.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });

/**
 * A small component that animates an ellipsis "...". 
 * It cycles through ".", "..", "..." in intervals for a simple "typing" effect.
 */
function AnimatedEllipsis() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    let count = 1;
    const interval = setInterval(() => {
      count = (count % 3) + 1;
      setDots(".".repeat(count));
    }, 500); // cycle every 0.5s
    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
}

export default function ChatClient({ initialMessages = [] }: ChatClientProps) {
  const router = useRouter();

  // Local state for messages, user input, etc.
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [userInput, setUserInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  // Flip state for each movie card
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  // Helper for flipping a card
  const handleFlip = (movieId: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [movieId]: !prev[movieId],
    }));
  };

  // For rating color
  const getRatingClass = (rating: number) => {
    if (rating >= 7) return "text-green-500";
    if (rating >= 5) return "text-yellow-500";
    return "text-red-500";
  };

  // Handle sending a message
  const handleSend = async () => {
    if (!userInput.trim()) return;

    // Add user message to local state
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userInput },
    ];
    setMessages(newMessages);
    setUserInput("");

    // Show typing indicator (assistant bubble with animated ellipsis)
    setIsAssistantTyping(true);
    const typingIndicator: Message = { role: "assistant", content: "..." };
    setMessages((prev) => [...prev, typingIndicator]);

    try {
      // Send to backend
      const resp = await axios.post(`${BACKEND_URL}/api/respond`, {
        messages: newMessages,
      });
      const data = resp.data;

      // Replace "..." with the final response
      setMessages((prev) => {
        const updated = [...prev];
        updated.pop(); // remove the placeholder
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response || "Sorry, something went wrong.",
        };
        if (Array.isArray(data.tmdbData) && data.tmdbData.length > 0) {
          assistantMessage.recs = data.tmdbData;
        }
        updated.push(assistantMessage);
        return updated;
      });
    } catch (err) {
      console.error("Error fetching AI response:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated.pop(); // remove the placeholder
        updated.push({
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        });
        return updated;
      });
    } finally {
      setIsAssistantTyping(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      {/* Navbar */}
      <nav className="navbar p-4 flex justify-between items-center sticky top-0 z-10 bg-[var(--color-accent)] text-[var(--color-foreground)]">
        <h1 onClick={() => router.push("/")} className="text-xl font-bold cursor-pointer">
          PopcornPal Chat
        </h1>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to clear the chat?")) {
              setMessages([]);
              setUserInput("");
              setFlippedCards({});
            }
          }}
          className="btn shadow-lg transition-transform hover:scale-110 bg-[var(--color-primary)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]"
        >
          Clear chat
        </button>
      </nav>

      {/* Chat Messages */}
      <div
        className={`flex-1 p-4 ${
          messages.length === 0
            ? "flex items-center justify-center"
            : "overflow-y-auto"
        }`}
      >
        {messages.length === 0 ? (
          /* Welcome */
          <div className="flex items-center justify-center h-full">
            <div className="card w-full max-w-xl bg-[var(--color-accent)] text-[var(--color-foreground)] shadow-xl rounded-lg">
              <div className="card-body items-center text-center">
                <div className="text-7xl mb-4">🍿</div>
                <h2 className="card-title text-3xl mb-2">
                  Welcome to PopcornPal!
                </h2>
                <p className="text-[var(--color-neutral)]">
                  Get your popcorn ready! PopcornPal is your personal
                  AI-powered movie companion, ready to help you discover
                  fantastic films and TV shows. Let’s get started on this
                  exciting journey together!
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Chat messages */
          messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={idx}
                className={`chat mb-4 transition-transform duration-300 fade-in ${
                  isUser ? "chat-end" : "chat-start"
                }`}
              >
                <div className="chat-header mb-1 text-sm text-[var(--color-neutral)]">
                  {isUser ? "You" : "PopcornPal"}
                </div>
                <div
                  className={`chat-bubble whitespace-pre-wrap rounded-lg flex flex-col gap-4 ${
                    isUser
                      ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]"
                      : "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-neutral)]"
                  } text-[var(--color-foreground)] p-4`}
                >
                  {/* If this is the assistant "typing" placeholder,
                      show AnimatedEllipsis instead of literal "..." */}
                  {msg.content === "..." && !isUser ? (
                    <div>
                      Thinking <AnimatedEllipsis />
                    </div>
                  ) : (
                    <div>{parseContent(msg.content)}</div>
                  )}

                  {/* Movie recommendation row (only for assistant) */}
                  {!isUser && msg.recs && msg.recs.length > 0 && (
                    <div className="flex flex-row gap-4 overflow-x-auto py-2 fade-in">
                      {msg.recs.map((movie) => {
                        const flipped = flippedCards[movie.id] || false;
                        const rating = movie.vote_average ?? 0;
                        const ratingColorClass = getRatingClass(rating);

                        return (
                          <div
                            key={movie.id}
                             className="relative min-w-[200px] h-[300px] cursor-pointer transition-transform duration-300 hover:scale-105"
                            style={{ perspective: "1000px" }}
                            onClick={() => handleFlip(movie.id)}
                          >
                            <div
                              className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
                                flipped ? "[transform:rotateY(180deg)]" : ""
                              }`}
                            >
                              {/* Front Side */}
                              <div
                                className="absolute w-full h-full top-0 left-0 [backface-visibility:hidden]"
                                style={{ transform: "rotateY(0deg)" }}
                              >
                                <img
                                  className="w-full h-full object-cover rounded-lg"
                                  src={
                                    movie.poster_path
                                      ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
                                      : "/no-poster.png"
                                  }
                                  alt={movie.title}
                                />
                                {/* Rating wheel */}
                                {rating > 0 && (
                            <div className="absolute bottom-2 right-2">
                              <div
                                className={`radial-progress ${ratingColorClass} bg-gray-200`}
                                style={{
                                  "--value": `${rating * 10}`,
                                  "--size": "3rem",
                                  "--thickness": "6px",
                                } as React.CSSProperties}
                              >
                                {Math.round(rating * 10) / 10}
                              </div>
                            </div>
                          )}

                              </div>

                              {/* Back Side */}
                              <div
                                className="absolute w-full h-full top-0 left-0 rounded-lg bg-[var(--color-accent)] text-[var(--color-foreground)] p-4 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]"
                              >
                                <h2 className="font-bold text-lg mb-1">
                                  {movie.title}
                                </h2>
                                <p className="text-xs mb-2">
                                  Release Date:{" "}
                                  {movie.release_date ||
                                    movie.first_air_date ||
                                    "N/A"}
                                </p>
                                <p className="text-sm flex-1 overflow-y-auto">
                                  {movie.overview || "No overview available."}
                                </p>
                                <div className="mt-2 text-xs text-[var(--color-neutral)]">
                                  Vote Count: {movie.vote_count ?? 0}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const type =
                                      movie.media_type === "tv" ? "tv" : "movie";
                                    window.open(`/${type}/${movie.id}`, "_blank");
                                  }}
                                  className="btn btn-sm mt-4 self-end bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-[var(--color-foreground)]"
                                >
                                  View more
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 sticky bottom-0 bg-[var(--color-accent)]">
        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered w-full rounded-lg p-2 focus:outline-none bg-[var(--color-background)] text-[var(--color-foreground)]"
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="btn shadow-lg transition-transform hover:scale-110 bg-[var(--color-primary)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]"
            onClick={handleSend}
            disabled={isAssistantTyping}
          >
            {isAssistantTyping ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

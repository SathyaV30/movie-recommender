"use client";
import { useRouter } from 'next/navigation';
import React from 'react';

function HomeStartButton() {
    const router = useRouter();
  return (
    <button
    onClick={() => router.push("/chat")}
    className="btn btn-lg shadow-lg transition-transform hover:scale-110 bg-[var(--color-primary)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]"
  >
    Start Now
  </button>
  )
}

export default HomeStartButton;
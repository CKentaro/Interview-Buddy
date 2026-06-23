"use client";

import { useState, useEffect } from "react";

function computeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return "おはようございます";
  if (h >= 10 && h < 17) return "こんにちは";
  if (h >= 17 && h < 22) return "こんばんは";
  return "お疲れさまです";
}

export function TimeGreeting() {
  const [greeting, setGreeting] = useState("こんにちは");

  useEffect(() => {
    setGreeting(computeGreeting());
  }, []);

  return <>{greeting}</>;
}

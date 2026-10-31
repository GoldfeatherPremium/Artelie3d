import { NextRequest, NextResponse } from "next/server";
import { searchSuggestions } from "@/lib/data/catalog";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }
  try {
    const items = await searchSuggestions(q, 6);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

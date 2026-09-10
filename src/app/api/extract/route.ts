import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract raw text from docx
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error extracting text:", error);
    return NextResponse.json({ error: "Failed to extract text" }, { status: 500 });
  }
}

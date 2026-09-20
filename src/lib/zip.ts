// 발행 패키지 ZIP 생성 (PROMPT.md 8절 단계 6).

import JSZip from "jszip";
import { markdownToSimpleHtml } from "./clipboard";

export interface PackageImage {
  filename: string;
  blob: Blob;
}

export interface PackageInputs {
  blogBodyMarkdown: string;
  threadsMain?: string;
  threadsReplies?: string[];
  scriptCopyText?: string;
  images: PackageImage[];
  video?: { blob: Blob; filename: string };
  credits: string[];
}

export async function buildPackageZip(inputs: PackageInputs): Promise<Blob> {
  const zip = new JSZip();

  zip.file("blog.txt", inputs.blogBodyMarkdown);
  zip.file("blog.html", markdownToSimpleHtml(inputs.blogBodyMarkdown));

  if (inputs.threadsMain) {
    zip.file("threads.txt", [inputs.threadsMain, ...(inputs.threadsReplies ?? [])].join("\n\n---\n\n"));
  }

  if (inputs.scriptCopyText) {
    zip.file("script.txt", inputs.scriptCopyText);
  }

  const imagesFolder = zip.folder("images");
  for (const image of inputs.images) {
    imagesFolder?.file(image.filename, image.blob);
  }

  if (inputs.video) {
    zip.file(inputs.video.filename, inputs.video.blob);
  }

  if (inputs.credits.length > 0) {
    zip.file("credits.txt", inputs.credits.join("\n"));
  }

  return zip.generateAsync({ type: "blob" });
}

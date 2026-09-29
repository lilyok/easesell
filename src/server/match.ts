export interface VisionWebDetection {
  bestGuessLabels?: { label?: string }[];
  webEntities?: { description?: string; score?: number }[];
  pagesWithMatchingImages?: { url?: string; pageTitle?: string }[];
}

export interface PhotoMatch {
  found: boolean;
  title: string;
  details: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
}

export function matchFromWebDetection(
  web: VisionWebDetection | undefined
): PhotoMatch {
  const guess = web?.bestGuessLabels?.find((label) => clean(label.label))?.label;
  const entity = [...(web?.webEntities ?? [])]
    .filter((item) => clean(item.description))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const title = clean(guess) ?? clean(entity?.description);
  const page = web?.pagesWithMatchingImages?.find((item) => httpUrl(item.url));
  const sourceTitle = clean(page?.pageTitle);
  const sourceUrl = httpUrl(page?.url);

  if (!title) {
    return {
      found: false,
      title: "",
      details:
        "Google Vision did not recognize this photo. Name the item and set the price you want to ask.",
      sourceUrl,
      sourceTitle,
    };
  }

  const pageSentence = sourceTitle ? ` A similar page is “${sourceTitle}”.` : "";
  return {
    found: true,
    title: title.slice(0, 180),
    details: `Google Vision matched this photo to “${title}”.${pageSentence} Set the price you want to ask.`,
    sourceUrl,
    sourceTitle,
  };
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function httpUrl(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

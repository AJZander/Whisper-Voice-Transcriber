import stringSimilarity from "string-similarity";

/**
 * STEP 1: Split text into sentences (heuristically).
 */
function splitIntoSentences(text) {
    if (!text) return [];
    // Split on sentence-ending punctuation, capturing punctuation in separate tokens
    // so we can reassemble them. You can adjust as needed.
    const parts = text
        .split(/([.?!])/)
        .map((p) => p.trim())
        .filter(Boolean);

    const sentences = [];
    for (let i = 0; i < parts.length; i++) {
        // If this part is punctuation, append to the last sentence
        if (parts[i].match(/^[.?!]$/) && sentences.length > 0) {
            sentences[sentences.length - 1] += parts[i];
        } else {
            sentences.push(parts[i]);
        }
    }
    return sentences;
}

/**
 * STEP 2: Compare two sentences word by word, preferring local words if there's a mismatch.
 *
 * This function is used when the two sentences are already known to be "similar enough"
 * at the sentence level, but we want to refine which exact words to trust.
 */
function refineSentence(localSentence, finalSentence) {
    // Split by spaces to get words; you could refine or handle punctuation better if needed
    const localWords = localSentence.split(/\s+/);
    const finalWords = finalSentence.split(/\s+/);

    // If the number of tokens is wildly different, we just pick the final sentence
    // (or pick whichever you prefer)
    if (Math.abs(localWords.length - finalWords.length) > 3) {
        return finalSentence; // fallback to final or local
    }

    // Otherwise, do a naive word-by-word iteration, preferring local if mismatch is big
    const mergedWords = [];
    const length = Math.min(localWords.length, finalWords.length);

    for (let i = 0; i < length; i++) {
        const localW = localWords[i];
        const finalW = finalWords[i];

        // Calculate similarity between the two words
        const wordSim = stringSimilarity.compareTwoStrings(localW.toLowerCase(), finalW.toLowerCase());

        // If the words are quite similar, prefer the final version
        // (or if local is typically more accurate, pick local).
        if (wordSim > 0.7) {
            mergedWords.push(finalW);
        } else {
            // The words differ a lot. We'll prefer local in this example
            // to avoid nonsense words from final.
            // You could add further logic here, e.g. dictionary checks, etc.
            mergedWords.push(localW);
        }
    }

    // If final has extra trailing words, optionally append them
    // or keep local's trailing words. We'll prefer final's trailing words here:
    if (finalWords.length > length) {
        mergedWords.push(...finalWords.slice(length));
    } else if (localWords.length > length) {
        // If local has extra trailing words
        mergedWords.push(...localWords.slice(length));
    }

    // Reassemble
    return mergedWords.join(" ");
}

/**
 * STEP 3: Merge local text + final text into existing merged transcript.
 * We do sentence-level merges, and then refine at the word level for sentences
 * deemed "similar enough."
 */
export function mergeTranscripts(localText, finalText, existingMerged = "") {
    // If everything is empty, just return
    if (!localText && !finalText && !existingMerged) return "";

    // If we have no existing merged, pick one or combine them
    if (!existingMerged) {
        if (!localText) return finalText || "";
        if (!finalText) return localText;
        // If both exist and no existing merged, check if they are very similar
        const sim = stringSimilarity.compareTwoStrings(localText, finalText);
        if (sim > 0.7) {
            return finalText; // final is presumably more accurate
        }
        // else combine them
        return finalText + " " + localText;
    }

    // Split all into sentences
    const mergedSentences = splitIntoSentences(existingMerged);
    const localSentences = splitIntoSentences(localText);
    const finalSentences = splitIntoSentences(finalText);

    // STEP 3.1: Incorporate final sentences into the merged transcript
    finalSentences.forEach((fSentence) => {
        // Find the best match in merged
        const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(fSentence, mergedSentences);

        if (bestMatch.rating > 0.6) {
            // If it's similar, refine at the word level
            const refined = refineSentence(mergedSentences[bestMatchIndex], fSentence);
            mergedSentences[bestMatchIndex] = refined;
        } else {
            // Else add as a new sentence
            mergedSentences.push(fSentence);
        }
    });

    // STEP 3.2: Incorporate local sentences that are not covered
    localSentences.forEach((lSentence) => {
        // Check if there's a close match in merged
        const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(lSentence, mergedSentences);
        if (bestMatch.rating > 0.6) {
            // If there's a similar sentence, refine word by word
            const refined = refineSentence(lSentence, mergedSentences[bestMatchIndex]);
            mergedSentences[bestMatchIndex] = refined;
        } else {
            // If no close match, just add it
            mergedSentences.push(lSentence);
        }
    });

    // Reassemble them into a final text with minimal punctuation logic
    const updated = mergedSentences
        .map((s) => {
            // ensure each sentence ends with punctuation
            if (!/[.?!]$/.test(s)) return s + ".";
            return s;
        })
        .join(" ");

    return updated.trim();
}

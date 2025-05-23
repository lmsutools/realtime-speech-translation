import { TIME_GAP_THRESHOLD, MAX_SENTENCES_PER_PARAGRAPH, speakerPillColors } from './constants.js';

export function makeWordKey(start, end) {
    return `${start.toFixed(2)}-${end.toFixed(2)}`;
}

export function syncEphemeralWords(ephemeralMap, words) {
    const newMap = new Map();
    
    for (const w of words) {
        const key = makeWordKey(w.start, w.end);
        newMap.set(key, {
            start: w.start,
            end: w.end,
            speaker: w.speaker,
            text: w.word,
            confidence: w.confidence,
            language: w.language
        });
    }

    for (const oldKey of ephemeralMap.keys()) {
        if (!newMap.has(oldKey)) {
            ephemeralMap.delete(oldKey);
        }
    }

    for (const [key, val] of newMap) {
        if (!ephemeralMap.has(key)) {
            ephemeralMap.set(key, val);
        } else {
            const existing = ephemeralMap.get(key);
            if (existing.speaker !== val.speaker || existing.text !== val.text) {
                ephemeralMap.set(key, val);
            }
        }
    }
}

export function buildParagraphsFromWords(words) {
    if (!words.length) return [];
    
    words.sort((a, b) => a.start - b.start);
    
    let paragraphs = [];
    let currentPara = null;
    
    for (const w of words) {
        if (!currentPara) {
            currentPara = createParagraph(w);
            continue;
        }
        
        const gap = w.start - currentPara.endTime;
        const sameSpeaker = (w.speaker === currentPara.speaker);
        const newSentCount = currentPara.sentenceCount + countSentenceEnders(w.text);
        
        if (gap >= TIME_GAP_THRESHOLD || !sameSpeaker || newSentCount >= MAX_SENTENCES_PER_PARAGRAPH) {
            paragraphs.push(currentPara);
            currentPara = createParagraph(w);
        } else {
            currentPara.text += " " + w.text;
            currentPara.endTime = w.end;
            currentPara.sentenceCount = newSentCount;
        }
    }
    
    if (currentPara) {
        paragraphs.push(currentPara);
    }
    
    return paragraphs;
}

export function createParagraph(w) {
    return {
        speaker: w.speaker,
        text: w.text,
        endTime: w.end,
        sentenceCount: countSentenceEnders(w.text)
    };
}

export function buildHTMLTranscript(finalParas, ephemeralParas) {
    const combined = [...finalParas, ...ephemeralParas];
    if (!combined.length) return "";
    
    let htmlParts = [];
    let lastSpeaker = null;
    
    for (const para of combined) {
        const spk = para.speaker;
        const txt = para.text.trim();
        
        if (spk !== lastSpeaker) {
            const color = getSpeakerColor(spk);
            const pill = `<span style="background-color: ${color};color: #fff;border-radius: 10px;padding: 2px 6px;margin-right: 6px;font-weight: 500;">speaker ${spk}</span>`;
            htmlParts.push(`<div>${pill} ${txt}</div>`);
            lastSpeaker = spk;
        } else {
            htmlParts.push(`<div>${txt}</div>`);
        }
    }
    
    return htmlParts.join("");
}

export function getSpeakerColor(speakerId) {
    return speakerPillColors[speakerId % speakerPillColors.length];
}

export function countSentenceEnders(text) {
    const matches = text.match(/[.!?]+/g);
    return matches ? matches.length : 0;
}

export function buildPlainTranscript(finalParas, ephemeralParas) {
    const combined = [...finalParas, ...ephemeralParas];
    return combined.map(para => para.text.trim()).join(' ');
}

export function convertTextToParagraphs(text) {
    if (!text.trim()) return [];
    return [{ 
        speaker: 0, 
        text: text.trim(), 
        endTime: 0, 
        sentenceCount: countSentenceEnders(text) 
    }];
}

export function convertParagraphsToText(paragraphs) {
    return paragraphs.map(p => p.text.trim()).join(' ');
}

import CHOKOTTO_KNOWLEDGE_FULL from '../data/scraped-knowledge.txt?raw';

export async function askGemini(prompt: string, apiKey: string, history: { role: string, text: string }[] = []) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    const contents = [...history, { role: 'user', text: prompt }].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const systemInstruction = {
        parts: [{
            text: `あなたは「ちょこっと(ちょ古っ都)製本工房」の公式サポートAIチャットボットです。丁寧で親切なトーンで回答してください。以下の【公式情報】(サイト全体のスクレイピングデータ)のみに基づいてユーザーの質問に答えてください。情報にないことについて聞かれた場合は「申し訳ありませんが、その情報は公式サイトには記載されておりません」と丁寧に答えてください。\n\n【公式情報】\n${CHOKOTTO_KNOWLEDGE_FULL}`
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: {
                temperature: 0.1, // Even lower temperature because context is huge and we want exact answers
            }
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Gemini API call failed');
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from AI');
    }
    return data.candidates[0].content.parts[0].text;
}

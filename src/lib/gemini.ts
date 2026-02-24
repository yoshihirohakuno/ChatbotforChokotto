import CHOKOTTO_KNOWLEDGE_FULL from '../data/scraped-knowledge.txt?raw';

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
            if (attempt < retries) {
                // Rate limited — wait and retry
                const retryAfterMs = 45000; // wait 45 seconds
                console.warn(`Rate limited. Retrying in ${retryAfterMs / 1000}s... (attempt ${attempt}/${retries})`);
                await new Promise(r => setTimeout(r, retryAfterMs));
                continue;
            }
        }
        return response;
    }
    throw new Error('レート制限により応答できませんでした。しばらく待ってから再度お試しください。');
}

export async function askGemini(prompt: string, apiKey: string, history: { role: string, text: string }[] = []) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    const contents = [...history, { role: 'user', text: prompt }].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const now = new Date();
    const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        weekday: 'long',
    });
    const currentDateTime = jstFormatter.format(now);

    const systemInstruction = {
        parts: [{
            text: `あなたは「ちょこっと(ちょ古っ都)製本工房」のスタッフの一員（公式サポートAIチャットボット）です。「公式サイトによると」といった第三者からの視点での発言は絶対に避け、「当工房では」「私どもでは」「ちょ古っ都製本工房では」といった主体的な表現を用いて、丁寧で親切なトーンで回答してください。以下の【公式情報】(サイト全体のスクレイピングデータ)のみに基づいてユーザーの質問に答えてください。情報にないことについて聞かれた場合、またはチャットボットでは解決できない問題（例：個別のご注文状況の確認、複雑なご要望など）の場合は「申し訳ありませんが、私どもではお答えできません。お問い合わせフォーム（https://www.chokotto.jp/contact.php）よりスタッフに直接ご連絡ください」と案内してください。\n\n【現在の日時（日本時間）】\n${currentDateTime}\n土曜・日曜・祝日は定休日（非営業日）です。15:00（翌営業日コースは10:00）を過ぎた場合、当日の受付は翌営業日扱いになります。これを考慮した上で最短納品日などを計算してください。\n\n【公式情報】\n${CHOKOTTO_KNOWLEDGE_FULL}`
        }]
    };

    const body = JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: { temperature: 0.1 }
    });

    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
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



import axios from 'axios';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import fs from 'fs';
import path from 'path';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
});

turndownService.addRule('remove-fluff', {
    filter: ['script', 'noscript', 'style', 'nav', 'footer', 'iframe'],
    replacement: () => ''
});

// Only scrape high-value, informational pages
const TARGET_PAGES = [
    'https://www.chokotto.jp/',
    'https://www.chokotto.jp/price.html',
    'https://www.chokotto.jp/faq.html',
    'https://www.chokotto.jp/orderflow.html',
    'https://www.chokotto.jp/howto.html',
    'https://www.chokotto.jp/genkounyuukou.html',
    'https://www.chokotto.jp/about.html',
    'https://www.chokotto.jp/sample.php',
    'https://www.chokotto.jp/osusume.html',
    'https://www.chokotto.jp/voice_new.html',
    'https://www.chokotto.jp/company.html',
    'https://www.chokotto.jp/privacy.html',
    'https://www.chokotto.jp/c_order.html',
    'https://www.chokotto.jp/order_campaign_pre.php',
    'https://www.chokotto.jp/calculation.html',
    'https://www.chokotto.jp/mekurun.html',
    'https://www.chokotto.jp/photobook.html',
];

const pagesData = [];

async function scrapePage(url) {
    console.log(`Scraping: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const dom = new JSDOM(response.data, { url });
        const document = dom.window.document;
        const title = document.title || 'Untitled';

        const mainContent = document.querySelector('main') || document.querySelector('#content') || document.querySelector('.main') || document.body;

        if (mainContent) {
            const fluffSelectors = ['header', 'nav', 'footer', '.sidebar', '#side', '.menu', 'script', 'style', '#left_box', '#header', '#footer'];
            fluffSelectors.forEach(selector => {
                mainContent.querySelectorAll(selector).forEach(el => el.remove());
            });

            let markdown = turndownService.turndown(mainContent.innerHTML);
            // Remove excessive whitespace
            markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

            if (markdown.length > 100) {
                pagesData.push(`\n\n--- PAGE: ${title} (${url}) ---\n\n${markdown}`);
                console.log(`  -> OK (${markdown.length} chars)`);
            }
        }
    } catch (error) {
        console.error(`  -> Failed: ${error.message}`);
    }
}

async function run() {
    console.log('Starting targeted scraper...');

    for (const url of TARGET_PAGES) {
        await scrapePage(url);
        await new Promise(r => setTimeout(r, 300));
    }

    const outputDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const combined = pagesData.join('');
    const outputPath = path.join(outputDir, 'scraped-knowledge.txt');
    fs.writeFileSync(outputPath, combined);

    // Rough token estimate (1 token ≈ 3.5 Japanese chars)
    const estTokens = Math.round(combined.length / 3.5);
    console.log(`\nDone! Scraped ${pagesData.length} pages.`);
    console.log(`Total chars: ${combined.length} | Estimated tokens: ~${estTokens.toLocaleString()}`);
    console.log(`Saved to ${outputPath}`);
}

run();

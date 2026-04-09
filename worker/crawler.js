const Parser = require('rss-parser');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const parser = new Parser();
const prisma = new PrismaClient();

const RSS_FEEDS = [
    { name: 'CERT-FR', url: 'https://www.cert.ssi.gouv.fr/alerte/feed/', type: 'RSS', lang: 'fr' },
    { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', type: 'RSS', lang: 'en' },
    { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', type: 'RSS', lang: 'en' },
    { name: 'ANSSI', url: 'https://www.ssi.gouv.fr/feed/', type: 'RSS', lang: 'fr' }
];

function calculateNotableScore(title, content) {
    let score = 0;
    const text = (title + " " + content).toLowerCase();
    
    if (text.includes('0-day') || text.includes('zero day') || text.includes('zeroday')) score += 50;
    if (text.includes('ransomware') || text.includes('lockbit') || text.includes('blackcat')) score += 30;
    if (text.includes('critical')) score += 20;
    if (text.includes('exploit') || text.includes('poc')) score += 15;
    if (text.includes('patch')) score += 5;
    
    return score;
}

async function fetchRssFeeds() {
    console.log("Fetching RSS feeds...");
    for (const feedConfig of RSS_FEEDS) {
        try {
            const source = await prisma.source.upsert({
                where: { url: feedConfig.url },
                update: { lastFetchedAt: new Date() },
                create: {
                    name: feedConfig.name,
                    url: feedConfig.url,
                    type: feedConfig.type,
                    language: feedConfig.lang,
                    lastFetchedAt: new Date()
                }
            });

            const feed = await parser.parseURL(feedConfig.url);
            let addedCount = 0;
            
            for (const item of feed.items) {
                const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
                
                if (pubDate < threeMonthsAgo) continue;

                if (!item.link) continue;

                const dbArticle = await prisma.article.findUnique({
                    where: { link: item.link }
                });

                if (!dbArticle) {
                    const snippet = String(item.contentSnippet || item.content || "");
                    const score = calculateNotableScore(item.title || "", snippet);
                    await prisma.article.create({
                        data: {
                            title: item.title || "No Title",
                            link: item.link,
                            summary: snippet.substring(0, 500),
                            publishedAt: pubDate,
                            sourceId: source.id,
                            notableScore: score
                        }
                    });
                    addedCount++;
                }
            }
            console.log(`[${feedConfig.name}] Added ${addedCount} new articles.`);
        } catch (error) {
            console.error(`Error fetching feed ${feedConfig.name}:`, error.message);
        }
    }
}

async function main() {
    console.log("Starting CyberVisor Crawler...");
    await fetchRssFeeds();
    console.log("Crawler run finished. Waiting 5 minutes...");
}

main(); // Execute once immediately
setInterval(main, 5 * 60 * 1000); // And then every 5 minutes

const Parser = require('rss-parser');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const http = require('http'); // Serveur HTTP natif ajouté pour le bouton Sync
const parser = new Parser({ timeout: 20000 });
const prisma = new PrismaClient();

const RSS_FEEDS = [
    // US & Global Threat Intel
    { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', type: 'RSS', lang: 'en' },
    { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', type: 'RSS', lang: 'en' },
    { name: 'Security Affairs', url: 'https://securityaffairs.com/feed', type: 'RSS', lang: 'en' },
    { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', type: 'RSS', lang: 'en' },
    { name: 'The Record', url: 'https://therecord.media/feed', type: 'RSS', lang: 'en' },
    { name: 'CyberScoop', url: 'https://cyberscoop.com/feed/', type: 'RSS', lang: 'en' },
    { name: 'Krebs On Security', url: 'https://krebsonsecurity.com/feed/', type: 'RSS', lang: 'en' },
    { name: 'SANS ISC', url: 'https://isc.sans.edu/rssfeed.xml', type: 'RSS', lang: 'en' },
    { name: 'Help Net Security', url: 'https://www.helpnetsecurity.com/feed/', type: 'RSS', lang: 'en' },
    { name: 'Talos Intelligence', url: 'https://blog.talosintelligence.com/rss/', type: 'RSS', lang: 'en' },
    { name: 'ZDI', url: 'https://www.zerodayinitiative.com/rss/published/', type: 'RSS', lang: 'en' },
    // French Media & CERTs
    { name: 'CERT-FR Alerte', url: 'https://www.cert.ssi.gouv.fr/alerte/feed/', type: 'RSS', lang: 'fr' },
    { name: 'CERT-FR Avis', url: 'https://www.cert.ssi.gouv.fr/avis/feed/', type: 'RSS', lang: 'fr' },
    { name: 'IT-Connect', url: 'https://www.it-connect.fr/feed/', type: 'RSS', lang: 'fr' },
    { name: 'Zataz', url: 'https://www.zataz.com/feed/', type: 'RSS', lang: 'fr' },
    { name: 'Sekoia', url: 'https://blog.sekoia.io/feed/', type: 'RSS', lang: 'en' },
    { name: 'Intrinsec', url: 'https://blog.intrinsec.com/feed/', type: 'RSS', lang: 'fr' },
    // European & Government
    { name: 'ENISA', url: 'https://www.enisa.europa.eu/rss.xml', type: 'RSS', lang: 'en' },
    { name: 'CISA ICS', url: 'https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml', type: 'RSS', lang: 'en' },
    // Vendor Specific
    { name: 'Microsoft MSRC', url: 'https://api.msrc.microsoft.com/update-guide/rss', type: 'RSS', lang: 'en' },
    { name: 'FortiGuard', url: 'https://www.fortiguard.com/rss/ir.xml', type: 'RSS', lang: 'en' },
    { name: 'Ubuntu Security', url: 'https://ubuntu.com/security/notices/rss.xml', type: 'RSS', lang: 'en' },
    { name: 'Trend Micro', url: 'https://www.trendmicro.com/vinfo/us/security/rss/news', type: 'RSS', lang: 'en' },
    { name: 'Kaspersky Securelist', url: 'https://securelist.com/feed/', type: 'RSS', lang: 'en' },
    { name: 'Schneier on Security', url: 'https://www.schneier.com/feed/atom/', type: 'RSS', lang: 'en' }
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

async function fetchCisaKevCves() {
    console.log("Fetching CISA KEV Catalog (Exploited Vulnerabilities)...");
    try {
        const response = await axios.get("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json");
        const vulnerabilities = response.data.vulnerabilities || [];
        
        let newCves = 0;
        const recentVulns = vulnerabilities.slice(-200); // 200 dernières
        
        for (const vuln of recentVulns) {
            const dbCve = await prisma.cve.findUnique({
                where: { cveId: vuln.cveID }
            });

            if (!dbCve) {
                const pubDate = new Date(vuln.dateAdded);
                await prisma.cve.create({
                    data: {
                        cveId: vuln.cveID,
                        description: `[${vuln.vendorProject} - ${vuln.product}] ${vuln.vulnerabilityName} : ${vuln.shortDescription}`,
                        cvssScore: 10.0, // Failles activement exploitées
                        severity: "CRITICAL",
                        publishedAt: pubDate,
                        source: "CISA KEV"
                    }
                });
                newCves++;
            }
        }
        console.log(`[CISA KEV] Added ${newCves} new critical CVEs.`);
    } catch (error) {
        console.error("Error fetching CISA KEV:", error.message);
    }
}

async function fetchCirclCves() {
    console.log("Fetching CIRCL.LU CVE API...");
    try {
        const response = await axios.get("https://cve.circl.lu/api/last/100", { timeout: 15000 });
        const cves = Array.isArray(response.data) ? response.data : [];
        
        let newCves = 0;
        
        for (const vuln of cves) {
            if (!vuln.id || !vuln.id.startsWith("CVE-")) continue;
            
            const dbCve = await prisma.cve.findUnique({
                where: { cveId: vuln.id }
            });

            if (!dbCve) {
                const pubDate = new Date(vuln.Published || new Date());
                const cvss = typeof vuln.cvss === 'number' ? vuln.cvss : null;
                const severity = cvss >= 9.0 ? "CRITICAL" : cvss >= 7.0 ? "HIGH" : cvss >= 4.0 ? "MEDIUM" : "LOW";
                
                await prisma.cve.create({
                    data: {
                        cveId: vuln.id,
                        description: vuln.summary ? vuln.summary.slice(0, 500) : "Aucun résumé disponible",
                        cvssScore: cvss,
                        severity: severity,
                        publishedAt: pubDate,
                        source: "CIRCL.LU"
                    }
                });
                newCves++;
            }
        }
        console.log(`[CIRCL.LU] Added ${newCves} new standard CVEs.`);
    } catch (error) {
        console.error("Error fetching CIRCL CVEs:", error.message);
    }
}

async function cleanDatabase() {
    console.log("Cleaning database (duplicates and old records)...");
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const deleteOldArticles = await prisma.article.deleteMany({
            where: { publishedAt: { lt: ninetyDaysAgo } }
        });

        const deleteOldCves = await prisma.cve.deleteMany({
            where: { publishedAt: { lt: ninetyDaysAgo } }
        });

        console.log(`[DB Cleaner] Deleted ${deleteOldArticles.count} old articles and ${deleteOldCves.count} old CVEs.`);

        const duplicateTitles = await prisma.article.groupBy({
            by: ['title'],
            having: {
                title: { _count: { gt: 1 } }
            }
        });

        let dupesDeleted = 0;
        for (const group of duplicateTitles) {
            const articles = await prisma.article.findMany({
                where: { title: group.title },
                orderBy: { publishedAt: 'desc' }
            });

            const idsToDelete = articles.slice(1).map(a => a.id);
            if (idsToDelete.length > 0) {
                await prisma.article.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
                dupesDeleted += idsToDelete.length;
            }
        }
        
        console.log(`[DB Cleaner] Deleted ${dupesDeleted} duplicate articles based on exact title match.`);
    } catch (error) {
        console.error("Error during database cleaning:", error.message);
    }
}

let isSyncing = false;

async function main() {
    if (isSyncing) {
        console.log("Sync already in progress...");
        return;
    }
    isSyncing = true;
    console.log("Starting CyberVisor Crawler...");
    try {
        await fetchCirclCves();
        await fetchCisaKevCves();
        await fetchRssFeeds();
        await cleanDatabase();
        console.log("Crawler run finished. Waiting for next cycle...");
    } catch (e) {
        console.error("Critical crawler error:", e);
    } finally {
        isSyncing = false;
    }
}

// Serveur HTTP ultra-léger pour lancer la capture en direct (via un clic utilisateur)
const server = http.createServer(async (req, res) => {
    if (req.url === '/force-sync' && req.method === 'POST') {
        if (isSyncing) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Already syncing" }));
            return;
        }
        try {
            await main();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "completed" }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(4000, () => {
    console.log("Crawler HTTP API listening on port 4000");
});

main(); // Execute once immediately
setInterval(main, 5 * 60 * 1000); // And then every 5 minutes

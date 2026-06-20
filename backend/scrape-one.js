const axios = require('axios');

const STEAM_API_BASEURL = 'https://store.steampowered.com/api/appdetails';

async function scrapeGame(appid) {
    const response = await axios.get(STEAM_API_BASEURL, {
        params: { appids: appid, cc: 'us', 1: 'en' },
        timeout: 10000,
    });

    const entry = response.data?.[appid];

    if (!entry) {
        throw new Error(`No response entry for appid ${appid}`);
    }

    if (entry.success !== true) {
        throw new Error(`Steam reported failure for appid ${appid}`);
    }

    const data = entry.data;
    if (!data) {
        throw new Error(`Missing data payload for appid ${appid}`);
    }

    const title = data.name;

    if (data.is_free || !data.price_overview) {
        return {
            appid,
            title,
            isFree: true,
            priceCents: 0,
            currency: null,
            discountPercent: 0,
            scrapedAt: new Date().toISOString(),
        };
    }

    const priceOverview = data.price_overview;

    return {
        appid,
        title,
        isFree: false,
        priceCents: priceOverview.final,
        currency: priceOverview.currency,
        discountPercent: priceOverview.discount_percent,
        scrapedAt: new Date().toISOString(),
    };
}

async function main() {
    const argAppid = process.argv[2];

    const testAppids = argAppid ? [argAppid] : [
        '220',      // Half-Life 2
        '730',      // Counter-Strike 2
        '1245620'   // Elden Ring
    ];

    for (const appid of testAppids) {
        try {
            const result = await scrapeGame(appid);
            console.log(JSON.stringify(result, null, 2));
        } catch (err) {
            console.error(`FAILED appid ${appid}: ${err.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }
}

main();



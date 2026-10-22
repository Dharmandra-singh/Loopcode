// ReadNX serverless news feed.
// Uses public Google News RSS search results and links readers to the original publishers.
// No API key or third-party browser proxy is required.
const FEED = "https://news.google.com/rss/search";

const REGION_CODES = {
  "India":"IN","United States":"US","United Kingdom":"GB","Canada":"CA","Australia":"AU",
  "New Zealand":"NZ","Germany":"DE","France":"FR","Italy":"IT","Spain":"ES","Portugal":"PT",
  "Netherlands":"NL","Switzerland":"CH","Sweden":"SE","Norway":"NO","Denmark":"DK","Finland":"FI",
  "Ireland":"IE","Poland":"PL","Ukraine":"UA","Russia":"RU","Türkiye":"TR","Saudi Arabia":"SA",
  "UAE":"AE","Israel":"IL","Iran":"IR","Iraq":"IQ","Qatar":"QA","Egypt":"EG","South Africa":"ZA",
  "Nigeria":"NG","Kenya":"KE","Ethiopia":"ET","China":"CN","Japan":"JP","South Korea":"KR",
  "Singapore":"SG","Indonesia":"ID","Malaysia":"MY","Thailand":"TH","Vietnam":"VN",
  "Philippines":"PH","Bangladesh":"BD","Pakistan":"PK","Nepal":"NP","Sri Lanka":"LK",
  "Brazil":"BR","Mexico":"MX","Argentina":"AR","Chile":"CL"
};
const CATEGORY_TERMS = {
  "All":"news","Latest":"latest news","India":"India news","World":"world news",
  "Politics":"politics","Business":"business economy","Technology":"technology AI",
  "Sports":"sports","Science":"science","Education":"education"
};
const clean = value => String(value || "").replace(/&amp;/g,"&").replace(/&lt;/g,"<")
  .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").trim();

function tag(xml, name) {
  const match = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return match ? clean(match[1].replace(/<[^>]+>/g," ")) : "";
}
function safeUrl(value) {
  try { const u = new URL(value); return u.protocol === "https:" ? u.href : ""; }
  catch (_) { return ""; }
}
function regionQuery(region, category, language) {
  const cat = CATEGORY_TERMS[category] || "news";
  if (!region || region === "global" || region === "Global") return language === "hi" ? "दुनिया की ताज़ा खबरें" : "world latest news";
  if (region === "India") return language === "hi" ? "भारत की ताज़ा खबरें" : "India latest news";
  if (REGION_CODES[region]) return region + " " + cat;
  // Indian states/UTs: include India so same-named regions are not confused with overseas results.
  return region + " India " + (language === "hi" ? "ताज़ा खबरें" : cat);
}
async function getFeed(query, language, region, category) {
  const indian = !region || region === "global" || region === "Global" || region === "India" ||
    (!REGION_CODES[region]);
  const gl = REGION_CODES[region] || (indian ? "IN" : "US");
  const hl = language === "hi" ? "hi-IN" : (gl === "IN" ? "en-IN" : "en-US");
  const ceid = gl + ":" + (language === "hi" ? "hi" : "en");
  const url = FEED + "?q=" + encodeURIComponent(query) + "&hl=" + hl + "&gl=" + gl + "&ceid=" + ceid;
  const response = await fetch(url, { headers: { "Accept": "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error("RSS provider returned " + response.status);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m => {
    const body = m[1];
    const rawTitle = tag(body,"title");
    const source = tag(body,"source") || (rawTitle.match(/\s[-–|]\s([^–|]+)$/) || [,"News publisher"])[1].trim();
    const title = rawTitle.replace(/\s[-–|]\s[^–|]+$/,"").trim() || rawTitle;
    const link = safeUrl(tag(body,"link"));
    const pubDate = tag(body,"pubDate");
    if (!title || !link) return null;
    return {
      id: link,
      title,
      body: language === "hi" ? "मूल प्रकाशक की रिपोर्ट पढ़ने के लिए स्रोत खोलें।" : "Open the original publisher for the full report and context.",
      source,
      url: link,
      time: pubDate ? new Date(pubDate).toLocaleString(language === "hi" ? "hi-IN" : "en-IN", { dateStyle:"medium", timeStyle:"short" }) : "Latest",
      cat: CATEGORY_TERMS[category] || category || "News",
      tag: region === "global" ? "World" : region,
      region: region === "global" || !region ? "Global" : region,
      status: "Reported"
    };
  }).filter(Boolean);
  return items;
}
exports.handler = async event => {
  const params = event.queryStringParameters || {};
  const region = (params.region || "global").slice(0,100);
  const category = (params.category || "All").slice(0,40);
  const language = params.language === "hi" ? "hi" : "en";
  const query = regionQuery(region, category, language);
  try {
    const articles = await getFeed(query, language, region, category);
    const unique = [...new Map(articles.map(a => [a.url,a])).values()].slice(0,30);
    return {
      statusCode: 200,
      headers: {
        "Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"public, max-age=120, s-maxage=300",
        "X-Content-Type-Options":"nosniff"
      },
      body: JSON.stringify({ updated:new Date().toISOString(), region, category, language, articles:unique, source:"Google News RSS; original publishers linked" })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" },
      body: JSON.stringify({ error:"News feed temporarily unavailable", detail:"The RSS source could not be reached. Please retry shortly." })
    };
  }
};

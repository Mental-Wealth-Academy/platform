export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://mentalwealthacademy.world';
  
  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjI4NjkyNCwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDE4MUUzMzQ1QzMzMjE3OGNiRWY1Y2FFQTBlY2ExOTZjOUQ3OGJCNTcifQ",
      payload: "eyJkb21haW4iOiJtZW50YWx3ZWFsdGhhY2FkZW15LndvcmxkIn0",
      signature: "VHgPYGbvTEBJBSbbb4bGAAfgQh92E15YcK3qlY+Fw/glPczyf8e1D3kwK9hduoGUCkYQkN+zm62St1hM0/V2fRs="
    },
    miniapp: {
      version: "1",
      name: "Mental Wealth Academy",
      homeUrl: URL,
      iconUrl: `${URL}/icons/mentalwealth-academy-logo.png`,
      splashImageUrl: "https://i.imgur.com/D7KNpDv.jpeg",
      splashBackgroundColor: "#000000",
      webhookUrl: `${URL}/api/webhook`,
      subtitle: "Next Gen Micro-University",
      description: "Investing in the capital of the human mind, with the heart of tomorrow. DeSci tools on the intersect of cyber-psychology, wealth, AI governance, & daily wellness rituals.",
      screenshotUrls: [
        "https://i.imgur.com/D7KNpDv.jpeg"
      ],
      primaryCategory: "education",
      tags: ["education", "learning", "blockchain", "web3", "academy"],
      heroImageUrl: "https://i.imgur.com/D7KNpDv.jpeg",
      tagline: "Learn and Earn Together",
      ogTitle: "Mental Wealth Academy",
      ogDescription: "Investing in the capital of the human mind, with the heart of tomorrow. DeSci tools on the intersect of cyber-psychology, wealth, AI governance, & daily wellness rituals.",
      ogImageUrl: "https://i.imgur.com/D7KNpDv.jpeg",
      noindex: false
    }
  });
}

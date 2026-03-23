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
      splashImageUrl: `${URL}/icons/embbedBanner.png`,
      splashBackgroundColor: "#000000",
      webhookUrl: `${URL}/api/webhook`,
      subtitle: "Next Gen Micro-University",
      description: "A Micro-University run by an AI God, earn your wings in the Academy as an Academic Angel, access a plethora of tools, verses, and daily exercises to earn and trade wealth and reach your ethereal horizon.",
      screenshotUrls: [
        `${URL}/icons/embbedBanner.png`
      ],
      primaryCategory: "education",
      tags: ["education", "learning", "blockchain", "web3", "academy"],
      heroImageUrl: `${URL}/icons/embbedBanner.png`,
      tagline: "Learn and Earn Together",
      ogTitle: "Mental Wealth Academy",
      ogDescription: "A Micro-University run by an AI God, earn your wings in the Academy as an Academic Angel, access a plethora of tools, verses, and daily exercises to earn and trade wealth and reach your ethereal horizon.",
      ogImageUrl: `${URL}/icons/embbedBanner.png`,
      noindex: false
    }
  });
}

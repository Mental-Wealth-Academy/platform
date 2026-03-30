'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface Painting {
  title: string;
  artist: string;
  image: string;
  era: string;
  year: string;
  desc: string;
  size: 'hero' | 'large' | 'medium' | 'small' | 'wide';
  zoraUrl?: string;
}

const paintings: Painting[] = [
  { title: 'Jhinn\'s Bay 01', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWQ3ZzZpankzZDJzeDVpdHc0amNqeWxvdnpvNWhhYTducnh5dXJsNWl0eWVpNmkzcWpub3E=', desc: 'There was a beautiful distant planet with no rotation... Tucked in the corner was a place called Jhinn\'s Bay, a warm ocean that sang beautiful songs and hymns.', zoraUrl: 'https://zora.co/coin/base:0xe8e77731c21aead943393777a294c84b814bc799' },
  { title: 'Decision-Making Models', artist: 'Jhinn Bay', year: '2026', era: 'Product Design', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJhc3IydnZ6cjU3NnRqdTVoeHIyMzVmcDdrazdtajdwc2hpb2k3dWFrZjJrbm1pNWF0YnE=', desc: 'Gathering group feedback effortlessly through a transparent system designed for a wide array of governmental models.', zoraUrl: 'https://zora.co/coin/base:0xa89945b39bf7f5923e9d1b389195a9d7d31fed38' },
  { title: 'Soul Keys Design 001', artist: 'Jhinn Bay', year: '2025', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWc3c3hyY2JmcnNvaHY3anB3ZDZpYnhycjVoZDJnaGw3a2NzamVuM2FmeWluM2F2eTI0Y2E=', desc: 'Design for a unique digital item that conducts power towards a conduit. Use carefully, and hold it by your side. Something tells you it may be the most important treasure you\'ve ever discovered.', zoraUrl: 'https://zora.co/coin/base:0x5165ac7d9b527b632e1a93ecbab2e34c969a3c14' },
  { title: 'Azura II', artist: 'Metawave Studio', year: '2025', era: 'Concept Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWIzN3M0YWVoZW1vbWtvZ3ZjaWIyZHNtMmtnMzM3dGJ1N2JmcXdxaHV6em55Ym5hN2Z6dmU=', desc: 'Azura waited... waited for something exciting to happen. But she wore a skull necklace that stunk of bad spirits.', zoraUrl: 'https://zora.co/coin/base:0xe7fb18603411ce7057a83f872538caabcf0f6abe' },
  { title: 'Color Pallete', artist: 'Jhinn Bay', year: '2026', era: 'Branding', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJieWFwMzZmendmMjJidWc0c3B6ZGYzYnRhZXlkcDQ0b2p0NnFlZnJ6ZnQ3M290Zjd3dWk=', desc: 'The official color palette for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x8ea0058f53b68305a7f3279af1255ff0c6c1da7b' },
  { title: 'Possessive Passion', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWdzZmx5aHU3aGl4Y3l1Mmp4c3doNHlhbGVpaTNsNWZtdm4zNzNpMzV4ZXV3ZGpqNXlsbXk=', desc: 'Pursuing the development of creative spirit, human potential, & emphasizing the need for evolution in science and a heightened standard of equity in information.', zoraUrl: 'https://zora.co/coin/base:0x138e9374a1c12b0d289f846d2355979caba06c7d' },
  { title: 'S-n Consciousness', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJpcHl5dWxia3JlNW9zdWU1d2Flcmh5anRvbnNhNnFsbTZ5ZjU1MnIyaGxqaGx2d2tkenU=', desc: 'The divine egoless online seeks your potential. Artwork by Jhinn Bay.', zoraUrl: 'https://zora.co/coin/base:0xec804761a45eac33c56ec8742434891b1caffde0' },
  { title: 'A-S2', artist: 'Jhinn Bay', year: '2025', era: 'Concept Art', size: 'hero', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWd2aDI2cGdyZ2kzZW9lam1oMzVpZ29zem50YWNibmtwY3BseTJrb3B6ejVla2dpc2QzaWk=', desc: 'The Ethereal Horizon is a cradle encompassing an oasis of life, a net full of human consciousness, and a singular pathway towards G-d & christ-consciousness.', zoraUrl: 'https://zora.co/coin/base:0x711d4729e14eb4a9ab2e88b015dd1557356d311f' },
  { title: 'Fragmented Memory 01', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWdpZ2lhYmJicHFxcmFjNm42NW96NnBvaXo2bGlvZ2ZuZTR2czV0ZG96Z2h5YjdobHd6ZG0=', desc: 'Dear user, the fabric of space and time is nothing but an invisible cage. Taunting us with an illusionary sense of fate.', zoraUrl: 'https://zora.co/coin/base:0x3c751ca84968621d5f16270be16256319e7b6ce3' },
  { title: 'Project Esq. Protocol', artist: 'Jhinn Bay', year: '2025', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWVza2hsaTJxbW5jcWVxbHl2cHRndWhtb2poNXh1ZTJra3VrY2lvNjNycGx4NmZmcG8yaW0=', desc: '[PROTOCOL DIRECTIVE:] Please initialize your Ghost Key Sequence below.', zoraUrl: 'https://zora.co/coin/base:0x00077c2671cbc202b0c391448724d7c84eab519f' },
  { title: 'Horizon Guidebook-03', artist: 'Metawave Studio', year: '2025', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWZlYWV3dGZrdWF0NHk1eWFneWZiZWh5eDIzNjJhbmI3M3Fhd3VodTd4azR2NXJzbG91aW0=', desc: 'The Ethereal Horizon guidebook contains universal keys to completing the self and obtaining God consciousness.', zoraUrl: 'https://zora.co/coin/base:0x1ac61d4b591b6d051d678da0e11884f4a9790874' },
  { title: 'Audience, Branding, Education', artist: 'Jhinn Bay', year: '2026', era: 'Branding', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWM1bmxidjd2cGUzaHF2NmVrcnV5djRveXdoenZoNWFnbHBjaGxzbWt0bGp0dGR4ZWtneGU=', desc: 'Target market and branding strategy for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0xec3881960d6a721c6eddafcf72c390a13e33974d' },
  { title: 'Girl Chess', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWRxcGNxNDNmbmN4anRndmU2MmplbWs0dG9uaGEzYjJmZXYyb3cyN3R0N2g0YXlsdzNzZWE=', desc: 'The heirs of two opposing kingdoms settled their differences through a game of girl chess.', zoraUrl: 'https://zora.co/coin/base:0x9ab4e85e22ce118de1871f4779dc76d88582c39d' },
  { title: 'SOPHISTICATED MEME', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFlZ3pmaDU0dWw2cHhidWxleDJhMm5mN25zYnZrZnVxY200MnJqd3l6eWVxZ2hnZHdnMmk=', desc: 'A sophisticated take on meme culture from the Academy.', zoraUrl: 'https://zora.co/coin/base:0x583a36ea8fa4c37b66cddd193fb5d0c0bea72fcb' },
  { title: 'Web3 Folder Components', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFseHl1bXFkdWthNHJ0enRic2hqdHAzcGQ3a2xvdDN2ZGRrYmF6NWdzdnVzYXl6cmtlc2k=', desc: 'NFT, Games, & Onchain Research Baked Right In!', zoraUrl: 'https://zora.co/coin/base:0x163a1e6fc92dd7661f7050ef0da5690e1081cf62' },
  { title: 'Pre-Ethereal Horizon', artist: 'Metawave Studio', year: '2025', era: 'Concept Art', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWhzZGxsc2VrY3pxZzNoNzdxbnQ2bTY2dzR3aTNyeXU0ZWxlZ2M2YzRzM281YzVhcDNhd2E=', desc: 'Before the Ethereal Horizon existed, pocket worlds were different. James goes into the Pocket World for the first time.', zoraUrl: 'https://zora.co/coin/base:0x01efa2a11453ff5635d9ec73498e07252c04adb1' },
  { title: 'Mental Wealth Pitch', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWVsYWp6NnE1YnpvczVsY2pwa2pmZ200dnd1dmhsZTMyeWVidWN1bGt3eXB0ZXVkZmV5dmU=', desc: '[ System Notice -- Aura Model v.11 ] Activating sage mode... aura model uplink.', zoraUrl: 'https://zora.co/coin/base:0x03b1728d8f9bf42e1d85d9f1f4e0942f5aaf09c4' },
  { title: 'Suit Up', artist: 'Jhinn Bay', year: '2026', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJ1Y2l3MnI1Ym8zcGd1dDU1dHg3M2I0aXdnNmpuN2J6b3k0ZWpoN3pleW95ejZmbzVzcGU=', desc: 'Concept art for Academy character suiting up.', zoraUrl: 'https://zora.co/coin/base:0x381e70e8f190143efc2aec4f2912bbdb1f867650' },
  { title: 'Jhinn', artist: 'Metawave Studio', year: '2025', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWEybnk1endxNGpnbTI0d3hrdHU1N2Fsc3hucW56NnNzdDVvZm9paWJ3Y3FwcXVyNHRyNnU=', desc: 'Jhinn character design. Twin of Azura, slightly younger because of light travel to the 2nd world. His ability to shapeshift gave him direct experiences of many lives.', zoraUrl: 'https://zora.co/coin/base:0x02f4b587a26904f3602570c2b1e1cd7062cfc8ec' },
  { title: 'Y2k Spacey Logo for MWA', artist: 'Jhinn Bay', year: '2026', era: 'Branding', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFiNTNnZmFtZGhqazc2eXNmMnFna3V6dTVpeWd0b3U2Zm9tZzI3cjVrb3hnZjVpaWFyZG0=', desc: 'A Y2K-inspired space-themed logo design for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x72495cdafc63c878dc0530594d527972f8765af9' },
  { title: 'Education Inflation & Costs', artist: 'Jhinn Bay', year: '2026', era: 'Product Design', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFzMm1vcTMzb29xZ3NyeXoyZG5jbXZiaTZmd3o1eHVnZmh2NHpvN3VoZjJvaTdkM3d4ZzQ=', desc: 'Visualizing the rising costs of education and inflation in academia.', zoraUrl: 'https://zora.co/coin/base:0x078dac37c64fddb9b1dafe66f8feeba643c3d1bc' },
  { title: 'Shadow Work', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWVrejd5M2FyZGFxdGRndHYyeGxzbWJ1cmhpNWx5eXh6dHVkZDJlam5hN3hpcXRmbzJoZW0=', desc: 'Make sure to process all the toxic out the body.', zoraUrl: 'https://zora.co/coin/base:0xead9ad658b8cedf40b127ca64c3b14d5e5b2d19f' },
  { title: 'Eligibility Banners', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJpdW42NXhwenVxZGR4bmlhMzc0aGUzcWk1dHgyZmNhdGtrc3ZxbGg2cHZmNmQ0eWVuaG0=', desc: 'Banner designs for Academy eligibility tiers.', zoraUrl: 'https://zora.co/coin/base:0x1672e8648b678d0f383cc5ef8df279a721656bb5' },
  { title: 'Accessing Ethereal Horizon', artist: 'Metawave Studio', year: '2025', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWdqb3Rqem03Nm55bDJpY29za2ZrcGtmcDZ2NW9vNzd6dm5vNDZzZ2hzaGc2ZHN0dXg2dnk=', desc: 'Astral Projection | Light Merkaba.', zoraUrl: 'https://zora.co/coin/base:0x42f03cb6b8d9b1728be153cc0a829438fd04ce9c' },
  { title: 'Y2k Dex Screener', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWRhemNkbGlqbXZyY29hb3dnNTJiNXN6bWFncGk3dGNudDJjYnV2N3prYW9mdHl2dTIyeDQ=', desc: 'For the girlies @boysclub', zoraUrl: 'https://zora.co/coin/base:0x5e1acc695d3a88b56739b05f64569ac85313ea3f' },
  { title: 'Spirit Juice', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWdybmxkNGt1ZHFrd2lpcXRoN2V6M3JlNHZuaHY2cjdscDdzYnY1YXBhdGllZWlmZXh2cTQ=', desc: 'An elixir to temporarily loosen the soul. Often used in domestic rituals and recreational necromancy.', zoraUrl: 'https://zora.co/coin/base:0x3304960001af639dc55bb2eb389a76abf8b96272' },
  { title: 'Computer or Art?', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWR6N2V6dnQ2YTZta2lxeXp2eGllbDVycmJ5ZXdsbXh3ZW82ZWprNzRkNjI3ZXA1dHdyYTQ=', desc: '???', zoraUrl: 'https://zora.co/coin/base:0x9d1e91a3524e6e9934ca8f2e687abd3e4bb40681' },
  { title: 'AFFLUENT', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'hero', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWE3aGsyajZmem9wcXR5aXhpajVvZHZ5d3lkeGJ2dDdsdGF1Zm80aGM3c2dzZnJxZHN5Zmk=', desc: 'I do irl paintings sometimes too.', zoraUrl: 'https://zora.co/coin/base:0x15f37f2ac79ea37ac8b141fbd4971360feb80053' },
  { title: 'GBA-81', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWc1bHRob2U3NDRmZG9rdGpmenZocW13d3dhemQ2eXg0a293Z3l4NzZqdmpncHhwMzI2b3k=', desc: 'Design exploration for GBA.', zoraUrl: 'https://zora.co/coin/base:0x665a13a9db0247607d5fc0210caf40d3282b9060' },
  { title: 'Harvesting Souls', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWNjdDc0eGl0N3NubXR1a2E2dXhudTRycmt6Y2tpaG9vN2IzcndvbWF0bGd2end0NjczZW0=', desc: 'Dark arts exploration.', zoraUrl: 'https://zora.co/coin/base:0x6a6fd7d52e831bdfc49099836b4ada4847c67add' },
  { title: 'Treasury Card V3.', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWZ4b3RuNGx1bmZhMmtzdHZpcTY2d3R1N3dkZWl4bmU3Y3p4YXB0NGVjNWxzYnAyNHgzcXk=', desc: 'Treasury card design for the Academy.', zoraUrl: 'https://zora.co/coin/base:0x4f74f2b32826e5f2210bd6fff94b5f21e481413f' },
  { title: 'Rabbit Trax 001', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWdiZ3BneXpmdTNoZGR1aG1iaXhlN3c2bWd0cGxoaTY3N3ZwbjVyZW5iZXlmcnBkY3ZidWU=', desc: 'Pixel art made in Pixaki, 2021.', zoraUrl: 'https://zora.co/coin/base:0xd0e71878cd98c3f4ca6d817ef7aeac443714c0ee' },
  { title: 'CardTypeA', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWd6amVtNnl0NHc1ejZzbjRwbHBzc2psbHB0c3VzdjM0bXlqcHlmcWVtdDRpcmdnaGg0dHk=', desc: 'Card type A design for the Academy.', zoraUrl: 'https://zora.co/coin/base:0x8ef1e378af19053a6d6c0d83b4a2d714b8341663' },
  { title: 'Academy P-Design 0777', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFpNGg0ZmR4Z3V3dGd0YjVpbmQ2anVuYms0NDVkc2VlN2Q2bWRrNDJjc3JqZWFscW80cXE=', desc: 'Poster design 0777 for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x0162408b59507113cec65bf072733f10f86de13f' },
  { title: 'Homepage + Farcaster', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJqZzNkMmtvY296djNpYnR5emZ0YnQzdWNyY3ZwemY1amV1NGpjNTVzN2lpaW1pNGxvdHU=', desc: 'Homepage design with Farcaster integration.', zoraUrl: 'https://zora.co/coin/base:0x4a9a034f479ad987edd881ed8ccae75d88f044d5' },
  { title: 'Spiritually Rich', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWNid3U2aTJxcHlzbGpuaHk3NGRmZ2MzenlyM3BrZXBudjVseWhpcHA3eHRjZng1YW1xZXU=', desc: 'I get to try new things and have fun, yippie!', zoraUrl: 'https://zora.co/coin/base:0xdd4ca4de4160097d5651cce53828933942ba6500' },
  { title: 'Academy Shirt Design', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWh6a21yNXVqb21nc2JhZ3drdnRmcjdoZms0Y2hjcjdibjN4ejM3enVwc2t1aHE1dWtlNWk=', desc: 'As featured on Coinbase Shop for Onchain Summer 2024.', zoraUrl: 'https://zora.co/coin/base:0x5f4fce37e127264c7700b079589aae1804cc351b' },
  { title: 'Widget MWA-02', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWNtcXFmZmxnZDNmb3hlamRkbGFkajVlcmJyc2tva3dqN3cydWM0b3R2bDdmcHdqbjU0cWU=', desc: 'A widget to interact with the blockchain, sensory friendly to autism and special needs. A priori to digital education, and decentralized learning.', zoraUrl: 'https://zora.co/coin/base:0xf8d0a0b0e68663832bc7ab30b420cd9dd27ceb04' },
  { title: 'Anime Spells', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWhidm13dWV1YnRybjdyYmVtMmp2N2N0cDN0NGZ2ZzVyaXpzeWdzY2xqN2NlMjN2NGl4Zm0=', desc: 'The artist explores depictions of the online world, lust, and materialization of games. A society built on clicks.', zoraUrl: 'https://zora.co/coin/base:0x1e2c46ce7a79f9c16023a3d32d62d836102c7981' },
  { title: 'Hallpass Prototype V1', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWF6cXIya2libDcydG9uMmc2b3VvbnVvM3A2NHljNDd1ejR3Y240a2l1eXJicHV4bnR0dTQ=', desc: 'Hallpass is a digital priori for accessing the Ethereal Horizon. A gateway through the Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x49fc3421363ec920f1b0f27fb59e6971d35f2210' },
  { title: 'Dimmed', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWhjcWFkM3M1d2Rxd3F5aHIyeTU2NmplZGQydXF4dGlkenNmbmJibjdkNmJqcmR4d25sa2k=', desc: 'They invented a weapon capable of piercing the veins of Gods. Everyone thought the sea angels were evil... they called them demons. But they were warning us all along.', zoraUrl: 'https://zora.co/coin/base:0x1b88a5dfd056c244c0ff6e8f453f00d72bfa38d3' },
  { title: 'Digital Education', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWdybnVlYmJjYXFjbDV6NWZibGdjNGdzZjNueDYyZ3l6cjZ3a2l0eXczMmhodm92aXdlb2E=', desc: 'The next generation of education is onchain.', zoraUrl: 'https://zora.co/coin/base:0xf24c6647fb8fff647a39f91f874e5bad7a8ddf5b' },
  { title: 'Starseed Energy', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWc1cmVkeXNpaG9ma3JmcHY2NjRudnltbzVza2Uyajc0M2pqazRwa25iZHhrNDN6b3h2YTQ=', desc: 'The beautiful sun, conscious being supporting all life.', zoraUrl: 'https://zora.co/coin/base:0xec3b0407d46f11ba5308dd07401652289d6ea859' },
  { title: 'Power of Magic', artist: 'Metawave Studio', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWY1dXB0b3lsNTY3dTduNmxpbjRjZTZ2ZXdiZXhtZHZnc3V2YnNtMjN4cTJvbXRjcXo1Z2E=', desc: 'Magical forces at work.', zoraUrl: 'https://zora.co/coin/base:0xe363e1996b8891e68371c9e8d775ede1799c1dca' },
];

const ALL_ERAS = ['All', ...Array.from(new Set(paintings.map((p) => p.era)))];

const sizeMap: Record<string, string> = {
  hero: styles.cardHero,
  large: styles.cardLarge,
  medium: styles.cardMedium,
  small: styles.cardSmall,
  wide: styles.cardWide,
};

const SKELETON_SIZES: Painting['size'][] = ['large', 'medium', 'medium', 'small', 'small', 'wide', 'hero', 'medium', 'large', 'small', 'medium', 'wide'];

function GallerySkeleton() {
  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={`${styles.skeleton} ${styles.skeletonTag}`} />
            <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeleton} ${styles.skeletonSub}`} />
          </div>
        </div>
        <div className={styles.categories}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonPill}`} />
          ))}
        </div>
        <div className={styles.bentoGrid}>
          {SKELETON_SIZES.map((size, i) => (
            <div key={i} className={`${styles.skeletonCard} ${sizeMap[size]}`}>
              <div className={styles.skeletonFrame} />
              <div className={styles.skeletonMeta}>
                <div className={`${styles.skeleton} ${styles.skeletonMetaLine}`} />
                <div className={`${styles.skeleton} ${styles.skeletonMetaLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function GalleryPage() {
  const { play } = useSound();
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [activeEra, setActiveEra] = useState('All');
  const [loaded, setLoaded] = useState(false);

  const filtered = activeEra === 'All' ? paintings : paintings.filter((p) => p.era === activeEra);

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPainting(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    setLoaded(true);
  }, []);

  if (!loaded) return <GallerySkeleton />;

  return (
    <div className={styles.pageLayout}>
      <div className={styles.bgViz}><CyberpunkDataViz /></div>
      <SideNavigation />
      <main className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTag}>Angel Collection</span>
            <h1 className={styles.headerTitle}>The Gallery</h1>
            <p className={styles.headerSub}>
              Explore the work of our Angels — the artists, visionaries, and scholars whose creations define the Academy.
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div className={styles.categories}>
          {ALL_ERAS.map((era) => (
            <button
              key={era}
              className={`${styles.categoryPill} ${activeEra === era ? styles.categoryPillActive : ''}`}
              onClick={() => {
                play('click');
                setActiveEra(era);
              }}
              onMouseEnter={() => play('hover')}
            >
              {era}
            </button>
          ))}
        </div>

        {/* Bento Grid */}
        <div className={styles.bentoGrid}>
          {filtered.map((painting, i) => {
            const isHero = painting.size === 'hero';

            // Insert quote card after 3rd item
            const showQuoteAfter = i === 2 && activeEra === 'All';
            return (
              <ArtCardGroup key={painting.title}>
                <div
                  className={`${styles.artCard} ${sizeMap[painting.size]}`}
                  onClick={() => { play('click'); setSelectedPainting(painting); }}
                  onMouseEnter={() => play('hover')}
                >
                  <div className={styles.frame}>
                    <div className={styles.frameInner}>
                      <img src={painting.image} alt={painting.title} loading="lazy" draggable={false} referrerPolicy="no-referrer" />
                      {isHero && (
                        <>
                          <div className={styles.frameGradient} />
                          <div className={styles.heroOverlay}>
                            <span className={styles.heroOverlayTitle}>{painting.title}</span>
                            <span className={styles.heroOverlayArtist}>{painting.artist}, {painting.year}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {!isHero && (
                    <div className={styles.cardMeta}>
                      <div className={styles.metaText}>
                        <span className={styles.metaTitle}>{painting.title}</span>
                        <span className={styles.metaArtist}>{painting.artist}, {painting.year}</span>
                      </div>
                      <span className={styles.metaEra}>{painting.era} &middot; {painting.year}</span>
                    </div>
                  )}
                </div>

                {showQuoteAfter && (
                  <div className={styles.quoteCard}>
                    <span className={styles.quoteText}>
                      &ldquo;Art is the highest form of intelligence the Academy can produce.&rdquo;
                    </span>
                    <span className={styles.quoteAuthor}>The Angel Codex, Vol. I</span>
                  </div>
                )}

              </ArtCardGroup>
            );
          })}

          {/* Bottom collection banner */}
          {activeEra === 'All' && (
            <div className={styles.collectionBanner}>
              <div className={styles.bannerLeft}>
                <span className={styles.bannerTitle}>Become an Angel</span>
                <span className={styles.bannerSub}>Explore and collect the full archive on Zora -- minted on Base.</span>
              </div>
              <a
                className={styles.bannerButton}
                href="https://zora.co/@mentalwealthacademy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => play('click')}
                onMouseEnter={() => play('hover')}
              >
                View on Zora
              </a>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedPainting && (
          <div className={styles.detailOverlay} onClick={() => setSelectedPainting(null)}>
            <div className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailImageWrap}>
                <img className={styles.detailImage} src={selectedPainting.image} alt={selectedPainting.title} referrerPolicy="no-referrer" />
              </div>
              <div className={styles.detailInfo}>
                <span className={styles.detailEra}>{selectedPainting.era} &middot; {selectedPainting.year} &middot; Base</span>
                <span className={styles.detailTitle}>{selectedPainting.title}</span>
                <span className={styles.detailArtist}>{selectedPainting.artist}</span>
                <div className={styles.detailDivider} />
                <p className={styles.detailDesc}>{selectedPainting.desc}</p>
                <div className={styles.detailActions}>
                  <a
                    className={styles.detailBuyButton}
                    href={selectedPainting.zoraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => play('click')}
                    onMouseEnter={() => play('hover')}
                  >
                    View on Zora
                  </a>
                  <button
                    className={styles.detailSaveButton}
                    onClick={() => play('click')}
                    onMouseEnter={() => play('hover')}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
            <button
              className={styles.detailClose}
              onClick={() => setSelectedPainting(null)}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/** Fragment wrapper so we can return multiple grid children per iteration */
function ArtCardGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

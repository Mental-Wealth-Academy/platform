'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
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
  { title: 'Azura Daemon Model', artist: 'Jhinn Bay', year: '2026', era: 'Concept Art', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWM2cXR3YXc1aWV6a3Zpc2Jnc2g3MjJlazJsZ2ttcDduejd0b2cybHd0cno3cWt0b2l3YWE=', desc: 'The daemon circlet headset contains a magnetizer that attracts and supresses the daemon, a digital beast from another world. The sun necklace is a gift from Azura\'s sun star organization inside Osiris branch.', zoraUrl: 'https://zora.co/coin/base:0x7082385a3e663a441c2dc6d4bf5cfb329dd8e778' },
  { title: 'Decision-Making Models', artist: 'Jhinn Bay', year: '2026', era: 'Product Design', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJhc3IydnZ6cjU3NnRqdTVoeHIyMzVmcDdrazdtajdwc2hpb2k3dWFrZjJrbm1pNWF0YnE=', desc: 'Gathering group feedback effortlessly through a transparent system designed for a wide array of governmental models.', zoraUrl: 'https://zora.co/coin/base:0xa89945b39bf7f5923e9d1b389195a9d7d31fed38' },
  { title: 'Soul Keys Design 001', artist: 'Jhinn Bay', year: '2025', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWc3c3hyY2JmcnNvaHY3anB3ZDZpYnhycjVoZDJnaGw3a2NzamVuM2FmeWluM2F2eTI0Y2E=', desc: 'Design for a unique digital item that conducts power towards a conduit. Use carefully, and hold it by your side. Something tells you it may be the most important treasure you\'ve ever discovered.', zoraUrl: 'https://zora.co/coin/base:0x5165ac7d9b527b632e1a93ecbab2e34c969a3c14' },
  { title: 'Color Pallete', artist: 'Jhinn Bay', year: '2026', era: 'Branding', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJieWFwMzZmendmMjJidWc0c3B6ZGYzYnRhZXlkcDQ0b2p0NnFlZnJ6ZnQ3M290Zjd3dWk=', desc: 'The official color palette for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x8ea0058f53b68305a7f3279af1255ff0c6c1da7b' },
  { title: 'S-n Consciousness', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJpcHl5dWxia3JlNW9zdWU1d2Flcmh5anRvbnNhNnFsbTZ5ZjU1MnIyaGxqaGx2d2tkenU=', desc: 'The divine egoless online seeks your potential. Artwork by Jhinn Bay.', zoraUrl: 'https://zora.co/coin/base:0xec804761a45eac33c56ec8742434891b1caffde0' },
  { title: 'Dashboard UI', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWR1cGpzaTRucWtkM2xhbG1iNTVsZXB5Ym5haGdocmYzZ3U3M3h1bDRudHZkMmRnZDZmZmE=', desc: 'Imagine crypto, but more fun and beautiful.', zoraUrl: 'https://zora.co/coin/base:0xf1b0b7e987edf699ee265c8d914aa465f2d43ec4' },
  { title: 'Web3 Bounty Board', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWhxbDMzaTNuYXBnbXA3M3p4ZHBkbXFzYTN4a2huaGx5czR5cm5zbjVmZnJqdmxqZHkzbmk=', desc: 'What if you could easily see different types of tasks required from an organization and get paid automatically?', zoraUrl: 'https://zora.co/coin/base:0xc7277cb1d1b1b6ab462cf10f902fbbe21b796cc3' },
  { title: 'A-S2', artist: 'Jhinn Bay', year: '2025', era: 'Concept Art', size: 'hero', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWd2aDI2cGdyZ2kzZW9lam1oMzVpZ29zem50YWNibmtwY3BseTJrb3B6ejVla2dpc2QzaWk=', desc: 'The Ethereal Horizon is a cradle encompassing an oasis of life, a net full of human consciousness, and a singular pathway towards G-d & christ-consciousness.', zoraUrl: 'https://zora.co/coin/base:0x711d4729e14eb4a9ab2e88b015dd1557356d311f' },
  { title: 'Daemon Character Design', artist: 'Jhinn Bay', year: '2026', era: 'Concept Art', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWQzcXJpcHFnZmF6ajZnNnZtcW1uemhma2pxYWpjdWFybW42cnNoZm5pYzM3ZTRjNWFkank=', desc: 'Character design exploration for the Daemon entity within the Mental Wealth universe.', zoraUrl: 'https://zora.co/coin/base:0x30bfd47f8a6e45db0e809a59ee6bf20af621898e' },
  { title: 'Project Esq. Protocol', artist: 'Jhinn Bay', year: '2025', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWVza2hsaTJxbW5jcWVxbHl2cHRndWhtb2poNXh1ZTJra3VrY2lvNjNycGx4NmZmcG8yaW0=', desc: '[PROTOCOL DIRECTIVE:] Please initialize your Ghost Key Sequence below.', zoraUrl: 'https://zora.co/coin/base:0x00077c2671cbc202b0c391448724d7c84eab519f' },
  { title: 'Audience, Branding, Education', artist: 'Jhinn Bay', year: '2026', era: 'Branding', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWM1bmxidjd2cGUzaHF2NmVrcnV5djRveXdoenZoNWFnbHBjaGxzbWt0bGp0dGR4ZWtneGU=', desc: 'Target market and branding strategy for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0xec3881960d6a721c6eddafcf72c390a13e33974d' },
  { title: 'Pitch Deck 1', artist: 'Jhinn Bay', year: '2026', era: 'Branding', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWh3N3RlMnJqY2Rsd3J3bGt6eTVtZnl1YWt0bmFxZGZ0MmFmZzRnNTN4NnRnb240dzN6Z2k=', desc: 'The opening slide of the Mental Wealth Academy pitch deck.', zoraUrl: 'https://zora.co/coin/base:0x1762c3a1a4191a7d7ee1c8162c0432db17f4f143' },
  { title: 'SOPHISTICATED MEME', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFlZ3pmaDU0dWw2cHhidWxleDJhMm5mN25zYnZrZnVxY200MnJqd3l6eWVxZ2hnZHdnMmk=', desc: 'A sophisticated take on meme culture from the Academy.', zoraUrl: 'https://zora.co/coin/base:0x583a36ea8fa4c37b66cddd193fb5d0c0bea72fcb' },
  { title: 'Web3 Folder Components', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFseHl1bXFkdWthNHJ0enRic2hqdHAzcGQ3a2xvdDN2ZGRrYmF6NWdzdnVzYXl6cmtlc2k=', desc: 'NFT, Games, & Onchain Research Baked Right In!', zoraUrl: 'https://zora.co/coin/base:0x163a1e6fc92dd7661f7050ef0da5690e1081cf62' },
  { title: 'Mental Wealth Pitch', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWVsYWp6NnE1YnpvczVsY2pwa2pmZ200dnd1dmhsZTMyeWVidWN1bGt3eXB0ZXVkZmV5dmU=', desc: '[ System Notice -- Aura Model v.11 ] Activating sage mode... aura model uplink.', zoraUrl: 'https://zora.co/coin/base:0x03b1728d8f9bf42e1d85d9f1f4e0942f5aaf09c4' },
  { title: 'Suit Up', artist: 'Jhinn Bay', year: '2026', era: 'Concept Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJ1Y2l3MnI1Ym8zcGd1dDU1dHg3M2I0aXdnNmpuN2J6b3k0ZWpoN3pleW95ejZmbzVzcGU=', desc: 'Concept art for Academy character suiting up.', zoraUrl: 'https://zora.co/coin/base:0x381e70e8f190143efc2aec4f2912bbdb1f867650' },
  { title: 'Y2k Spacey Logo for MWA', artist: 'Jhinn Bay', year: '2026', era: 'Branding', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFiNTNnZmFtZGhqazc2eXNmMnFna3V6dTVpeWd0b3U2Zm9tZzI3cjVrb3hnZjVpaWFyZG0=', desc: 'A Y2K-inspired space-themed logo design for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x72495cdafc63c878dc0530594d527972f8765af9' },
  { title: 'Education Inflation & Costs', artist: 'Jhinn Bay', year: '2026', era: 'Product Design', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFzMm1vcTMzb29xZ3NyeXoyZG5jbXZiaTZmd3o1eHVnZmh2NHpvN3VoZjJvaTdkM3d4ZzQ=', desc: 'Visualizing the rising costs of education and inflation in academia.', zoraUrl: 'https://zora.co/coin/base:0x078dac37c64fddb9b1dafe66f8feeba643c3d1bc' },
  { title: 'Eligibility Banners', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJpdW42NXhwenVxZGR4bmlhMzc0aGUzcWk1dHgyZmNhdGtrc3ZxbGg2cHZmNmQ0eWVuaG0=', desc: 'Banner designs for Academy eligibility tiers.', zoraUrl: 'https://zora.co/coin/base:0x1672e8648b678d0f383cc5ef8df279a721656bb5' },
  { title: 'Branding Guide', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWRoYmF1ZjNubDVvMnF0aGtyd296ZWQ3ZTR1a2l2ZWlzeTUyZWl6dWJmbnlkZXVjd25rcnk=', desc: 'The official branding guide for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x93abc8ccc1829159347e7d0aa91b92b39cafcff8' },
  { title: 'Y2k Dex Screener', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWRhemNkbGlqbXZyY29hb3dnNTJiNXN6bWFncGk3dGNudDJjYnV2N3prYW9mdHl2dTIyeDQ=', desc: 'For the girlies @boysclub', zoraUrl: 'https://zora.co/coin/base:0x5e1acc695d3a88b56739b05f64569ac85313ea3f' },
  { title: 'Scatter Roast', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJnendhZWJsa2RleHVhNWIydW8zZmYzcDdkaXBkajV5cTRnc2VpcWN6Nm9rdmg1N2xueHE=', desc: 'Nice and slow... then all at once.', zoraUrl: 'https://zora.co/coin/base:0xfaab5d8b6b07dca6a511cf61fde1fbc18a602254' },
  { title: 'Computer or Art?', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWR6N2V6dnQ2YTZta2lxeXp2eGllbDVycmJ5ZXdsbXh3ZW82ZWprNzRkNjI3ZXA1dHdyYTQ=', desc: '???', zoraUrl: 'https://zora.co/coin/base:0x9d1e91a3524e6e9934ca8f2e687abd3e4bb40681' },
  { title: 'Web3 Game Deck', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWM0ZWxtM3VpcGd5eTUycnl5dHVvcnV4ZnNqYmlweTVrNDQ0ZTZwZWZrb3Fjd2Y0NDJucmk=', desc: 'A handheld device to play your favorite Web3 videogames.', zoraUrl: 'https://zora.co/coin/base:0xe65fc1af569e80197b0e340327476ef72e1e3523' },
  { title: 'GBA-81', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWc1bHRob2U3NDRmZG9rdGpmenZocW13d3dhemQ2eXg0a293Z3l4NzZqdmpncHhwMzI2b3k=', desc: 'Design exploration for GBA.', zoraUrl: 'https://zora.co/coin/base:0x665a13a9db0247607d5fc0210caf40d3282b9060' },
  { title: 'Hello! Hey There, Meow', artist: 'Jhinn Bay', year: '2025', era: 'Art', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJrNWE0cmF5anV3ZnlqdWF0ZG1vZWx6eWJxeDNjcndiZHhocWcyMmxreXJwMzc0eGJlNzQ=', desc: 'Positive Influence, Vibes, Matcha, Boba.', zoraUrl: 'https://zora.co/coin/base:0xaf5d908a28b395501c8cf832d7091028d6abd977' },
  { title: 'Treasury Card V3.', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWZ4b3RuNGx1bmZhMmtzdHZpcTY2d3R1N3dkZWl4bmU3Y3p4YXB0NGVjNWxzYnAyNHgzcXk=', desc: 'Treasury card design for the Academy.', zoraUrl: 'https://zora.co/coin/base:0x4f74f2b32826e5f2210bd6fff94b5f21e481413f' },
  { title: 'CardTypeA', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWd6amVtNnl0NHc1ejZzbjRwbHBzc2psbHB0c3VzdjM0bXlqcHlmcWVtdDRpcmdnaGg0dHk=', desc: 'Card type A design for the Academy.', zoraUrl: 'https://zora.co/coin/base:0x8ef1e378af19053a6d6c0d83b4a2d714b8341663' },
  { title: 'Academy P-Design 0777', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWFpNGg0ZmR4Z3V3dGd0YjVpbmQ2anVuYms0NDVkc2VlN2Q2bWRrNDJjc3JqZWFscW80cXE=', desc: 'Poster design 0777 for Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x0162408b59507113cec65bf072733f10f86de13f' },
  { title: 'Homepage + Farcaster', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWJqZzNkMmtvY296djNpYnR5emZ0YnQzdWNyY3ZwemY1amV1NGpjNTVzN2lpaW1pNGxvdHU=', desc: 'Homepage design with Farcaster integration.', zoraUrl: 'https://zora.co/coin/base:0x4a9a034f479ad987edd881ed8ccae75d88f044d5' },
  { title: 'Academy Shirt Design', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'small', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWh6a21yNXVqb21nc2JhZ3drdnRmcjdoZms0Y2hjcjdibjN4ejM3enVwc2t1aHE1dWtlNWk=', desc: 'As featured on Coinbase Shop for Onchain Summer 2024.', zoraUrl: 'https://zora.co/coin/base:0x5f4fce37e127264c7700b079589aae1804cc351b' },
  { title: 'Widget MWA-02', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'medium', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWNtcXFmZmxnZDNmb3hlamRkbGFkajVlcmJyc2tva3dqN3cydWM0b3R2bDdmcHdqbjU0cWU=', desc: 'A widget to interact with the blockchain, sensory friendly to autism and special needs. A priori to digital education, and decentralized learning.', zoraUrl: 'https://zora.co/coin/base:0xf8d0a0b0e68663832bc7ab30b420cd9dd27ceb04' },
  { title: 'Hallpass Prototype V1', artist: 'Jhinn Bay', year: '2025', era: 'Product Design', size: 'large', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWF6cXIya2libDcydG9uMmc2b3VvbnVvM3A2NHljNDd1ejR3Y240a2l1eXJicHV4bnR0dTQ=', desc: 'Hallpass is a digital priori for accessing the Ethereal Horizon. A gateway through the Mental Wealth Academy.', zoraUrl: 'https://zora.co/coin/base:0x49fc3421363ec920f1b0f27fb59e6971d35f2210' },
  { title: 'Digital Education', artist: 'Jhinn Bay', year: '2025', era: 'Branding', size: 'wide', image: 'https://scontent-iad4-1.choicecdn.com/-/rs:fit:1200:1200/f:best/aHR0cHM6Ly9tYWdpYy5kZWNlbnRyYWxpemVkLWNvbnRlbnQuY29tL2lwZnMvYmFmeWJlaWdybnVlYmJjYXFjbDV6NWZibGdjNGdzZjNueDYyZ3l6cjZ3a2l0eXczMmhodm92aXdlb2E=', desc: 'The next generation of education is onchain.', zoraUrl: 'https://zora.co/coin/base:0xf24c6647fb8fff647a39f91f874e5bad7a8ddf5b' },
];

const ALL_ERAS = ['All', ...Array.from(new Set(paintings.map((p) => p.era)))];

const sizeMap: Record<string, string> = {
  hero: styles.cardHero,
  large: styles.cardLarge,
  medium: styles.cardMedium,
  small: styles.cardSmall,
  wide: styles.cardWide,
};

export default function GalleryPage() {
  const { play } = useSound();
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [activeEra, setActiveEra] = useState('All');

  const filtered = activeEra === 'All' ? paintings : paintings.filter((p) => p.era === activeEra);

  // Close modal on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPainting(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className={styles.pageLayout}>
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

# Nosana GPU Research — Decentralized Compute for Deep Synthesis

Mental Wealth Academy's GPU Research system connects Azura directly to the Nosana network — a decentralized GPU marketplace built on Solana. When a topic demands more than pattern-matching against training data, Azura can borrow bare-metal compute from verified GPU providers and run a full open-source language model against it.

This is not a chatbot summarizing a search result. It is a 70-billion-parameter model performing multi-step academic synthesis on a dedicated GPU, spinning up on-demand, and returning a graduate-level research artifact directly into your conversation.

---

## Workflow

```mermaid
flowchart TD
    A([User: GPU Research button]) --> B{Popup 1 — Activate GPU Research?}
    B -- Cancel --> Z([Exit])
    B -- Select Model --> C{Popup 2 — Choose Compute Tier}

    C --> F[Focus\nLlama 3.1 8B · RTX 4070\n3,000 Shards]
    C --> D[Deep\nLlama 3.1 8B · RTX 4090\n8,000 Shards]
    C --> E[Elite\nLlama 3.1 70B · A100\n20,000 Shards]

    F --> G[POST /api/research/gpu\nDeduct shards atomically]
    D --> G
    E --> G

    G --> H[Nosana API\nCreate vLLM Deployment\nS3 model cache prefetch]
    H --> I[(DB: nosana_research_jobs\nstatus: provisioning)]
    I --> J[Chat: GPU warming up\nDrop your research topic]
    J --> K[User: Enter Research Topic]
    K --> L{GET /api/research/gpu/jobId\nPoll every 10s}

    L -- provisioning --> L
    L -- running — check vLLM health --> M{vLLM /health endpoint}
    M -- not ready --> L
    M -- ready --> N[Claim synthesis slot in DB\nstatus → synthesizing]
    N --> O[vLLM inference\nOpenAI-compatible API call]
    O --> P[Stop Nosana Deployment\nbest-effort cleanup]
    P --> Q[(DB: status → completed\nresult stored)]
    Q --> R([Azura: Research Report\nReturned to Chat])

    style A fill:#5168FF,color:#fff,stroke:none
    style R fill:#5168FF,color:#fff,stroke:none
    style Z fill:#444,color:#aaa,stroke:none
    style G fill:#1a1c28,color:#aaa,stroke:#5168FF
    style H fill:#1a1c28,color:#aaa,stroke:#5168FF
    style I fill:#1a1c28,color:#aaa,stroke:#5168FF
    style Q fill:#1a1c28,color:#aaa,stroke:#5168FF
    style O fill:#9724A6,color:#fff,stroke:none
```

---

## Compute Tiers

| Tier | Model | GPU | VRAM | Shard Cost | Best For |
|------|-------|-----|------|------------|----------|
| Focus | Llama 3.1 8B Instruct (AWQ) | RTX 4070 | 12 GB | 3,000 | Fast summaries, structured outlines |
| Deep | Llama 3.1 8B | RTX 4090 | 18 GB | 8,000 | Multi-source integration, domain synthesis |
| Elite | Llama 3.1 70B Instruct (AWQ) | A100 | 40 GB | 20,000 | Graduate-level synthesis, cross-domain research |

All models are loaded from Nosana's pre-cached S3 infrastructure — bypassing HuggingFace download latency. Models arrive pre-quantized (AWQ INT4) for maximum throughput without sacrificing analytical depth.

---

## Why GPU Research

Standard research mode in Mental Wealth Academy draws on Eliza's training corpus and x402-gated source discovery. That pipeline is efficient and well-suited for most queries. But there are categories of research where inference quality scales directly with model size — topics that require:

- Synthesizing across multiple competing theoretical frameworks
- Resolving contradictions in empirical literature
- Producing citations-grade academic prose at density
- Reasoning through complex causal chains across domains (neuroscience + behavioral economics + clinical intervention, for example)

Running this on a 70-billion-parameter model rather than a cloud API gives the system two properties that matter: the model runs on hardware you borrowed from a public network, and the weights are open. The reasoning is not black-boxed behind a corporate inference endpoint.

---

## Technical Architecture

**Job Lifecycle:**

1. Azura submits a `POST /deployments/create` to the Nosana API with an opinionated vLLM job definition — including GPU market address, model path, and an S3 resource mount pointing to Nosana's model cache.
2. The deployment enters a provisioning queue on the network. A verified GPU provider picks it up and boots the container.
3. The application polls the deployment status every 10 seconds. Once `RUNNING` with a live endpoint, it checks vLLM's `/health` route before committing to inference — this guards against the container being up but the model still loading.
4. A database lock (`status = 'synthesizing'`) prevents duplicate inference calls if polling overlaps. Only one request claims the synthesis slot.
5. After synthesis, the deployment is stopped immediately. You pay only for the time the model ran.

**Shards as Compute Budget:**

Shards are MWA's proof-of-understanding token. Spending them on GPU research is intentional friction — it signals that the topic is worth dedicated compute, not a casual query. The cost is calibrated to the actual GPU-hour expense of running each tier.

---

## Environment Variable

Add to your `.env`:

```
NOSANA_API_KEY=nos_xxx_your_key_here
```

Obtain a key at [deploy.nosana.com](https://deploy.nosana.com) → Account → API Keys.

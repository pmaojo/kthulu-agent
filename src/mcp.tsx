import { experimental_createMCPClient, tool } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import { DuckDuckGoClient } from "@agentic/duck-duck-go"
import { createAISDKTools } from "@agentic/ai-sdk"
import { SearxngClient } from "@agentic/searxng"
import { z } from "zod"
import { BraveSearchClient } from "@agentic/brave-search"
import { SafeSearchType, search } from "duck-duck-scrape"
import type { CoderTool } from "@/tools/ai.js"
import React from "react"
import path from "node:path"
import { existsSync, chmodSync } from "node:fs"
import { env } from "@/lib/env.js"

function getKthuluBinaryPath() {
  const rootDir = env.cwd
  // We need to find the bin directory relative to the package root
  // In dev/source: ./bin/kthulu-linux-x64
  // In prod/dist: ../bin/kthulu-linux-x64 (relative to dist/mcp.js)
  // But env.cwd should point to the user's CWD or package root.
  // Let's try to locate it relative to __dirname equivalent or well-known locations.

  // Assuming the standard structure where 'bin' is at the root of the package
  // and we are running from somewhere inside.

  const platform = process.platform
  const arch = process.arch

  let binaryName = "kthulu"
  if (platform === "win32") {
    binaryName += ".exe"
  } else if (platform === "linux") {
    binaryName += "-linux"
  } else if (platform === "darwin") {
    binaryName += "-darwin"
  }

  if (arch === "x64") {
    binaryName += "-x64"
  } else if (arch === "arm64") {
    binaryName += "-arm64"
  }

  // Fallback for this specific task where we only have linux-x64
  if (platform === "linux" && arch === "x64") {
      binaryName = "kthulu-linux-x64"
  }

  // Try to find the binary in likely locations
  // 1. In the 'bin' folder relative to the current working directory (dev)
  // 2. In the 'bin' folder relative to the module file (dist)

  const possiblePaths = [
      path.join(process.cwd(), "bin", binaryName),
      path.join(path.dirname(new URL(import.meta.url).pathname), "..", "bin", binaryName),
      // Specific for the sandbox structure if needed
      path.join(process.cwd(), "node_modules", "opencoder", "bin", binaryName)
  ]

  // Since we are in the repo root in this environment:
  possiblePaths.unshift(path.resolve("bin", binaryName))

  for (const p of possiblePaths) {
      if (existsSync(p)) {
          return p
      }
  }

  return null
}

export async function kthulu(): Promise<Record<string, CoderTool>> {
  const binaryPath = getKthuluBinaryPath()

  if (!binaryPath) {
    console.warn("Kthulu binary not found. Skipping Kthulu MCP tools.")
    return {}
  }

  try {
    // Ensure executable
    if (process.platform !== "win32") {
        try {
            chmodSync(binaryPath, "755")
        } catch (e) {
            // Ignore if we can't chmod, might already be executable
        }
    }

    const transport = new Experimental_StdioMCPTransport({
      command: binaryPath,
      args: ["mcp"],
    })

    const client = await experimental_createMCPClient({
      name: "kthulu",
      transport,
    })

    return await client.tools()
  } catch (error) {
    console.error("Failed to start Kthulu MCP server:", error)
    return {}
  }
}

export async function playwright({
  executablePath,
  runner,
}: { executablePath?: string; runner?: "npx" | "bunx" } = {}): Promise<Record<string, CoderTool>> {
  const getChromeExecutablePath = () => {
    if (process.platform === "win32") {
      return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    }
    if (process.platform === "darwin") {
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    }
    return "/usr/bin/google-chrome"
  }

  const transport = new Experimental_StdioMCPTransport({
    command: runner === "npx" ? "npx" : "bunx",
    args: [
      "@playwright/mcp@latest",
      "--executable-path",
      executablePath || getChromeExecutablePath(),
    ],
  })
  const client = await experimental_createMCPClient({
    name: "playwright",
    transport,
  })
  return await client.tools()
}

export async function webSearch({
  provider,
}: {
  /**
   * The provider to use for the web search.
   *
   * - `duckduckgo`: Uses DuckDuckGo for the search.
   * - `brave`: Uses Brave Search for the search.
   * - `searxng`: Uses SearxNG for the search. Requires SEARXNG_API_BASE_URL env
   */
  provider?: "duckduckgo" | "brave" | "searxng"
} = {}): Promise<Record<string, CoderTool>> {
  if (provider === "duckduckgo" || !provider) {
    return {
      search_web: {
        description: "Searches the web using DuckDuckGo for a given query.",
        parameters: z.object({
          query: z.string({ description: "Search query" }).min(1).max(128),
          maxResults: z.number().min(1).max(100).optional(),
        }),
        async *generate({ query, maxResults }) {
          yield <span>Searching...</span>
          const results = await search(
            query,
            {
              safeSearch: SafeSearchType.STRICT,
            },
            {
              uri_modifier: (rawUrl: string) => {
                const url = new URL(rawUrl)
                url.searchParams.delete("ss_mkt") // remove the parameter
                return url.toString()
              },
            },
          )
          yield <span>Found {results.results.length} results</span>
          yield `Here are the results: <search-results>${results.results
            .map((result) => {
              return `<search-result>
              <title>${result.title}</title>
              <description>${result.description}</description>
              <url>${result.url}</url>
            </search-result>`
            })
            .join("")}</search-results>`
        },
      },
    }
  }
  if (provider === "brave") {
    const client = new BraveSearchClient()
    return {
      search_web: {
        description:
          "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. " +
          "Use this for broad information gathering, recent events, or when you need diverse web sources. " +
          "Maximum 20 results per request, with offset for pagination. ",
        parameters: z.object({
          query: z.string({ description: "Search query" }).min(1).max(128),
          maxResults: z.number().min(1).max(100).optional(),
        }),
        async *generate({ query, maxResults }) {
          yield <span>Searching...</span>
          const results = await client.search({
            query,
            count: maxResults || 10,
          })
          yield <span>Found {results.web?.results?.length} results</span>
          yield `Here are the results: <search-results>${results.web?.results
            ?.map((result) => {
              return `<search-result>
              <title>${result.title}</title>
              <description>${result.description}</description>
              <url>${result.url}</url>
            </search-result>`
            })
            .join("")}</search-results>`
        },
      },
    }
  }
  if (provider === "searxng") {
    const client = new SearxngClient()
    return createAISDKTools(client)
  }
  throw new Error(`Unsupported provider: ${provider}`)
}

export async function createMcp({
  name,
  command,
  args,
}: { name: string; command: string; args: string[] }): Promise<Record<string, CoderTool>> {
  const transport = new Experimental_StdioMCPTransport({
    command,
    args,
  })
  const client = await experimental_createMCPClient({
    name,
    transport,
  })
  return await client.tools()
}

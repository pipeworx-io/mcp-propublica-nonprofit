# ProPublica Nonprofit Explorer — IRS Form 990 Data

ProPublica's Nonprofit Explorer aggregates IRS Form 990 filings: every nonprofit's tax return data with revenue, expenses, executive compensation, grants given/received, and program services. ~1.8M nonprofits indexed since 2001. Free, no auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Why this matters for AI agents

For nonprofit research, "where does this charity's money actually go?" questions, executive compensation analysis, or tracing grant flows between foundations and recipients — Form 990 is the canonical data, and ProPublica makes it queryable. Pair with [USAspending](/docs/reference/usaspending) (federal grants), [OpenFEC](/docs/reference/open-fec) (political activity), and [SEC EDGAR](/docs/reference/edgar) (corporate philanthropy).

Common flows:

- **Org lookup.** "Find Form 990 filings for X" → search by name or EIN.
- **Org detail.** Latest filing year financials: revenue, expenses, top compensation, program ratios.
- **Grant tracing.** "Who has the X Foundation funded?" → grants-given detail from Schedule I.
- **Officer compensation.** Top employees with salary, benefits, and other compensation.

## Auth

None. ProPublica's Nonprofit Explorer API is fully public, free.

## What Form 990 reveals

| Schedule | What it covers |
|---|---|
| Form 990 (full) | Required for orgs with ≥$200k revenue; full financial detail |
| Form 990-EZ | Smaller orgs ($50k-$200k revenue); abbreviated |
| Form 990-PF | Private foundations; grant-making detail |
| Form 990-N | Tiny orgs (<$50k); postcard filing only |
| Schedule I | Grants given to other orgs |
| Schedule J | Compensation detail for top-paid employees |
| Schedule O | Free-form supplementary disclosures (governance, mission detail) |

## Common pitfalls

- **990 lag.** Nonprofits file ~6-9 months after fiscal year-end. So 2024 fiscal-year data appears late 2025. Most-recent year is rarely current-year.
- **Calendar vs fiscal year.** Different orgs use different fiscal years. "FY 2023" may end in any month. Check the period-end date.
- **501(c)(3) vs (c)(4) vs (c)(6).** All file 990s but with different rules and political-activity restrictions. The classification matters more than total revenue for understanding what an org does.
- **Compensation reporting nuances.** Top compensation includes salary + bonuses + retirement contributions + nontaxable benefits. The headline "compensation" number can vary depending on schedule used.
- **Donor-advised funds (DAFs).** Money flowing through DAFs (Fidelity Charitable, Schwab Charitable) appears as the DAF receiving and granting — the actual donor and ultimate beneficiary may be opaque.
- **501(c)(4) "social welfare."** These can engage in some political activity but don't disclose donors. They show up here, but their political spending traces require [OpenFEC](/docs/reference/open-fec) cross-reference.
- **Address normalization.** Org addresses often have suite numbers, PO boxes, and registered-agent addresses that aren't where the org actually operates. Cross-reference geographic claims with state corporate registries.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "propublica-nonprofit": {
      "url": "https://gateway.pipeworx.io/propublica-nonprofit/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/propublica-nonprofit/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Propublica Nonprofit data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

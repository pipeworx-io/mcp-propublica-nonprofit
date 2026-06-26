interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * ProPublica Nonprofit MCP — ProPublica Nonprofit Explorer API (free, no auth)
 *
 * Tools:
 * - search_nonprofits: search nonprofits by name, optionally filter by state
 * - get_organization: get full details for a nonprofit by EIN
 * - get_filing: get a specific IRS filing for a nonprofit by EIN and tax period
 */


const BASE_URL = 'https://projects.propublica.org/nonprofits/api/v2';

// --- Raw API types ---

type RawOrg = {
  ein?: number | null;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  ntee_code?: string | null;
  raw_ntee_code?: string | null;
  subsection_code?: number | null;
  ruling_date?: string | null;
  tax_period?: number | null;
  asset_amount?: number | null;
  income_amount?: number | null;
  revenue_amount?: number | null;
  have_filings?: boolean | null;
  score?: number | null;
};

type RawFiling = {
  tax_prd?: number | null;
  tax_prd_yr?: number | null;
  formtype?: number | null;
  formtype_str?: string | null;
  pdf_url?: string | null;
  updated?: string | null;
  totrevenue?: number | null;
  totfuncexpns?: number | null;
  totassetsend?: number | null;
  totliabend?: number | null;
  pct_compnsatncurrofcrs?: number | null;
};

type RawOrgDetail = {
  organization?: RawOrg;
  filings_with_data?: RawFiling[];
  filings_without_data?: RawFiling[];
};

type SearchResponse = {
  total_results?: number | null;
  organizations?: RawOrg[];
};

// --- Formatters ---

function formatOrg(o: RawOrg) {
  return {
    ein: o.ein ?? null,
    name: o.name ?? null,
    city: o.city ?? null,
    state: o.state ?? null,
    ntee_code: o.ntee_code ?? null,
    subsection_code: o.subsection_code ?? null,
    ruling_date: o.ruling_date ?? null,
    tax_period: o.tax_period ?? null,
    asset_amount: o.asset_amount ?? null,
    income_amount: o.income_amount ?? null,
    revenue_amount: o.revenue_amount ?? null,
  };
}

function formatFiling(f: RawFiling) {
  return {
    tax_period: f.tax_prd ?? null,
    tax_period_year: f.tax_prd_yr ?? null,
    form_type: f.formtype_str ?? null,
    pdf_url: f.pdf_url ?? null,
    updated: f.updated ?? null,
    total_revenue: f.totrevenue ?? null,
    total_expenses: f.totfuncexpns ?? null,
    total_assets: f.totassetsend ?? null,
    total_liabilities: f.totliabend ?? null,
    pct_officer_compensation: f.pct_compnsatncurrofcrs ?? null,
  };
}

// --- Tool definitions ---

const tools: McpToolExport['tools'] = [
  {
    name: 'search_nonprofits',
    description:
      'Search US nonprofits by name. Returns EIN, name, city, state, revenue, assets, and NTEE code. Example: search_nonprofits("red cross", "NY"). Use get_organization with the EIN for full details.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name or keyword to search for (e.g., "habitat for humanity")' },
        state: { type: 'string', description: 'Two-letter state code to filter results (e.g., "CA", "NY")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_organization',
    description:
      'Get full nonprofit details by EIN (Employer Identification Number). Returns organization info plus recent IRS filings with revenue, expenses, and assets. Example: get_organization(131710957).',
    inputSchema: {
      type: 'object',
      properties: {
        ein: { type: 'number', description: 'Employer Identification Number (e.g., 131710957 for American Red Cross)' },
      },
      required: ['ein'],
    },
  },
  {
    name: 'get_filing',
    description:
      'Get a specific IRS filing for a nonprofit. Returns financial data from one tax period including revenue, expenses, assets, and liabilities. Example: get_filing(131710957, 202112).',
    inputSchema: {
      type: 'object',
      properties: {
        ein: { type: 'number', description: 'Employer Identification Number' },
        tax_period: { type: 'number', description: 'Tax period in YYYYMM format (e.g., 202112 for December 2021)' },
      },
      required: ['ein', 'tax_period'],
    },
  },
];

// --- callTool dispatcher ---

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_nonprofits':
      return searchNonprofits(args.query as string, args.state as string | undefined);
    case 'get_organization':
      return getOrganization(args.ein as number);
    case 'get_filing':
      return getFiling(args.ein as number, args.tax_period as number);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Tool implementations ---

async function searchNonprofits(query: string, state?: string) {
  const params = new URLSearchParams({ q: query });
  if (state) params.set('state[id]', state.toUpperCase());

  const res = await fetch(`${BASE_URL}/search.json?${params}`);
  if (!res.ok) throw new Error(`ProPublica Nonprofit API error: ${res.status}`);

  const data = (await res.json()) as SearchResponse;

  return {
    query,
    state: state?.toUpperCase() ?? null,
    total_results: data.total_results ?? 0,
    organizations: (data.organizations ?? []).map(formatOrg),
  };
}

async function getOrganization(ein: number) {
  const res = await fetch(`${BASE_URL}/organizations/${ein}.json`);
  if (res.status === 404) throw new Error(`No nonprofit found with EIN: ${ein}`);
  if (!res.ok) throw new Error(`ProPublica Nonprofit API error: ${res.status}`);

  const data = (await res.json()) as RawOrgDetail;

  return {
    organization: data.organization ? formatOrg(data.organization) : null,
    filings_with_data: (data.filings_with_data ?? []).map(formatFiling),
    filings_without_data: (data.filings_without_data ?? []).slice(0, 10).map(formatFiling),
  };
}

async function getFiling(ein: number, taxPeriod: number) {
  // The API uses the organization endpoint; we filter filings by tax_period
  const res = await fetch(`${BASE_URL}/organizations/${ein}.json`);
  if (res.status === 404) throw new Error(`No nonprofit found with EIN: ${ein}`);
  if (!res.ok) throw new Error(`ProPublica Nonprofit API error: ${res.status}`);

  const data = (await res.json()) as RawOrgDetail;
  const allFilings = [...(data.filings_with_data ?? []), ...(data.filings_without_data ?? [])];
  const filing = allFilings.find((f) => f.tax_prd === taxPeriod);

  if (!filing) {
    throw new Error(`No filing found for EIN ${ein} with tax period ${taxPeriod}`);
  }

  return {
    ein,
    organization_name: data.organization?.name ?? null,
    filing: formatFiling(filing),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;

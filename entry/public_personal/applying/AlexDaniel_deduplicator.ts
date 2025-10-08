import anyAscii from "npm:any-ascii@0.3.3";
import { distance } from "npm:fastest-levenshtein@1.0.16";

const URL = "https://vginsights.com/assets/samples/companies.txt";
const MAX_DISTANCE = 2;
const SUFFIXES_TO_REMOVE = [
  'entertainment', 'interactive', 'multimedia',
  'llc', 'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation', 'company', 'co',
  'gmbh', 'ab', 'sa', 'srl', 's.r.o.', 'partnership', 'lp', 'ltd.',
  'studio', 'studios', 'game', 'games', 'gaming', 'gamedev', 'dev', 'development',
  'publishing', 'publisher', 'productions', 'production', 'media',
  'software', 'tech', 'technology', 'digital', 'systems', 'solutions',
  'group', 'team', 'collective', 'works', 'factory', 'lab', 'labs'
]; // prettier-ignore
const suffixPattern = new RegExp(`\\b(${SUFFIXES_TO_REMOVE.join("|")})\\b$`, "i");

function normalize(name: string): string {
  return anyAscii(name.toLowerCase()).replace(suffixPattern, "").replace(/\s+/g, " ").trim();
}

interface Company {
  originalName: string;
  normalized: string;
  mainCompany: Company | null;
}

async function retrieveCompanies(): Promise<Company[]> {
  console.warn("Fetching companies data…");
  const response = await fetch(URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch companies data: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const companies: Company[] = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ originalName: line, normalized: normalize(line), mainCompany: null }));
  console.warn(`Found ${companies.length} companies`);
  return companies;
}

function lookSame(companyA: Company, companyB: Company): boolean {
  if (Math.abs(companyA.normalized.length - companyB.normalized.length) > MAX_DISTANCE) {
    return false;
  }
  const levenshteinDistance = distance(companies[i].normalized, companies[j].normalized);
  return levenshteinDistance <= MAX_DISTANCE;
}

async function deduplicate(companies: Company[]): Promise<Map<Company, Company[]>> {
  console.warn("Find duplicates and set main companies…");
  for (let i = 0; i < companies.length; i++) {
    for (let j = i + 1; j < companies.length; j++) {
      if (lookSame(companies[i], companies[j])) {
        companies[j].mainCompany = companies[i]?.mainCompany ?? companies[i];
      }
    }
    // would be really nice to remove this to make this function non-async =D
    await Deno.stderr.write(new TextEncoder().encode(`\rProcessed ${i + 1}/${companies.length} companies...`));
  }
  
  const groupedByMain = new Map<Company, Company[]>();
  for (const company of companies) {
    if (company.mainCompany) {
      groupedByMain.get(company.mainCompany)!.push(company);
    } else {
      groupedByMain.set(company, [company]);
    }
  }
  return groupedByMain;
}

function printResult(groupedByMain: Map<Company, Company[]>) {
  for (const [mainCompany, group] of groupedByMain) {
    if (group.length > 1) {
      console.log(`"${mainCompany.originalName}", variations:`);
      for (const company of group) {
        console.log(`  – "${company.originalName}"`);
      }
    }
  }
}

const companies = await retrieveCompanies();
const groupedByMain = await deduplicate(companies);
printResult(groupedByMain);

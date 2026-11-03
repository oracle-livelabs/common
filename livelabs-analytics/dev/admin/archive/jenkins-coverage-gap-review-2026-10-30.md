# Jenkins coverage gaps in the public LiveLabs cohort

**Review date:** 2026-10-30  
**Purpose:** Internal reconciliation note. This list is not rendered on the dashboard.

## Reconciliation

- Analytics public/published cohort: **894 records**, all with unique LiveLabs IDs, from the **2026-09-28** snapshot.
- Jenkins report: **918 catalog items**, **924 distinct item ID aliases**, from the run started **2026-10-15 12:11 UTC**. Its scope says “Full catalog requested”; run status is **failed**. The run reports 4,193 tests, 3,555 passed, 638 unexpected failures, and 19 source-scan-incomplete findings.
- Exact matching on each report item's primary LiveLabs ID finds 856 public records. Five more public records match a secondary catalog ID alias. This gives **861 matched and 33 unmatched**; it agrees with the active dashboard overlay.
- The findings CSV has 1,320 rows across 924 distinct item IDs. None of the 33 missing LiveLabs IDs has a findings row. One exact-title candidate appears under another ID.
- All 33 unmatched records are Workshops; no Sprint is unmatched.

The two source snapshots are 17 days apart. The Jenkins artifacts show which records were returned, but do not record why each absent record was omitted. A changed public/published state between snapshots and incomplete catalog enumeration are both plausible. The failed run and its 19 incomplete source scans make the report an imperfect coverage reference, but they do not prove that a particular missing workshop was skipped by the crawler.

## One cross-ID candidate to review

**Public record 4482 — Build Connected Finance Solutions with Oracle AI Database** shares WMS ID **12080** and an exact title with Jenkins item **4400**. In the Analytics snapshot, 4400 is **Private / Published** and 4482 is **Public / Published**. The current join uses LiveLabs ID aliases, so it correctly leaves 4482 unmatched. Do not transfer 4400's findings until the owner confirms that both IDs identify the same workshop version.

Five public rows that initially missed the primary Jenkins ID were already recovered through catalog ID aliases:

| Public LiveLabs ID | Title | Jenkins primary ID |
|---:|---|---:|
| 3719 | How to set up Active-Active database replication in Oracle GoldenGate 23ai Free | 3794 |
| 3940 | Install JDE on OCI | 725 |
| 4252 | Build a marketing analytics application powered by MySQL HeatWave | 3605 |
| 4267 | Deploy and configure MySQL Database Service powered by HeatWave and Oracle Analytics Cloud | 870 |
| 4358 | Zero Downtime Migration: Physical Online Migration with Direct Data Transfer to Co-Managed Databases in OCI | 3669 |

## Missing items

For 32 rows, the report contains no ID-alias or exact-title match and no item-specific exclusion reason. Review current WMS visibility and rerun the public catalog scan before assigning a more specific cause. The 4482 row is the cross-ID candidate described above.

| LiveLabs ID | WMS ID | Category | Title | Possible Jenkins ID | Finding |
|---:|---:|---|---|---:|---|
| 625 | 4741 | Database - MAA | Protect Your Data with Oracle Active Data Guard | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 696 | 684 | Database - MAA | New Generation Oracle RAC: HA and Scalability for your Applications | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 686 | 2820 | Database | Analyze, Query and Visualize Graphs in Oracle Database | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 3396 | 11169 | Database - MAA | Application Continuity made simple with Universal Connection Pool | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 3411 | 11145 | Database | Oracle Cloud Infrastructure Database Migration service - Online migration | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 3683 | 11388 | Database - Spatial and Graph | Pinpoint suspicious financial transactions with Oracle Spatial and Python | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 3607 | 11340 | Developers - Database | CloudBank - Building an App with Spring Boot and Mobile APIs with Oracle Database and Kubernetes | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 3938 | 11640 | Database - MAA | Set Up Unparalleled Data Protection with Oracle Active Data Guard 23ai | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 3971 | 11469 | Database | Pluggable Database for Development Agility | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4074 | 11763 | AI/ML Database | Oracle DB 23ai Vector Search using OCI Generative AI and Llama Index | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4081 | 11770 | APEX | Build a Book Club Application using Oracle APEX | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4238 | 11218 | OCI | Enhance DevOps practices with AI and MCP Agents | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4207 | 11907 | MySQL | HOL3065 Code Less, Do More: Accelerate App Development with MySQL | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4414 | 12089 | Other - I don't see it | LiveStack LiveLab Workshop - Build Retail Intelligence with Oracle AI Database 26ai | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4210 | 11885 | Developers - Database | Build A Better ChatBot - Using Oracle AI Optimizer and Toolkit to get the best performance out of RAG | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4470 | 11454 | Database - MAA | Oracle True Cache AI World 2026 | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4473 | 12158 | AI/ML Database | Unify the Data Layer with Oracle Autonomous AI Lakehouse | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4478 | 12159 | Database | Product Recall Assistant: Find Who May Be Affected with Oracle AI Database 26ai | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4449 | 12107 | AI Services | The Economics of AI: Why Model Routing Matters | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4454 | 12046 | Analytics | AI Data Platform - Build a GenIAI-Powered Release and Performance Analyst - Entertainment Industry | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4455 | 12107 | AI Services | The Economics of AI: Why Model Routing Matters | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4457 | 11850 | Database | Launch Context-Aware AI Applications with Oracle AI Database | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4451 | 12117 | Database | Telco Services LiveStack Workshop | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4467 | 12046 | Analytics | Assemble and Deploy an AI Agent using RAG and SQL | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4472 | 12106 | Other - I don't see it | Test - Hope 2 | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4458 | 12128 | ADB Dedicated | Test Workshop 4 Documentation | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4482 | 12080 | Database | Build Connected Finance Solutions with Oracle AI Database | 4400 | Exact-title candidate is Jenkins ID 4400 with the same WMS ID (12080), but that Analytics row is Private; review the identity before matching. |
| 4471 | 12106 | Other - I don't see it | Hope - Test 1 | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4488 | 11628 | APEX | APEX @University -  Build an Innovative Q&A Interface Powered by Generative AI with Oracle APEX | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4486 | 12162 | Database | How to create an OCI Compute Instance | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4498 | 12157 | Database - Spatial and Graph | [Grace Hopper] - Sandbox Test | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4499 | 12176 | Analytics | Oracle Analytics Service Excellence AIDP Event Environment | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |
| 4489 | 12106 | Other - I don't see it | Marco-Test-1 | — | No Jenkins catalog row matches this LiveLabs ID, any catalog ID alias, or the normalized title; the report has no item-level exclusion reason. |

## Source artifacts

- Analytics cohort: inventory/data/public_portfolio_inventory.json (from the 2026-09-28 inventory).
- Full Analytics inventory: inventory/data/portfolio_inventory.json.
- Jenkins catalog report: C:/Users/Lucian Brinzei/Desktop/jenkins reports/livelabs-qa-catalog-results-20261015T121124Z.json.
- Jenkins findings: C:/Users/Lucian Brinzei/Desktop/jenkins reports/livelabs-qa-findings-20261015T121124Z.csv.
- Priority taxonomy: C:/Users/Lucian Brinzei/Desktop/jenkins reports/issues types and severity ranking list.txt.

## Recommended follow-up

1. Refresh the public/published Analytics cohort and Jenkins report from the same date.
2. Compare the current public catalog against the 33 IDs above to separate visibility changes from scan omissions.
3. Review item 4482 with the content owner; add a reviewed ID mapping only if the two IDs are confirmed equivalent.
4. Keep unmatched records at their Analytics-only baseline until Jenkins evidence is confirmed.

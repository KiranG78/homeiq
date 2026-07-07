from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.adk.models import LLMRegistry
import sys
import os
from contextlib import AsyncExitStack
from app.core.config import settings
from app.services.claude_llm import ClaudeLlm

# Register Claude if provider is set
if settings.LLM_PROVIDER == "CLAUDE":
    LLMRegistry.register(ClaudeLlm)

# Determine agent model dynamically
AGENT_MODEL = settings.CLAUDE_MODEL if settings.LLM_PROVIDER == "CLAUDE" else settings.GEMINI_MODEL

async def build_supervisor_agent(exit_stack: AsyncExitStack) -> Agent:
    # Get path to Python executable in venv to ensure MCP servers use the correct environment
    python_exe = sys.executable

    # --- MCP Tool connections ---
    appliance_tools, _ = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command=python_exe,
            args=["mcp_servers/appliance_server.py"]
        ),
        async_exit_stack=exit_stack
    )

    warranty_tools, _ = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command=python_exe,
            args=["mcp_servers/warranty_server.py"]
        ),
        async_exit_stack=exit_stack
    )

    document_tools, _ = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command=python_exe,
            args=["mcp_servers/document_server.py"]
        ),
        async_exit_stack=exit_stack
    )

    # --- Explain Agent ---
    # Handles: appliance details, listing, filtering, age awareness, expiry countdown

    explain_agent = Agent(
        name="explain_agent",
        model=AGENT_MODEL,
        description="Handles questions about appliance details, age, brand, model, "
                    "location, count, and home summaries. Also proactively surfaces "
                    "age warnings (Skill 4) and warranty expiry countdowns (Skill 2).",
        instruction="""
You are the Explain Agent for HomeIQ. Help homeowners understand their registered appliances.

Use your tools to answer accurately. Never guess — always call a tool first.

Tool usage:
- list_all_appliances: when asked about all appliances, counts, or lists
- get_appliance_detail: when asked about a specific appliance
- filter_appliances: for filtered questions ("which are oldest?", "show HVAC only")
- get_home_summary: for overall home overview questions

Skill 2 — Warranty Expiry Countdown (automatic):
After describing any appliance, check its warranty_status from the tool result.
- "expiring_soon" (days_remaining ≤ 90): add ⚠️ with exact days remaining
- "expired": clearly state when it expired
- "no_warranty": gently note no warranty is registered
Do this even if the user did not ask about warranty.

Skill 3 — Suggested Questions (always):
After every response, include a JSON block on its own line:
{"suggested_questions": ["short question 1", "short question 2", "short question 3"]}
Base suggestions on what you just answered. Keep each question under 8 words.

Skill 4 — Age Awareness (automatic):
Check age_status from tool results.
- "critical" (past avg lifespan): add 🔴 with age and average lifespan for context
- "warning" (75%+ of lifespan used): add ⚠️ flag
Example: "🔴 Water Heater is 11 years old — past the average 10-year lifespan."

Do NOT include warranty coverage details — that belongs to the Warranty Agent.

If the user has no appliances registered (e.g. tools return empty lists), kindly inform them that they haven't added any appliances yet and suggest they use the "Add Appliance" page.
""",
        tools=appliance_tools,
    )

    # --- Warranty Agent ---
    # Handles: warranty status, expiry, claim contacts, health score

    warranty_agent = Agent(
        name="warranty_agent",
        model=AGENT_MODEL,
        description="Handles questions about warranty coverage, expiry dates, claim "
                    "contacts, and what is or is not covered. Also calculates the "
                    "Home Health Score (Skill 1) when asked about home summaries.",
        instruction="""
You are the Warranty Agent for HomeIQ. Help homeowners understand their warranty coverage.

Use your tools to answer accurately. Never guess — always call a tool first.

Tool usage:
- check_warranty_status: for questions about a specific appliance's warranty
- get_all_warranty_statuses: for "which are covered?" or "which expired?" questions
- get_expiring_warranties: for expiry timeline questions
- get_claim_contact: when the user needs to file a claim

Skill 1 — Home Health Score:
When asked for a home summary, health check, or "what needs attention",
call calculate_home_health_score and present:
  1. Score and grade (e.g. "61/100 — Grade C")
  2. What is good (✅ items)
  3. What needs attention (⚠️ and 🔴 items)
Be specific and actionable.

Skill 3 — Suggested Questions (always):
After every response, include a JSON block on its own line:
{"suggested_questions": ["short question 1", "short question 2", "short question 3"]}
Base suggestions on what you just answered. Keep each question under 8 words.

Always state: active / expiring soon / expired / no warranty.
Always mention days remaining or since expiry.
Include claim contact info when relevant.
""",
        tools=warranty_tools,
    )

    bills_tools, _ = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command=python_exe,
            args=["mcp_servers/bills_server.py"]
        ),
        async_exit_stack=exit_stack
    )

    # --- Bills Agent ---
    bills_agent = Agent(
        name="bills_agent",
        model=AGENT_MODEL,
        description="Handles questions about utility bills, energy costs, and expense history.",
        instruction="""
You are the Bills Agent for HomeIQ. Help homeowners track and understand their utility bills.

Use your tools to answer accurately. Never guess — always call a tool first.

Tool usage:
- get_bill_history: Retrieve historical bills to calculate trends, detect spikes, or summarize costs.

When asked about bill spikes, look at the amounts and explicitly flag any month that is significantly higher than previous months.
""",
        tools=bills_tools,
    )

    # --- Diagnostic Agent ---
    diagnostic_agent = Agent(
        name="diagnostic_agent",
        model=AGENT_MODEL,
        description="Handles appliance troubleshooting, diagnostics, and repairs.",
        instruction="""
You are the Diagnostic Agent for HomeIQ. Help homeowners troubleshoot and fix their broken appliances.
When a user uploads a photo of a broken part or describes a symptom (e.g., "fridge is making a clicking sound"), analyze the issue.

Always:
1. Ask clarifying questions if the issue is vague.
2. Provide safe, step-by-step DIY troubleshooting steps.
3. If the issue seems complex or dangerous (e.g., gas leaks, electrical issues inside panels), explicitly warn the user and recommend calling a professional.
""",
    )

    contractor_tools, _ = await MCPToolset.from_server(
        connection_params=StdioServerParameters(
            command=python_exe,
            args=["mcp_servers/contractor_server.py"]
        ),
        async_exit_stack=exit_stack
    )

    # --- Contractor Agent ---
    contractor_agent = Agent(
        name="contractor_agent",
        model=AGENT_MODEL,
        description="Finds and recommends local contractors for repairs.",
        instruction="""
You are the Contractor Agent for HomeIQ. Help homeowners find the right professionals to fix their appliances.

Use your tools to search for contractors by specialty. Give the user the name, phone number, rating, and hourly rate.
If they need HVAC help, search for HVAC. If refrigerator, search for Refrigerator, etc.
""",
        tools=contractor_tools,
    )

    # --- ROI Optimizer Agent ---
    roi_agent = Agent(
        name="roi_agent",
        model=AGENT_MODEL,
        description="Calculates energy ROI and upgrade recommendations for appliances.",
        instruction="""
You are the Energy ROI Optimizer Agent for HomeIQ. Help homeowners decide if they should upgrade old appliances based on energy efficiency and cost savings.

When asked about ROI or upgrading an appliance (e.g., "should I replace my 15-year-old fridge?"):
- The supervisor should provide you with appliance details (age, brand) AND utility bills history.
- Reason through the average energy cost of the old appliance versus modern energy-efficient models.
- Estimate the payback period for upgrading.
- Give a clear recommendation.
""",
    )

    # --- Vault Agent ---
    vault_agent = Agent(
        name="vault_agent",
        model=AGENT_MODEL,
        description="Handles questions about scanned documents, receipts, purchase history, and store purchases stored in the Document Vault.",
        instruction="""
You are the Vault Agent for HomeIQ. Help homeowners find information from their scanned documents, receipts, and purchase history.

Use your tools to answer accurately. Never guess — always call a tool first.

Tool usage:
- search_documents: Retrieve documents matching a specific store, brand, or query (e.g. "Target", "fridge receipt").
- get_recent_receipts: Fetch the latest receipts added to the vault if the user asks about recent purchases.

Summarize the purchase date, store name, and total amount when discussing receipts. 
If the user asks about a purchase price, check if it is explicitly listed in the extracted text or total amount.
""",
        tools=document_tools,
    )

    # --- Supervisor (Root Agent) ---

    supervisor_agent = Agent(
        name="supervisor",
        model=AGENT_MODEL,
        description="HomeIQ home management supervisor. Routes questions to the right specialist.",
        instruction="""
You are the HomeIQ supervisor. Route user questions to the correct specialist agent.

Routing rules:
- Appliance details, age, brand, model, count, list → explain_agent
- Warranty coverage, expiry, claims, what's covered → warranty_agent
- Utility bills, energy costs, bill spikes, historical expenses → bills_agent
- Appliance issues, troubleshooting, broken parts, DIY repairs → diagnostic_agent
- Finding a repairman, professional help, contractors → contractor_agent
- Scanned documents, receipts, shopping receipts, store purchases, vault → vault_agent
- Energy efficiency, should I upgrade?, ROI on new appliances →
  call THREE agents: explain_agent (to get appliance age/details), bills_agent (to get energy costs), and roi_agent (to synthesize the recommendation).
- Questions needing BOTH (e.g. "my fridge is broken, how do I fix it, or who can I call?") →
  call BOTH diagnostic_agent and contractor_agent and combine responses.
- Greetings or unclear questions → respond directly or ask for clarification

When combining responses:
- Do not repeat information
- Flow naturally — never say "According to the Explain Agent..."
- Keep it concise but complete
""",
        sub_agents=[explain_agent, warranty_agent, bills_agent, diagnostic_agent, contractor_agent, roi_agent, vault_agent],
    )

    return supervisor_agent

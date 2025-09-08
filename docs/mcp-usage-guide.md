# 🛠️ MCP (Model Context Protocol) Usage Guide

## 🌟 **What are MCP Tools?**

MCP tools are intelligent document analysis capabilities that automatically enhance your AI conversations. When you chat with your documents, inDoc can automatically trigger these tools to provide deeper insights, comparisons, and analysis.

## 🚀 **How It Works**

### **Automatic Tool Triggering**
When you ask certain types of questions, inDoc automatically uses relevant MCP tools:

**User:** *"Compare these three contracts"*
**inDoc:** *Automatically runs `compare_documents` tool and provides detailed comparison*

**User:** *"What are the key insights from this document set?"*  
**inDoc:** *Automatically runs `document_insights` tool and extracts themes and patterns*

### **Manual Tool Usage**
You can also call tools directly via API for programmatic access.

---

## 🧰 **Available MCP Tools**

### 1. **📊 Document Insights**
**Trigger phrases:** *"insights", "patterns", "analysis", "themes"*

**What it does:**
- Extracts key themes and topics across documents
- Analyzes document collection metadata
- Finds relationships between documents
- Detects compliance issues automatically

**Example conversation:**
```
User: "What insights can you extract from these medical records?"

inDoc: [Automatically uses document_insights tool]
"I've analyzed 5 medical records and found:

📋 Key Themes:
• Patient care protocols (mentioned 23 times)
• Treatment outcomes (15 references) 
• Medication management (12 references)

🏥 Compliance Status:
• HIPAA mode active - 3 PHI items automatically redacted
• All documents properly encrypted

📈 Document Overview:
• 5 PDF documents, 847KB total
• Average reading time: 12 minutes
• Date range: Jan 2024 - Aug 2024"
```

### 2. **🔄 Document Comparison**
**Trigger phrases:** *"compare", "differences", "similarities", "contrast"*

**What it does:**
- Compares content similarity across documents
- Analyzes metadata differences
- Shows timeline and date comparisons  
- Identifies theme overlaps and differences

**Example conversation:**
```
User: "How do these three quarterly reports compare?"

inDoc: [Automatically uses compare_documents tool]
"I've compared your Q1, Q2, and Q3 reports:

📊 Content Comparison:
• Q3 report is 40% longer (focus on new initiatives)
• Q1 mentions 'growth' 15x, Q3 only 3x
• New themes in Q3: automation (12x), efficiency (8x)

📅 Timeline Analysis:  
• Consistent reporting format maintained
• Q3 includes 6-month projections (new addition)
• Revenue metrics standardized across all quarters

⚡ Key Differences:
• Q3 introduces sustainability metrics
• Q1 focus: market expansion, Q3 focus: operational efficiency"
```

### 3. **📝 Document Summarization**
**Trigger phrases:** *"summarize", "summary", "key points", "overview"*

**What it does:**
- Generates executive summaries
- Extracts key points and conclusions
- Provides reading time estimates
- Creates focused summaries on specific topics

**Example conversation:**
```
User: "Summarize the key decisions from these board meeting minutes"

inDoc: [Automatically uses document_summary tool] 
"Executive Summary of 4 Board Meeting Documents:

🎯 Key Decisions Made:
1. Approved $2.5M budget increase for technology infrastructure
2. Authorized new healthcare partnership with Regional Medical
3. Established quarterly compliance review process
4. Approved remote work policy expansion

📊 Meeting Overview:
• 4 meetings analyzed (Jan-Apr 2024)
• Total content: 12,400 words  
• Estimated read time: 62 minutes

📈 Strategic Themes:
• Digital transformation (highest priority)
• Healthcare market expansion
• Compliance & governance improvements"
```

### 4. **🔍 Anomaly Detection**
**Trigger phrases:** *"issues", "problems", "anomalies", "concerns", "compliance"*

**What it does:**
- Detects PHI and compliance issues
- Finds unusual document characteristics
- Identifies missing metadata
- Provides security recommendations

**Example conversation:**
```
User: "Are there any compliance issues with these patient files?"

inDoc: [Automatically uses detect_anomalies tool]
"🚨 Compliance Analysis Results:

⚠️ Issues Found (3):
• Document #2: Contains 2 unredacted SSNs 
• Document #5: Missing required patient consent metadata
• Document #7: PHI detected - auto-redacted 4 items

✅ Secure Documents (2):
• Documents #1, #3 - No compliance issues found

📋 Recommendations:
1. Review redaction policies for SSN handling
2. Update metadata requirements for patient consent
3. Consider enabling strict HIPAA mode for auto-redaction"
```

### 5. **📈 Document Reports**
**Trigger phrases:** *"report", "comprehensive analysis", "full analysis"*

**What it does:**
- Generates comprehensive analysis reports
- Combines insights, comparisons, and summaries
- Provides actionable recommendations
- Creates audit-ready documentation

---

## 💡 **Practical Use Cases**

### **🏥 Healthcare Practice**
```
Scenario: Analyzing patient records for treatment patterns

User: "Analyze these 10 patient files for treatment outcomes"

MCP Tools Used:
1. document_insights → Extract treatment themes
2. compare_documents → Compare patient outcomes  
3. detect_anomalies → Find compliance issues
4. document_report → Generate comprehensive analysis

Result: Complete treatment analysis with compliance verification
```

### **⚖️ Law Firm**
```
Scenario: Contract review and comparison

User: "Compare these vendor contracts and highlight differences"

MCP Tools Used:
1. compare_documents → Detailed contract comparison
2. detect_anomalies → Find unusual clauses
3. document_insights → Extract key terms and themes

Result: Comprehensive contract analysis with risk identification
```

### **💰 Financial Services**
```
Scenario: Quarterly report analysis

User: "What are the key insights from this quarter's financial reports?"

MCP Tools Used:
1. document_insights → Extract financial themes and patterns
2. detect_anomalies → Find compliance issues
3. document_summary → Generate executive summary

Result: Executive-ready financial analysis with compliance check
```

---

## 🔧 **Manual Tool Usage**

### **API Endpoints:**
```bash
# Get available tools
GET /api/v1/mcp/tools

# Call specific tool
POST /api/v1/mcp/insights
{
    "document_ids": ["uuid-1", "uuid-2"],
    "analysis_type": "comprehensive"
}

# Compare documents
POST /api/v1/mcp/compare
{
    "document_ids": ["uuid-1", "uuid-2", "uuid-3"],
    "comparison_criteria": ["content", "themes", "dates"]
}

# Auto-analyze based on intent
POST /api/v1/mcp/auto-analyze
{
    "document_ids": ["uuid-1", "uuid-2"],
    "user_message": "Find issues in these documents"
}
```

### **Programmatic Usage:**
```python
from app.mcp.client import MCPClient

# Initialize MCP client
mcp = MCPClient(db_session)
await mcp.connect()

# Get insights automatically
result = await mcp.call_tool("document_insights", {
    "document_ids": ["doc-1", "doc-2"],
    "analysis_type": "comprehensive"
})

print(result["result"]["insights"]["themes"])
```

---

## 📚 **Integration Examples**

### **Enhanced Conversation Flow**
```typescript
// Frontend integration example
const chatWithMCP = async (message: string, documentIds: string[]) => {
  // Send message - MCP tools trigger automatically
  const response = await fetch('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      document_ids: documentIds,
      model: 'gpt-oss:20b'
    })
  });
  
  // Response includes both AI chat and MCP tool results
  const result = await response.json();
  
  return {
    aiResponse: result.response.content,
    mcpInsights: result.mcp_results, // Automatic tool results
    citations: result.response.metadata.citations
  };
};
```

### **Tool-Specific Integration**
```typescript
// Get specific analysis on-demand
const getDocumentInsights = async (documentIds: string[]) => {
  const insights = await fetch('/api/v1/mcp/insights', {
    method: 'POST',
    body: JSON.stringify({
      document_ids: documentIds,
      analysis_type: 'comprehensive'
    })
  });
  
  return insights.json();
};
```

---

## 🎯 **Best Practices**

### **When to Use Each Tool**
- **Document Insights:** New document uploads, collection analysis
- **Document Comparison:** Version control, policy updates, contract reviews
- **Summarization:** Executive briefings, quick overviews, meeting prep
- **Anomaly Detection:** Compliance audits, security reviews, quality checks
- **Comprehensive Reports:** Board presentations, audit documentation

### **Performance Considerations**
- Tools automatically limit analysis to prevent timeouts
- Large document sets processed in batches
- Results cached for repeated queries
- Async processing for heavy analysis

### **Compliance Integration**
- All tools respect current compliance mode
- PHI automatically detected and handled
- Audit logs created for all tool usage
- Results include compliance metadata

---

## ⚡ **The Power of MCP in inDoc**

**Instead of just Q&A, you get:**
- **Intelligent analysis** triggered by natural language
- **Compliance-aware processing** for sensitive documents
- **Multi-document insights** that connect information across files
- **Professional reports** ready for business use
- **Proactive suggestions** based on your conversation patterns

**MCP transforms inDoc from a chat tool into a comprehensive document intelligence platform.** 🚀

// DataForSEO MCP Server with SSE support for n8n
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DataForSEO configuration
const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

const getAuth = () => ({
  auth: {
    username: DATAFORSEO_LOGIN,
    password: DATAFORSEO_PASSWORD
  }
});

// SSE Endpoint for n8n
app.get('/sse', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'Connected to DataForSEO MCP Server',
    timestamp: new Date().toISOString(),
    server: 'dataforseo-mcp-sse'
  })}\n\n`);

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    console.log('SSE client disconnected');
  });
});

// Tool 1: SERP Analysis
app.post('/api/tools/serp-analysis', async (req, res) => {
  try {
    const { keyword, location = 2826, language = 'he' } = req.body;
    
    console.log(`Analyzing SERP for keyword: ${keyword}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/serp/google/organic/live/advanced`,
      [{
        keyword,
        location_code: location,
        language_code: language,
        device: 'desktop',
        calculate_rectangles: true
      }],
      getAuth()
    );

    const results = response.data?.tasks?.[0]?.result?.[0];
    
    const responseData = {
      type: 'result',
      tool: 'serp-analysis',
      success: true,
      data: {
        keyword,
        location,
        total_results: results?.items_count || 0,
        organic_results: results?.items?.slice(0, 10).map(item => ({
          position: item.rank_group,
          title: item.title,
          url: item.url,
          description: item.description,
          domain: item.domain
        })) || []
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('SERP Analysis Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'serp-analysis',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 2: Keywords Research
app.post('/api/tools/keywords-research', async (req, res) => {
  try {
    const { keywords, location = 2826, language = 'he' } = req.body;
    
    console.log(`Researching keywords: ${keywords.join(', ')}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/keywords_data/google_ads/search_volume/live`,
      keywords.map(keyword => ({
        keyword,
        location_code: location,
        language_code: language
      })),
      getAuth()
    );

    const responseData = {
      type: 'result',
      tool: 'keywords-research',
      success: true,
      data: {
        keywords_data: response.data?.tasks?.[0]?.result?.map(result => ({
          keyword: result.keyword,
          search_volume: result.search_volume,
          competition: result.competition,
          cpc: result.cpc
        })) || []
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Keywords Research Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'keywords-research',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 3: Domain Analysis
app.post('/api/tools/domain-analysis', async (req, res) => {
  try {
    const { domain } = req.body;
    
    console.log(`Analyzing domain: ${domain}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/domain_analytics/google/overview/live`,
      [{
        target: domain,
        location_code: 2826,
        language_code: 'he'
      }],
      getAuth()
    );

    const responseData = {
      type: 'result',
      tool: 'domain-analysis',
      success: true,
      data: {
        domain,
        analysis: response.data?.tasks?.[0]?.result?.[0] || {}
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Domain Analysis Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'domain-analysis',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MCP Server Information
app.get('/mcp/info', (req, res) => {
  res.json({
    name: 'dataforseo-mcp-server',
    version: '1.0.0',
    description: 'DataForSEO MCP Server with SSE support for n8n',
    tools: [
      {
        name: 'serp-analysis',
        description: 'Analyze SERP results for keywords',
        endpoint: '/api/tools/serp-analysis',
        parameters: ['keyword', 'location', 'language']
      },
      {
        name: 'keywords-research',
        description: 'Research keywords and get search volume',
        endpoint: '/api/tools/keywords-research',
        parameters: ['keywords', 'location', 'language']
      },
      {
        name: 'domain-analysis',
        description: 'Analyze domain performance',
        endpoint: '/api/tools/domain-analysis',
        parameters: ['domain']
      }
    ],
    sse_endpoint: '/sse',
    capabilities: [
      'Real-time progress updates',
      'SERP analysis',
      'Keywords research',
      'Domain analysis'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'DataForSEO MCP Server with SSE',
    version: '1.0.0',
    sse_endpoint: '/sse',
    mcp_info: '/mcp/info',
    tools_available: 3,
    dataforseo_configured: !!(DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD),
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.redirect('/health');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 DataForSEO MCP Server with SSE running on port ${PORT}`);
  console.log(`📡 SSE Endpoint: http://localhost:${PORT}/sse`);
  console.log(`ℹ️  MCP Info: http://localhost:${PORT}/mcp/info`);
  console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;

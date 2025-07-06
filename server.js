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

// Tool 4: Backlinks Analysis
app.post('/api/tools/backlinks-analysis', async (req, res) => {
  try {
    const { domain, limit = 100 } = req.body;
    
    console.log(`Analyzing backlinks for: ${domain}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/backlinks/summary/live`,
      [{
        target: domain,
        include_subdomains: true,
        limit: limit
      }],
      getAuth()
    );

    const responseData = {
      type: 'result',
      tool: 'backlinks-analysis',
      success: true,
      data: {
        domain,
        backlinks: response.data?.tasks?.[0]?.result?.[0] || {}
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Backlinks Analysis Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'backlinks-analysis',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 5: Competitor Research
app.post('/api/tools/competitor-research', async (req, res) => {
  try {
    const { domain, limit = 10 } = req.body;
    
    console.log(`Researching competitors for: ${domain}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/domain_analytics/google/competitors/live`,
      [{
        target: domain,
        location_code: 2826,
        language_code: 'he',
        limit: limit
      }],
      getAuth()
    );

    const responseData = {
      type: 'result',
      tool: 'competitor-research',
      success: true,
      data: {
        domain,
        competitors: response.data?.tasks?.[0]?.result?.[0]?.items || []
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Competitor Research Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'competitor-research',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 6: Keyword Ideas
app.post('/api/tools/keyword-ideas', async (req, res) => {
  try {
    const { seed_keyword, location = 2826, language = 'he', limit = 100 } = req.body;
    
    console.log(`Getting keyword ideas for: ${seed_keyword}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/keywords_data/google_ads/keywords_for_keywords/live`,
      [{
        keywords: [seed_keyword],
        location_code: location,
        language_code: language,
        limit: limit
      }],
      getAuth()
    );

    const responseData = {
      type: 'result',
      tool: 'keyword-ideas',
      success: true,
      data: {
        seed_keyword,
        keyword_ideas: response.data?.tasks?.[0]?.result?.[0]?.items || []
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Keyword Ideas Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'keyword-ideas',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 7: SERP Features
app.post('/api/tools/serp-features', async (req, res) => {
  try {
    const { keyword, location = 2826, language = 'he' } = req.body;
    
    console.log(`Analyzing SERP features for: ${keyword}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/serp/google/organic/live/advanced`,
      [{
        keyword,
        location_code: location,
        language_code: language,
        device: 'desktop',
        calculate_rectangles: true,
        include_serp_info: true
      }],
      getAuth()
    );

    const results = response.data?.tasks?.[0]?.result?.[0];
    
    const responseData = {
      type: 'result',
      tool: 'serp-features',
      success: true,
      data: {
        keyword,
        serp_features: results?.feature_snippets || {},
        knowledge_graph: results?.knowledge_graph || null,
        paid_results: results?.paid || [],
        featured_snippet: results?.featured_snippet || null,
        people_also_ask: results?.people_also_ask || []
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('SERP Features Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'serp-features',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 8: Rank Tracking
app.post('/api/tools/rank-tracking', async (req, res) => {
  try {
    const { domain, keywords, location = 2826, language = 'he' } = req.body;
    
    console.log(`Tracking ranks for domain: ${domain}`);
    
    const results = await Promise.all(
      keywords.map(async (keyword) => {
        const response = await axios.post(
          `${DATAFORSEO_BASE_URL}/serp/google/organic/live/advanced`,
          [{
            keyword,
            location_code: location,
            language_code: language,
            device: 'desktop'
          }],
          getAuth()
        );
        
        const serpResults = response.data?.tasks?.[0]?.result?.[0];
        const position = serpResults?.items?.findIndex(item => 
          item.url?.includes(domain) || item.domain?.includes(domain)
        ) + 1 || null;

        return {
          keyword,
          position: position || 'Not in top 100',
          url: position ? serpResults.items[position - 1].url : null,
          title: position ? serpResults.items[position - 1].title : null
        };
      })
    );

    const responseData = {
      type: 'result',
      tool: 'rank-tracking',
      success: true,
      data: {
        domain,
        rankings: results,
        summary: {
          total_keywords: keywords.length,
          keywords_ranking: results.filter(r => r.position !== 'Not in top 100').length,
          avg_position: results
            .filter(r => r.position !== 'Not in top 100')
            .reduce((sum, r) => sum + r.position, 0) / 
            results.filter(r => r.position !== 'Not in top 100').length || 0
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Rank Tracking Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'rank-tracking',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 9: Content Analysis
app.post('/api/tools/content-analysis', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log(`Analyzing content for: ${url}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/on_page/content_parsing/live`,
      [{
        url: url,
        enable_javascript: true,
        load_resources: true
      }],
      getAuth()
    );

    const responseData = {
      type: 'result',
      tool: 'content-analysis',
      success: true,
      data: {
        url,
        content_analysis: response.data?.tasks?.[0]?.result?.[0] || {}
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Content Analysis Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'content-analysis',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Tool 10: Technical SEO Audit
app.post('/api/tools/tech-seo-audit', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log(`Running technical SEO audit for: ${url}`);
    
    const response = await axios.post(
      `${DATAFORSEO_BASE_URL}/on_page/lighthouse/live/json`,
      [{
        url: url,
        categories: ['performance', 'accessibility', 'best_practices', 'seo'],
        audits: ['first-contentful-paint', 'largest-contentful-paint', 'speed-index']
      }],
      getAuth()
    );

    const responseData = {
      type: 'result',
      tool: 'tech-seo-audit',
      success: true,
      data: {
        url,
        lighthouse_audit: response.data?.tasks?.[0]?.result?.[0] || {}
      },
      timestamp: new Date().toISOString()
    };

    res.json(responseData);
  } catch (error) {
    console.error('Technical SEO Audit Error:', error.message);
    res.status(500).json({
      type: 'error',
      tool: 'tech-seo-audit',
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
      },
      {
        name: 'backlinks-analysis',
        description: 'Analyze domain backlinks profile',
        endpoint: '/api/tools/backlinks-analysis',
        parameters: ['domain', 'limit']
      },
      {
        name: 'competitor-research',
        description: 'Find domain competitors',
        endpoint: '/api/tools/competitor-research',
        parameters: ['domain', 'limit']
      },
      {
        name: 'keyword-ideas',
        description: 'Generate keyword ideas from seed keyword',
        endpoint: '/api/tools/keyword-ideas',
        parameters: ['seed_keyword', 'location', 'language', 'limit']
      },
      {
        name: 'serp-features',
        description: 'Analyze SERP features and snippets',
        endpoint: '/api/tools/serp-features',
        parameters: ['keyword', 'location', 'language']
      },
      {
        name: 'rank-tracking',
        description: 'Track domain rankings for multiple keywords',
        endpoint: '/api/tools/rank-tracking',
        parameters: ['domain', 'keywords', 'location', 'language']
      },
      {
        name: 'content-analysis',
        description: 'Analyze page content and structure',
        endpoint: '/api/tools/content-analysis',
        parameters: ['url']
      },
      {
        name: 'tech-seo-audit',
        description: 'Technical SEO audit using Lighthouse',
        endpoint: '/api/tools/tech-seo-audit',
        parameters: ['url']
      }
    ],
    sse_endpoint: '/sse',
    capabilities: [
      'Real-time progress updates',
      'SERP analysis and features',
      'Keywords research and ideas',
      'Domain and competitor analysis',
      'Backlinks analysis',
      'Rank tracking',
      'Content analysis',
      'Technical SEO auditing',
      'Lighthouse performance metrics'
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
    tools_available: 10,
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

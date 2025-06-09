FROM node:20-alpine

WORKDIR /app

# התקנה גלובלית של MCP Server
RUN npm install -g dataforseo-mcp-server

# העתק את קובץ הקונפיג
COPY config.json .

# פתיחת פורט מותאם
EXPOSE 37812

# הפעלת MCP עם הקונפיג
CMD ["dataforseo-mcp-server", "sse", "--config", "config.json"]

module.exports = {
  apps: [{
    name: 'payflow-mcp-server',
    script: 'tsx',
    args: 'src/index.ts',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    }
  }]
}
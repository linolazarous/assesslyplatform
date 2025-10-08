services:
  - type: web
    name: assessly-platform
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm run serve
    envVars:
      - key: NODE_ENV
        value: production
      - key: REACT_APP_API_URL
        value: https://assessly.onrender.com/api
    staticPublishPath: ./dist

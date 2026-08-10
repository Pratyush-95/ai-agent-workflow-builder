# 🤖 AI Agent Workflow Builder

An AI-powered workflow builder that allows users to create, configure, and execute AI agent workflows.

The application provides a simple interface where users can provide input, run an AI workflow, and view the execution status and generated AI response in real time.

## 🚀 Live Demo

[Live Demo](YOUR_VERCEL_URL)

## 📌 Features

- 🤖 AI Agent workflow execution
- 🧠 Gemini AI integration
- ⚡ Real-time workflow execution status
- 📊 Workflow execution details
- 🔄 Step-by-step workflow tracking
- 🗄️ PostgreSQL database integration
- 🔐 Environment variable based configuration
- 🌐 Fully deployed frontend and backend
- 📱 Responsive user interface
- 🔗 REST API based frontend-backend communication

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- TypeScript

### AI
- Google Gemini API

### Database
- Nhost
- PostgreSQL

### Deployment
- Vercel – Frontend
- Render – Backend

## 🏗️ Project Structure

```text
ai-agent-workflow-builder/
│
├── backend/
│   ├── src/
│   │   ├── lib/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NodePanel.jsx
│   │   │   ├── WorkflowBuilder.jsx
│   │   │   └── WorkflowNode.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md

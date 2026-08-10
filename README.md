# 🤖 AI Agent Workflow Builder

An AI-powered workflow builder that allows users to create, configure, and execute AI agent workflows.

The application provides a simple interface where users can provide input, run an AI workflow, and view the workflow execution status along with the generated AI response.

## 🚀 Live Demo

🌐 **Live Application:**  
https://ai-agent-workflow-builder-wheat.vercel.app

💻 **GitHub Repository:**  
https://github.com/Pratyush-95/ai-agent-workflow-builder

---

## 📸 Project Preview

### AI Agent Workflow Builder

The application provides a clean interface for entering user input and executing an AI-powered workflow.

### Workflow Execution

Users can view:

- Workflow Run ID
- Execution status
- Start and completion time
- Step execution status
- AI-generated response

---

## 📌 Features

- 🤖 AI Agent workflow execution
- 🧠 Google Gemini AI integration
- ⚡ Real-time workflow execution status
- 📊 Workflow execution details
- 🔄 Step-by-step workflow tracking
- 🗄️ PostgreSQL database integration
- 🔐 Environment variable based configuration
- 🌐 Deployed frontend and backend
- 📱 Responsive user interface
- 🔗 REST API based frontend-backend communication
- 🆔 Unique workflow run tracking

---

## 🧠 Key Concepts

This project demonstrates practical implementation of:

- AI Agent integration
- Workflow-based AI execution
- REST API communication
- Frontend and backend separation
- Asynchronous API operations
- Database-backed workflow execution
- Environment-based configuration
- Production deployment
- AI response handling

---

## 🔄 How It Works
The application follows this flow:

User Input
    ↓
React Frontend
    ↓
REST API
    ↓
Node.js + Express Backend
    ↓
Workflow Execution
    ↓
AI Agent
    ↓
Google Gemini API
    ↓
AI Generated Response
    ↓
Database
    ↓
Execution Result
    ↓
React Frontend


🛠️ Tech Stack
Frontend
React.js
Vite
JavaScript
CSS

Backend
Node.js
Express.js
TypeScript

AI
Google Gemini API

Database
Nhost
PostgreSQL

Deployment
Vercel – Frontend
Render – Backend


🏗️ Project Structure
ai-agent-workflow-builder/
│
├── backend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── nhost.ts
│   │   └── server.ts
│   ├── .env
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── NodePanel.jsx
│   │   │   ├── WorkflowBuilder.jsx
│   │   │   └── WorkflowNode.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
└── README.md

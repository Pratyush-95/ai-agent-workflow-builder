import React, { useState } from "react";
import WorkflowNode from "./WorkflowNode";
import NodePanel from "./NodePanel";

function WorkflowBuilder({
  onSaveWorkflow,
  saveLoading = false,
}) {
  // ==========================================
  // WORKFLOW INFORMATION
  // ==========================================

  const [workflowName, setWorkflowName] =
    useState("My AI Workflow");

  const [workflowDescription, setWorkflowDescription] =
    useState("My first AI agent workflow");

  // ==========================================
  // WORKFLOW NODES
  // ==========================================

  const [nodes, setNodes] = useState([
    {
      id: "trigger-1",
      type: "trigger",
      name: "Trigger",
      deletable: false,

      config: {
        event: "workflow_start",
      },
    },

    {
      id: "ai-agent-1",
      type: "ai_agent",
      name: "AI Agent",
      deletable: true,

      config: {
        model: "gemini-2.5-flash",

        systemPrompt:
          "You are a helpful AI assistant. Process the incoming request and provide a useful response.",

        userInput: "{{trigger.message}}",

        temperature: 0.7,
      },
    },
  ]);

  // ==========================================
  // SELECTED NODE
  // ==========================================

  const [selectedNodeId, setSelectedNodeId] =
    useState(null);

  // ==========================================
  // ADD NODE
  // ==========================================

  const handleAddNode = (type) => {
    const nodeNames = {
      trigger: "Trigger",
      ai_agent: "AI Agent",
      condition: "Condition",
      approval: "Manager Approval",
    };

    const defaultConfigs = {
      trigger: {
        event: "workflow_start",
      },

      ai_agent: {
        model: "gemini-2.5-flash",

        systemPrompt:
          "You are a helpful AI assistant. Process the incoming request and provide a useful response.",

        userInput: "{{trigger.message}}",

        temperature: 0.7,
      },

      condition: {
        field: "{{ai_agent.output}}",
        operator: "contains",
        value: "approve",
      },

      approval: {
        approver: "Manager",

        message:
          "Please approve this workflow before continuing.",
      },
    };

    const newNode = {
      id: `${type}-${Date.now()}`,

      type,

      name: nodeNames[type] || type,

      deletable: type !== "trigger",

      config: defaultConfigs[type] || {},
    };

    setNodes((previousNodes) => [
      ...previousNodes,
      newNode,
    ]);

    // Automatically select new node
    setSelectedNodeId(newNode.id);
  };

  // ==========================================
  // DELETE NODE
  // ==========================================

  const handleDeleteNode = (nodeId) => {
    setNodes((previousNodes) =>
      previousNodes.filter(
        (node) => node.id !== nodeId
      )
    );

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // ==========================================
  // SELECT NODE
  // ==========================================

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
  };

  // ==========================================
  // UPDATE NODE
  // ==========================================

  const handleUpdateNode = (
    nodeId,
    updates
  ) => {
    setNodes((previousNodes) =>
      previousNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              ...updates,
            }
          : node
      )
    );
  };

  // ==========================================
  // UPDATE NODE CONFIG
  // ==========================================

  const handleUpdateNodeConfig = (
    nodeId,
    configUpdates
  ) => {
    setNodes((previousNodes) =>
      previousNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,

              config: {
                ...(node.config || {}),
                ...configUpdates,
              },
            }
          : node
      )
    );
  };

  // ==========================================
  // SAVE WORKFLOW
  // ==========================================

  const handleSaveWorkflow = () => {
    const workflowData = {
      name: workflowName.trim(),

      description:
        workflowDescription.trim(),

      steps: nodes.map(
        (node, index) => ({
          position: index + 1,

          type: node.type,

          name: node.name,

          config: node.config || {},
        })
      ),
    };

    console.log(
      "Workflow Data:",
      workflowData
    );

    // ----------------------------------------
    // SEND DATA TO APP.JSX
    // ----------------------------------------

    if (typeof onSaveWorkflow === "function") {
      onSaveWorkflow(workflowData);
    } else {
      console.error(
        "onSaveWorkflow prop is missing."
      );

      alert(
        "Save function connected nahi hai."
      );
    }
  };

  // ==========================================
  // CLEAR WORKFLOW
  // ==========================================

  const handleClearWorkflow = () => {
    const triggerNode = {
      id: "trigger-1",

      type: "trigger",

      name: "Trigger",

      deletable: false,

      config: {
        event: "workflow_start",
      },
    };

    setNodes([triggerNode]);

    setSelectedNodeId(null);
  };

  // ==========================================
  // SELECTED NODE
  // ==========================================

  const selectedNode =
    nodes.find(
      (node) =>
        node.id === selectedNodeId
    ) || null;

  // ==========================================
  // WORKFLOW PREVIEW
  // ==========================================

  const workflowPreview = {
    name: workflowName,

    description:
      workflowDescription,

    steps: nodes.map(
      (node, index) => ({
        position: index + 1,

        type: node.type,

        name: node.name,

        config: node.config || {},
      })
    ),
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section className="workflow-builder-section">

      {/* ========================================
          HEADER
      ======================================== */}

      <div className="builder-header">

        <div>
          <h1>
            Workflow Builder
          </h1>

          <p>
            Build your AI agent workflow
            by adding steps.
          </p>
        </div>

        <div className="builder-actions">

          {/* CLEAR */}

          <button
            className="clear-button"
            onClick={
              handleClearWorkflow
            }
            disabled={saveLoading}
            type="button"
          >
            Clear
          </button>

          {/* SAVE */}

          <button
            className="save-button"
            onClick={
              handleSaveWorkflow
            }
            disabled={saveLoading}
            type="button"
          >
            {saveLoading
              ? "Saving..."
              : "💾 Save Workflow"}
          </button>

        </div>
      </div>

      {/* ========================================
          WORKFLOW INFORMATION
      ======================================== */}

      <div className="workflow-info">

        {/* WORKFLOW NAME */}

        <div className="input-group">

          <label>
            Workflow Name
          </label>

          <input
            type="text"
            value={workflowName}
            onChange={(e) =>
              setWorkflowName(
                e.target.value
              )
            }
            placeholder="Enter workflow name"
            disabled={saveLoading}
          />

        </div>

        {/* DESCRIPTION */}

        <div className="input-group">

          <label>
            Description
          </label>

          <input
            type="text"
            value={
              workflowDescription
            }
            onChange={(e) =>
              setWorkflowDescription(
                e.target.value
              )
            }
            placeholder="Enter workflow description"
            disabled={saveLoading}
          />

        </div>

      </div>

      {/* ========================================
          MAIN BUILDER
      ======================================== */}

      <div className="builder-layout">

        {/* ======================================
            LEFT PANEL
        ====================================== */}

        <NodePanel
          onAddNode={
            handleAddNode
          }

          selectedNode={
            selectedNode
          }

          onUpdateNode={
            handleUpdateNode
          }

          onUpdateNodeConfig={
            handleUpdateNodeConfig
          }
        />

        {/* ======================================
            WORKFLOW CANVAS
        ====================================== */}

        <div className="workflow-canvas">

          {/* CANVAS HEADER */}

          <div className="canvas-header">

            <div>

              <h2>
                Workflow Canvas
              </h2>

              <span>
                {nodes.length} step
                {nodes.length !== 1
                  ? "s"
                  : ""}
              </span>

            </div>

          </div>

          {/* CANVAS */}

          <div className="workflow-flow">

            {nodes.length === 0 ? (

              <div className="empty-workflow">

                <div className="empty-icon">
                  🧩
                </div>

                <h3>
                  Your workflow is empty
                </h3>

                <p>
                  Add nodes from the
                  left panel to build
                  your workflow.
                </p>

              </div>

            ) : (

              nodes.map((node) => (

                <WorkflowNode
                  key={node.id}

                  node={node}

                  selected={
                    selectedNodeId ===
                    node.id
                  }

                  onSelect={
                    handleSelectNode
                  }

                  onDelete={
                    handleDeleteNode
                  }
                />

              ))

            )}

          </div>

        </div>

      </div>

      {/* ========================================
          WORKFLOW PREVIEW
      ======================================== */}

      <div className="workflow-preview">

        <div className="preview-header">

          <div>

            <h2>
              Workflow Preview
            </h2>

            <p>
              Data that will be
              sent to the backend.
            </p>

          </div>

        </div>

        <pre>
          {JSON.stringify(
            workflowPreview,
            null,
            2
          )}
        </pre>

      </div>

    </section>
  );
}

export default WorkflowBuilder;
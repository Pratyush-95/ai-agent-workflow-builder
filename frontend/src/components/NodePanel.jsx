import React from "react";

function NodePanel({
  onAddNode,
  selectedNode,
  onUpdateNode,
  onUpdateNodeConfig,
}) {
  const nodes = [
    {
      type: "trigger",
      name: "Trigger",
      icon: "⚡",
      description: "Start the workflow",
    },

    {
      type: "ai_agent",
      name: "AI Agent",
      icon: "🤖",
      description: "Process request using AI",
    },

    {
      type: "condition",
      name: "Condition",
      icon: "🔀",
      description: "Check a condition",
    },

    {
      type: "approval",
      name: "Approval Gate",
      icon: "🔐",
      description: "Wait for approval",
    },
  ];

  return (
    <aside className="node-panel">
      {/* -------------------------------- */}
      {/* ADD NODES */}
      {/* -------------------------------- */}

      <div className="node-panel-section">
        <h2>Workflow Nodes</h2>

        <p className="panel-description">
          Add a step to your workflow
        </p>

        <div className="node-options">
          {nodes.map((node) => (
            <button
              key={node.type}
              className="node-option"
              onClick={() => onAddNode(node.type)}
              type="button"
            >
              <div className="option-icon">
                {node.icon}
              </div>

              <div className="option-content">
                <strong>{node.name}</strong>

                <span>{node.description}</span>
              </div>

              <div className="add-icon">
                +
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------- */}
      {/* CONFIGURATION */}
      {/* -------------------------------- */}

      {selectedNode && (
        <div className="node-config-panel">
          <div className="config-panel-header">
            <div>
              <h2>Configure Node</h2>

              <p>
                Edit the selected workflow step.
              </p>
            </div>

            <span className="config-node-type">
              {selectedNode.type}
            </span>
          </div>

          {/* NODE NAME */}

          <div className="config-field">
            <label>Node Name</label>

            <input
              type="text"
              value={selectedNode.name}
              onChange={(e) =>
                onUpdateNode(selectedNode.id, {
                  name: e.target.value,
                })
              }
            />
          </div>

          {/* -------------------------------- */}
          {/* TRIGGER CONFIG */}
          {/* -------------------------------- */}

          {selectedNode.type === "trigger" && (
            <div className="config-content">
              <div className="config-field">
                <label>Trigger Event</label>

                <select
                  value={
                    selectedNode.config?.event ||
                    "workflow_start"
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        event: e.target.value,
                      }
                    )
                  }
                >
                  <option value="workflow_start">
                    Workflow Start
                  </option>

                  <option value="manual">
                    Manual Trigger
                  </option>

                  <option value="webhook">
                    Webhook
                  </option>
                </select>
              </div>
            </div>
          )}

          {/* -------------------------------- */}
          {/* AI AGENT CONFIG */}
          {/* -------------------------------- */}

          {selectedNode.type === "ai_agent" && (
            <div className="config-content">
              <div className="config-field">
                <label>AI Model</label>

                <select
                  value={
                    selectedNode.config?.model ||
                    "gpt-4o-mini"
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        model: e.target.value,
                      }
                    )
                  }
                >
                  <option value="gpt-4o-mini">
                    GPT-4o Mini
                  </option>

                  <option value="gpt-4o">
                    GPT-4o
                  </option>

                  <option value="gpt-4.1">
                    GPT-4.1
                  </option>
                </select>
              </div>

              <div className="config-field">
                <label>System Prompt</label>

                <textarea
                  rows="5"
                  value={
                    selectedNode.config
                      ?.systemPrompt || ""
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        systemPrompt:
                          e.target.value,
                      }
                    )
                  }
                  placeholder="Enter system prompt..."
                />
              </div>

              <div className="config-field">
                <label>User Input</label>

                <textarea
                  rows="3"
                  value={
                    selectedNode.config
                      ?.userInput || ""
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        userInput:
                          e.target.value,
                      }
                    )
                  }
                  placeholder="{{trigger.message}}"
                />
              </div>

              <div className="config-field">
                <label>
                  Temperature
                  <span className="range-value">
                    {
                      selectedNode.config
                        ?.temperature ?? 0.7
                    }
                  </span>
                </label>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={
                    selectedNode.config
                      ?.temperature ?? 0.7
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        temperature:
                          Number(e.target.value),
                      }
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* -------------------------------- */}
          {/* CONDITION CONFIG */}
          {/* -------------------------------- */}

          {selectedNode.type === "condition" && (
            <div className="config-content">
              <div className="config-field">
                <label>Field</label>

                <input
                  type="text"
                  value={
                    selectedNode.config?.field ||
                    ""
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        field: e.target.value,
                      }
                    )
                  }
                  placeholder="{{ai_agent.output}}"
                />
              </div>

              <div className="config-field">
                <label>Operator</label>

                <select
                  value={
                    selectedNode.config
                      ?.operator || "contains"
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        operator:
                          e.target.value,
                      }
                    )
                  }
                >
                  <option value="contains">
                    Contains
                  </option>

                  <option value="equals">
                    Equals
                  </option>

                  <option value="not_equals">
                    Not Equals
                  </option>

                  <option value="starts_with">
                    Starts With
                  </option>

                  <option value="ends_with">
                    Ends With
                  </option>
                </select>
              </div>

              <div className="config-field">
                <label>Value</label>

                <input
                  type="text"
                  value={
                    selectedNode.config?.value ||
                    ""
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        value: e.target.value,
                      }
                    )
                  }
                  placeholder="approve"
                />
              </div>
            </div>
          )}

          {/* -------------------------------- */}
          {/* APPROVAL CONFIG */}
          {/* -------------------------------- */}

          {selectedNode.type === "approval" && (
            <div className="config-content">
              <div className="config-field">
                <label>Approver</label>

                <select
                  value={
                    selectedNode.config
                      ?.approver || "Manager"
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        approver:
                          e.target.value,
                      }
                    )
                  }
                >
                  <option value="Manager">
                    Manager
                  </option>

                  <option value="Admin">
                    Admin
                  </option>

                  <option value="Owner">
                    Workflow Owner
                  </option>
                </select>
              </div>

              <div className="config-field">
                <label>Approval Message</label>

                <textarea
                  rows="4"
                  value={
                    selectedNode.config
                      ?.message || ""
                  }
                  onChange={(e) =>
                    onUpdateNodeConfig(
                      selectedNode.id,
                      {
                        message:
                          e.target.value,
                      }
                    )
                  }
                  placeholder="Please approve this workflow..."
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------- */}
      {/* NOTHING SELECTED */}
      {/* -------------------------------- */}

      {!selectedNode && (
        <div className="node-panel-hint">
          <div>👆</div>

          <strong>Select a node</strong>

          <span>
            Click any node on the canvas to configure
            it.
          </span>
        </div>
      )}
    </aside>
  );
}

export default NodePanel;
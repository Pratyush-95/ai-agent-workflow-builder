import React from "react";

function WorkflowNode({
  node,
  selected,
  onSelect,
  onDelete,
}) {
  // ------------------------------------------
  // ICON
  // ------------------------------------------

  const getNodeIcon = () => {
    switch (node.type) {
      case "trigger":
        return "⚡";

      case "ai_agent":
        return "🤖";

      case "condition":
        return "🔀";

      case "approval":
        return "🔐";

      default:
        return "⚙️";
    }
  };

  // ------------------------------------------
  // COLOR CLASS
  // ------------------------------------------

  const getNodeColor = () => {
    switch (node.type) {
      case "trigger":
        return "trigger";

      case "ai_agent":
        return "ai-agent";

      case "condition":
        return "condition";

      case "approval":
        return "approval";

      default:
        return "default";
    }
  };

  // ------------------------------------------
  // NODE CLICK
  // ------------------------------------------

  const handleNodeClick = () => {
    onSelect(node.id);
  };

  // ------------------------------------------
  // DELETE
  // ------------------------------------------

  const handleDelete = (event) => {
    event.stopPropagation();

    onDelete(node.id);
  };

  return (
    <div
      className={`workflow-node-wrapper ${
        selected ? "selected-node" : ""
      }`}
    >
      <div
        className={`workflow-node ${getNodeColor()}`}
        onClick={handleNodeClick}
      >
        {/* NODE HEADER */}

        <div className="node-header">
          <div className="node-icon">
            {getNodeIcon()}
          </div>

          <div className="node-title">
            <h3>{node.name}</h3>

            <span>
              {node.type === "ai_agent"
                ? "AI AGENT"
                : node.type.toUpperCase()}
            </span>
          </div>

          {/* DELETE */}

          {node.deletable !== false && (
            <button
              className="delete-node"
              onClick={handleDelete}
              title="Delete node"
              type="button"
            >
              ×
            </button>
          )}
        </div>

        {/* NODE BODY */}

        <div className="node-body">
          {node.type === "trigger" && (
            <p>
              Workflow starts from this trigger.
            </p>
          )}

          {node.type === "ai_agent" && (
            <p>
              AI Agent processes the incoming request.
            </p>
          )}

          {node.type === "condition" && (
            <p>
              Check the AI response and choose a branch.
            </p>
          )}

          {node.type === "approval" && (
            <p>
              Manager approval is required before
              continuing.
            </p>
          )}
        </div>

        {/* CONFIG SUMMARY */}

        {node.type === "ai_agent" && node.config && (
          <div className="node-config-summary">
            <span>Model</span>

            <strong>
              {node.config.model}
            </strong>
          </div>
        )}

        {node.type === "condition" && node.config && (
          <div className="node-config-summary">
            <span>Condition</span>

            <strong>
              {node.config.operator} "{node.config.value}"
            </strong>
          </div>
        )}

        {node.type === "approval" && node.config && (
          <div className="node-config-summary">
            <span>Approver</span>

            <strong>
              {node.config.approver}
            </strong>
          </div>
        )}
      </div>

      {/* CONNECTOR */}

      {node.type !== "approval" && (
        <div className="node-connector">
          <span>↓</span>
        </div>
      )}
    </div>
  );
}

export default WorkflowNode;
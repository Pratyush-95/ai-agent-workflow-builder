import { useEffect, useState } from "react";
import "./App.css";

import WorkflowBuilder from "./components/WorkflowBuilder";


const API = "http://localhost:5000";

// Old workflow ID - testing/fallback ke liye
const DEFAULT_WORKFLOW_ID =
  "6cb9f1b6-904a-4744-a4bc-8fafe955edd7";

// Testing ke liye current Nhost user ID
const USER_ID =
  "eeb721d7-a636-41fd-8c87-fadc4282c973";

// IMPORTANT:
// Yahan apna actual Nhost organization ID daalna hai.
const ORG_ID = "370957e4-def1-4f3d-adf4-3cae9334bc07";

function App() {
  // ==========================================
  // WORKFLOW STATE
  // ==========================================

  const [workflow, setWorkflow] = useState(null);

  const [workflowId, setWorkflowId] = useState(
    DEFAULT_WORKFLOW_ID
  );

  // ==========================================
  // INPUT STATE
  // ==========================================

  const [input, setInput] = useState({
    user: "Pratyush",
    message: "Hello AI Agent",
  });

  // ==========================================
  // LOADING STATES
  // ==========================================

  const [loading, setLoading] = useState(false);

  const [saveLoading, setSaveLoading] =
    useState(false);

  const [approvingStep, setApprovingStep] =
    useState(null);

  // ==========================================
  // RESULT / ERROR
  // ==========================================

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  // ==========================================
  // FETCH CURRENT WORKFLOW
  // ==========================================

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    const fetchWorkflow = async () => {
      try {
        const response = await fetch(
          `${API}/api/workflows/${workflowId}`
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch workflow"
          );
        }

        const data = await response.json();

        setWorkflow(data);
      } catch (err) {
        console.error(
          "Workflow fetch error:",
          err
        );

        setError(
          "Backend se workflow fetch nahi ho paya."
        );
      }
    };

    fetchWorkflow();
  }, [workflowId]);

  // ==========================================
  // SAVE WORKFLOW
  // ==========================================

  const saveWorkflow = async (workflowData) => {
    setSaveLoading(true);
    setError("");

    try {
      // ----------------------------------------
      // ORG ID CHECK
      // ----------------------------------------

      if (
        !ORG_ID ||
        ORG_ID === "YOUR_ORG_ID"
      ) {
        throw new Error(
          "Pehle App.jsx me actual ORG_ID add karo."
        );
      }

      // ----------------------------------------
      // FRONTEND → BACKEND STEP MAPPING
      // ----------------------------------------

      const backendSteps =
        workflowData.steps.map((step) => {
          let backendType = step.type;

          let config = step.config || {};

          // AI Agent → LLM Call
          if (step.type === "ai_agent") {
            backendType = "lm_call";

            config = {
              ...config,

              prompt:
                config.systemPrompt ||
                "You are a helpful AI assistant.",

              userInput:
                config.userInput ||
                "{{trigger.message}}",

              model:
                config.model ||
                "gpt-4o-mini",

              temperature:
                config.temperature ?? 0.7,
            };
          }

          // Condition → Conditional Branch
          if (step.type === "condition") {
            backendType =
              "conditional_branch";

            config = {
              ...config,

              field:
                config.field ||
                "{{ai_agent.output}}",

              operator:
                config.operator ||
                "contains",

              value:
                config.value || "approve",

              true_next_position:
                step.position + 1,

              false_next_position: null,
            };
          }

          // Approval → Approval Gate
          if (step.type === "approval") {
            backendType =
              "approval_gate";

            config = {
              ...config,

              message:
                config.message ||
                "Manager approval is required before continuing.",

              approver:
                config.approver ||
                "Manager",
            };
          }

          // Trigger remains trigger
          if (step.type === "trigger") {
            backendType = "trigger";

            config = {
              ...config,
            };
          }

          return {
            position: step.position,
            type: backendType,
            name: step.name,
            config,
          };
        });

      // ----------------------------------------
      // API REQUEST
      // ----------------------------------------

      const response = await fetch(
        `${API}/api/workflows`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            orgId: ORG_ID,

            name:
              workflowData.name ||
              "My AI Workflow",

            description:
              workflowData.description || "",

            steps: backendSteps,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "Save workflow response:",
        data
      );

      // ----------------------------------------
      // ERROR
      // ----------------------------------------

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Workflow save failed"
        );
      }

      // ----------------------------------------
      // SAVE NEW WORKFLOW ID
      // ----------------------------------------

      if (data.workflow?.id) {
        setWorkflowId(data.workflow.id);
      }

      // ----------------------------------------
      // SAVE WORKFLOW OBJECT
      // ----------------------------------------

      if (data.workflow) {
        setWorkflow(data.workflow);
      }

      // ----------------------------------------
      // RESET RESULT
      // ----------------------------------------

      setResult(null);

      alert(
        "Workflow saved successfully 🚀"
      );
    } catch (err) {
      console.error(
        "Save workflow error:",
        err
      );

      setError(
        err.message ||
          "Workflow save nahi ho paya."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // ==========================================
  // RUN WORKFLOW
  // ==========================================

  const runWorkflow = async () => {
    if (!workflowId) {
      setError(
        "Workflow ID nahi mila. Pehle workflow save karo."
      );

      return;
    }

    setLoading(true);

    setError("");

    setResult(null);

    try {
      const response = await fetch(
        `${API}/api/workflows/${workflowId}/run`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(input),
        }
      );

      const data = await response.json();

      console.log(
        "Workflow response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Workflow execution failed"
        );
      }

      setResult(data);
    } catch (err) {
      console.error(
        "Workflow run error:",
        err
      );

      setError(
        err.message ||
          "Workflow run failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // APPROVE WORKFLOW STEP
  // ==========================================

  const approveStep = async (
    stepRunId
  ) => {
    if (!stepRunId) {
      setError(
        "Step Run ID nahi mila."
      );

      return;
    }

    setApprovingStep(stepRunId);

    setError("");

    try {
      console.log(
        "Approving step:",
        {
          stepRunId,
          userId: USER_ID,
        }
      );

      const response = await fetch(
        `${API}/api/workflows/approve-step`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            stepRunId,
            userId: USER_ID,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "Approval response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Approval failed"
        );
      }

      // Backend approval ke baad
      // completed workflow result
      setResult(data);
    } catch (err) {
      console.error(
        "Approval error:",
        err
      );

      setError(
        err.message ||
          "Workflow approve nahi ho paya."
      );
    } finally {
      setApprovingStep(null);
    }
  };

  // ==========================================
  // CHECK APPROVAL STEP
  // ==========================================

  const isApprovalStep = (item) => {
    if (!item) {
      return false;
    }

    const stepType = item.step?.type;

    const stepName = item.step?.name;

    return (
      stepType === "approval_gate" ||
      stepName === "Manager Approval"
    );
  };

  // ==========================================
  // CHECK APPROVAL REQUIRED
  // ==========================================

  const needsApproval = (item) => {
    if (!item?.run) {
      return false;
    }

    if (!isApprovalStep(item)) {
      return false;
    }

    const status = item.run.status;

    const outputType =
      item.run.output?.type;

    return (
      status === "paused" ||
      outputType ===
        "approval_required" ||
      outputType ===
        "approval_pending"
    );
  };

  // ==========================================
  // STATUS CLASS
  // ==========================================

  const getStatusClass = (
    status
  ) => {
    if (!status) {
      return "status-neutral";
    }

    if (status === "completed") {
      return "status-success";
    }

    if (status === "paused") {
      return "status-paused";
    }

    if (
      status === "failed" ||
      status === "error"
    ) {
      return "status-error";
    }

    if (status === "running") {
      return "status-running";
    }

    return "status-neutral";
  };

  // ==========================================
  // STEP ICON
  // ==========================================

  const getStepIcon = (step) => {
    if (
      step?.type ===
      "approval_gate"
    ) {
      return "🔐";
    }

    if (
      step?.type ===
      "http_request"
    ) {
      return "🌐";
    }

    if (
      step?.type ===
      "conditional_branch"
    ) {
      return "🔀";
    }

    if (step?.type === "db_write") {
      return "🗄️";
    }

    if (step?.type === "notify") {
      return "🔔";
    }

    return "🤖";
  };

  // ==========================================
  // REFRESH WORKFLOW
  // ==========================================

  const refreshWorkflow =
    async () => {
      if (!workflowId) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API}/api/workflows/${workflowId}`
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setWorkflow(data);
      } catch (err) {
        console.error(
          "Workflow refresh error:",
          err
        );
      }
    };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="app">

      {/* ========================================
          HEADER
      ======================================== */}

      <header className="header">

        <div>
          <h1>
            AI Agent Workflow Builder
          </h1>

          <p>
            Create, configure and run AI workflows
          </p>
        </div>

        <div className="header-actions">

          <span className="status">
            <span className="status-dot"></span>
            Backend Connected
          </span>

          <button
            className="run-btn"
            onClick={runWorkflow}
            disabled={
              loading ||
              !workflowId
            }
          >
            {loading
              ? "Running..."
              : "▶ Run Workflow"}
          </button>

        </div>

      </header>

      {/* ========================================
          ERROR
      ======================================== */}

      {error && (
        <div className="error-box">

          <span>⚠️</span>

          <span>
            {error}
          </span>

          <button
            className="error-close"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>

        </div>
      )}

      {/* ========================================
          WORKFLOW BUILDER
      ======================================== */}

      <WorkflowBuilder
        onSaveWorkflow={
          saveWorkflow
        }
        saveLoading={
          saveLoading
        }
      />

      {/* ========================================
          WORKFLOW INFORMATION
      ======================================== */}

      <section className="workflow-status-section">

        <div className="workflow-status-card">

          <div className="workflow-status-header">

            <div>

              <h2>
                Current Workflow
              </h2>

              <p>
                Workflow configuration connected
                to the execution engine.
              </p>

            </div>

            <button
              className="refresh-btn"
              onClick={
                refreshWorkflow
              }
            >
              ↻ Refresh
            </button>

          </div>

          {workflow ? (

            <div className="workflow-meta">

              <div className="meta-item">

                <span>
                  Name
                </span>

                <strong>
                  {workflow.name}
                </strong>

              </div>

              <div className="meta-item">

                <span>
                  Description
                </span>

                <strong>
                  {workflow.description ||
                    "No description"}
                </strong>

              </div>

              <div className="meta-item">

                <span>
                  Status
                </span>

                <strong className="draft-badge">
                  {workflow.status}
                </strong>

              </div>

              <div className="meta-item">

                <span>
                  Workflow ID
                </span>

                <code>
                  {workflowId}
                </code>

              </div>

            </div>

          ) : (

            <p className="loading-text">
              Loading workflow...
            </p>

          )}

        </div>

      </section>

      {/* ========================================
          EXECUTION SECTION
      ======================================== */}

      <section className="execution-section">

        {/* ======================================
            INPUT
        ====================================== */}

        <div className="execution-input">

          <div className="section-title">

            <div>

              <h2>
                Workflow Input
              </h2>

              <p>
                Provide input to start the workflow.
              </p>

            </div>

          </div>

          <label>
            User
          </label>

          <input
            type="text"
            value={input.user}
            onChange={(e) =>
              setInput({
                ...input,
                user: e.target.value,
              })
            }
            placeholder="Enter user"
          />

          <label>
            Message
          </label>

          <textarea
            rows="5"
            value={input.message}
            onChange={(e) =>
              setInput({
                ...input,
                message: e.target.value,
              })
            }
            placeholder="Enter your message"
          />

          <button
            className="run-large"
            onClick={
              runWorkflow
            }
            disabled={
              loading ||
              !workflowId
            }
          >
            {loading
              ? "Executing Workflow..."
              : "▶ Run Workflow"}
          </button>

        </div>

        {/* ======================================
            EXECUTION RESULT
        ====================================== */}

        <div className="execution-result">

          <div className="result-header">

            <div>

              <h2>
                Execution Result
              </h2>

              <p>
                Live result of the latest execution
              </p>

            </div>

            {result && (
              <span
                className={`execution-status ${getStatusClass(
                  result.run?.status
                )}`}
              >
                {result.run?.status ===
                "completed"
                  ? "✓ Completed"
                  : result.run?.status ===
                    "paused"
                  ? "⏸ Paused"
                  : result.run?.status ||
                    "Unknown"}
              </span>
            )}

          </div>

          {/* ====================================
              NO RESULT
          ==================================== */}

          {!result ? (

            <div className="no-result">

              <div>
                🚀
              </div>

              <h3>
                No execution yet
              </h3>

              <p>
                Run the workflow to see
                step-by-step execution results.
              </p>

            </div>

          ) : (

            <div className="result-content">

              {/* ==================================
                  RUN INFORMATION
              ================================== */}

              <div className="result-grid">

                <div className="result-card">

                  <span>
                    Workflow Run ID
                  </span>

                  <code>
                    {result.run?.id ||
                      "N/A"}
                  </code>

                </div>

                <div className="result-card">

                  <span>
                    Status
                  </span>

                  <strong
                    className={getStatusClass(
                      result.run?.status
                    )}
                  >
                    {result.run?.status ||
                      "N/A"}
                  </strong>

                </div>

                <div className="result-card">

                  <span>
                    Started At
                  </span>

                  <strong>
                    {result.run
                      ?.started_at
                      ? new Date(
                          result.run.started_at
                        ).toLocaleString()
                      : "N/A"}
                  </strong>

                </div>

                <div className="result-card">

                  <span>
                    Completed At
                  </span>

                  <strong>
                    {result.run
                      ?.completed_at
                      ? new Date(
                          result.run.completed_at
                        ).toLocaleString()
                      : "Pending"}
                  </strong>

                </div>

              </div>

              {/* ==================================
                  ERROR
              ================================== */}

              {result.run?.error && (
                <div className="result-error">

                  <strong>
                    Workflow Error
                  </strong>

                  <p>
                    {result.run.error}
                  </p>

                </div>
              )}

              {/* ==================================
                  STEP EXECUTION
              ================================== */}

              <div className="steps-result-section">

                <div className="steps-result-title">

                  <div>

                    <h3>
                      Step Execution
                    </h3>

                    <p>
                      Live status of every workflow step
                    </p>

                  </div>

                  <span>
                    {result.steps?.length ||
                      0}{" "}
                    steps
                  </span>

                </div>

                {result.steps?.length ===
                0 ? (

                  <div className="empty-steps">
                    No step execution data found.
                  </div>

                ) : (

                  <div className="steps-list">

                    {result.steps.map(
                      (
                        item,
                        index
                      ) => {

                        const approvalRequired =
                          needsApproval(
                            item
                          );

                        const stepStatus =
                          item.run?.status;

                        return (
                          <div
                            className={`ai-result ${
                              approvalRequired
                                ? "approval-result"
                                : ""
                            }`}
                            key={
                              item.run?.id ||
                              `${item.step?.id}-${index}`
                            }
                          >

                            {/* STEP HEADER */}

                            <div className="ai-result-header">

                              <div className="step-result-title">

                                <span className="step-icon">
                                  {getStepIcon(
                                    item.step
                                  )}
                                </span>

                                <div>

                                  <strong>
                                    {item.step
                                      ?.name ||
                                      `Step ${
                                        index +
                                        1
                                      }`}
                                  </strong>

                                  <small>
                                    {item.step
                                      ?.type ||
                                      "unknown"}
                                  </small>

                                </div>

                              </div>

                              <span
                                className={`step-status ${getStatusClass(
                                  stepStatus
                                )}`}
                              >
                                {stepStatus ||
                                  "unknown"}
                              </span>

                            </div>

                            {/* STEP MESSAGE */}

                            <p className="step-message">

                              {item.run?.output
                                ?.message ||
                                item.run?.output
                                  ?.statusText ||
                                item.run?.error ||
                                "No output"}

                            </p>

                            {/* =================================
                                APPROVAL AREA
                            ================================= */}

                            {approvalRequired && (

                              <div className="approval-box">

                                <div className="approval-icon">
                                  🔐
                                </div>

                                <div className="approval-content">

                                  <h3>
                                    Manager Approval Required
                                  </h3>

                                  <p>
                                    This workflow is paused
                                    and requires an authorized
                                    user to approve it.
                                  </p>

                                  <div className="approval-info">

                                    <span>
                                      Step Run ID
                                    </span>

                                    <code>
                                      {item.run?.id}
                                    </code>

                                  </div>

                                  <button
                                    className="approve-btn"
                                    onClick={() =>
                                      approveStep(
                                        item.run?.id
                                      )
                                    }
                                    disabled={
                                      approvingStep ===
                                      item.run?.id
                                    }
                                  >
                                    {approvingStep ===
                                    item.run?.id
                                      ? "Approving..."
                                      : "✓ Approve & Continue"}
                                  </button>

                                </div>

                              </div>
                            )}

                            {/* =================================
                                APPROVED INFO
                            ================================= */}

                            {isApprovalStep(
                              item
                            ) &&
                              stepStatus ===
                                "completed" &&
                              item.run
                                ?.approved_by && (

                                <div className="approved-box">

                                  <span className="approved-icon">
                                    ✓
                                  </span>

                                  <div>

                                    <strong>
                                      Approval Granted
                                    </strong>

                                    <p>
                                      Approved by:{" "}
                                      {
                                        item.run
                                          .approved_by
                                      }
                                    </p>

                                    {item.run
                                      .approved_at && (
                                      <small>
                                        {new Date(
                                          item.run.approved_at
                                        ).toLocaleString()}
                                      </small>
                                    )}

                                  </div>

                                </div>
                              )}

                            {/* =================================
                                DETAILS
                            ================================= */}

                            <details>

                              <summary>
                                View execution details
                              </summary>

                              <div className="execution-details">

                                <div>

                                  <span>
                                    Step Run ID
                                  </span>

                                  <code>
                                    {item.run?.id ||
                                      "N/A"}
                                  </code>

                                </div>

                                <div>

                                  <span>
                                    Step ID
                                  </span>

                                  <code>
                                    {item.step?.id ||
                                      "N/A"}
                                  </code>

                                </div>

                                <div>

                                  <span>
                                    Attempt Count
                                  </span>

                                  <strong>
                                    {item.run
                                      ?.attempt_count ??
                                      0}
                                  </strong>

                                </div>

                                <div>

                                  <span>
                                    Started
                                  </span>

                                  <strong>
                                    {item.run
                                      ?.started_at
                                      ? new Date(
                                          item.run.started_at
                                        ).toLocaleString()
                                      : "N/A"}
                                  </strong>

                                </div>

                                <div>

                                  <span>
                                    Completed
                                  </span>

                                  <strong>
                                    {item.run
                                      ?.completed_at
                                      ? new Date(
                                          item.run.completed_at
                                        ).toLocaleString()
                                      : "Pending"}
                                  </strong>

                                </div>

                              </div>

                              <pre>
                                {JSON.stringify(
                                  item.run,
                                  null,
                                  2
                                )}
                              </pre>

                            </details>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </div>

              {/* ==================================
                  WORKFLOW COMPLETED
              ================================== */}

              {result.run?.status ===
                "completed" && (

                <div className="workflow-success">

                  <div className="success-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Workflow completed successfully
                    </strong>

                    <p>
                      All workflow steps have
                      been completed successfully.
                    </p>

                  </div>

                </div>
              )}

              {/* ==================================
                  WORKFLOW PAUSED
              ================================== */}

              {result.run?.status ===
                "paused" && (

                <div className="workflow-paused">

                  <div className="paused-icon">
                    ⏸
                  </div>

                  <div>

                    <strong>
                      Workflow is paused
                    </strong>

                    <p>
                      Waiting for an authorized
                      user to approve the workflow.
                    </p>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </section>

      {/* ========================================
          FOOTER
      ======================================== */}

      <footer className="footer"></footer>

    </div>
  );
}

export default App;